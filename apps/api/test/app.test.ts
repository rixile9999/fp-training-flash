import { describe, expect, it } from "vitest";
import { appError, err } from "@fp/kernel";
import type { AppErrorCode, Logger } from "@fp/kernel";
import { ApiError, createApiClient } from "@fp/api-contract";
import { createApp } from "../src/app.ts";
import type { AppOptions } from "../src/app.ts";
import {
  callsTo,
  EXERCISE_ID,
  fakeClock,
  makeFakes,
  OTHER_TOKEN,
  PREDICT_ID,
  TOKEN,
  USER,
} from "./fakes.ts";
import type { Fakes } from "./fakes.ts";

function setup(fakes: Fakes = makeFakes(), options: AppOptions = {}) {
  const app = createApp(fakes.services, { runner: "docker:test", llm: "none", ...options });
  const request = (path: string, init: RequestInit & { token?: string | null } = {}) => {
    const { token = TOKEN, ...rest } = init;
    const headers = new Headers(rest.headers);
    if (token !== null) headers.set("authorization", `Bearer ${token}`);
    if (rest.body !== undefined) headers.set("content-type", "application/json");
    return app.request(path, { ...rest, headers });
  };
  const post = (path: string, body: unknown, token: string | null = TOKEN) =>
    request(path, { method: "POST", body: JSON.stringify(body), token });
  const client = (token?: string) =>
    createApiClient({
      baseUrl: "http://localhost",
      ...(token === undefined ? {} : { token }),
      fetch: (async (input: string | URL | Request, init?: RequestInit) =>
        app.request(input instanceof Request ? input.url : String(input), init)) as typeof fetch,
    });
  return { app, fakes, request, post, client };
}

const enc = encodeURIComponent;

describe("public routes", () => {
  it("serves health without a token", async () => {
    const { request } = setup();
    const res = await request("/v1/health", { token: null });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", contentBundle: "b-1", runner: "docker:test", llm: "none" });
  });

  it("dev-login returns user and token without auth", async () => {
    const { client } = setup();
    const res = await client().devLogin({ displayName: "  민수  " });
    expect(res.user.displayName).toBe("민수");
    expect(res.token.token).toBe(TOKEN);
  });

  it("dev-login validates the body", async () => {
    const { post, request } = setup();
    const res = await post("/v1/auth/dev-login", { displayName: "" }, null);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string; details: { issues: { path: string }[] } } };
    expect(body.error.code).toBe("invalid_input");
    expect(body.error.details.issues[0]?.path).toBe("displayName");

    const bad = await request("/v1/auth/dev-login", { method: "POST", body: "{nope", token: null });
    expect(bad.status).toBe(400);
    expect(((await bad.json()) as { error: { message: string } }).error.message).toMatch(/JSON/);
  });
});

describe("authentication", () => {
  it("rejects missing and invalid tokens with 401 and the error body", async () => {
    const { request } = setup();
    const missing = await request("/v1/me", { token: null });
    expect(missing.status).toBe(401);
    expect(await missing.json()).toEqual({ error: { code: "unauthorized", message: expect.any(String) } });

    const invalid = await request("/v1/me", { token: "wrong" });
    expect(invalid.status).toBe(401);

    const malformed = await request("/v1/me", { token: null, headers: { authorization: `Basic ${TOKEN}` } });
    expect(malformed.status).toBe(401);
  });

  it("accepts a valid bearer token", async () => {
    const { client } = setup();
    expect(await client(TOKEN).me()).toEqual(USER);
  });

  it("protects every non-public route", async () => {
    const { request, fakes } = setup();
    for (const path of ["/v1/skills", `/v1/exercises/${enc(EXERCISE_ID)}`, "/v1/progress?language=gleam"]) {
      expect((await request(path, { token: null })).status).toBe(401);
    }
    expect(callsTo(fakes, "catalog.listSkills")).toHaveLength(0);
  });

  it("returns 404 in the error format for unknown routes", async () => {
    const { request } = setup();
    const res = await request("/v1/nope");
    expect(res.status).toBe(404);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("not_found");
  });
});

describe("error mapping", () => {
  const cases: [AppErrorCode, number][] = [
    ["not_found", 404],
    ["invalid_input", 400],
    ["unauthorized", 401],
    ["forbidden", 403],
    ["conflict", 409],
    ["rate_limited", 429],
    ["unavailable", 503],
    ["internal", 500],
  ];
  it.each(cases)("maps %s to HTTP %i and keeps code, message and details", async (code, status) => {
    const fakes = makeFakes({
      coaching: { revealHint: async () => err(appError(code, "메시지", { reason: "x" })) },
    });
    const { client } = setup(fakes);
    const e = await client(TOKEN)
      .revealHint(EXERCISE_ID, { level: 1 })
      .then(() => null, (x: unknown) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect(e).toMatchObject({ status, code, message: "메시지", details: { reason: "x" } });
  });

  it("turns thrown errors into 500 internal and logs them", async () => {
    const logged: string[] = [];
    const logger: Logger = { info: () => {}, warn: () => {}, error: (m) => logged.push(m) };
    const fakes = makeFakes({
      catalog: {
        listSkills: async () => {
          throw new Error("db down");
        },
      },
    });
    const { request } = setup(fakes, { logger });
    const res = await request("/v1/skills");
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("internal");
    expect(body.error.message).not.toContain("db down");
    expect(logged).toEqual(["unhandled request error"]);
  });
});

describe("exercise routes", () => {
  it("decodes URL-encoded exercise ids containing '/' and '@'", async () => {
    const { request, fakes } = setup();
    const res = await request(`/v1/exercises/${enc(EXERCISE_ID)}`);
    expect(res.status).toBe(200);
    expect(callsTo(fakes, "catalog.getExercise")).toEqual([[EXERCISE_ID, "ko"]]);
    expect(callsTo(fakes, "coaching.helpUsed")).toEqual([[USER.id, EXERCISE_ID]]);

    await request(`/v1/exercises/${enc(EXERCISE_ID)}/run`, { method: "POST", body: JSON.stringify({ code: "x" }) });
    expect(callsTo(fakes, "grading.trialRun")).toEqual([[{ exerciseId: EXERCISE_ID, code: "x", locale: "ko" }]]);
  });

  it("works through the contract client for every exercise sub-route", async () => {
    const { client, fakes } = setup();
    const api = client(TOKEN);
    await api.trialRun(EXERCISE_ID, { code: "x" });
    await api.revealHint(EXERCISE_ID, { level: 2 });
    await api.noteOpened(EXERCISE_ID, { kind: "theory", noteId: "functor" });
    await api.explanation(EXERCISE_ID);
    expect(callsTo(fakes, "coaching.revealHint")).toEqual([[USER.id, EXERCISE_ID, 2, "ko"]]);
    expect(callsTo(fakes, "coaching.revealExplanation")).toEqual([[USER.id, EXERCISE_ID, "ko"]]);
    expect(callsTo(fakes, "coaching.recordHelp")).toEqual([[USER.id, EXERCISE_ID, "theory_note", "functor"]]);
  });

  it("composes ExerciseView with notes, topics and only the revealed hints", async () => {
    const { client, fakes } = setup();
    fakes.helpUsed = { ...fakes.helpUsed, maxHintLevel: 2 };
    const view = await client(TOKEN).exercise(EXERCISE_ID);
    expect(view.exercise.id).toBe(EXERCISE_ID);
    expect(view.conceptNotes.map((n) => n.id)).toEqual(["list-map"]);
    expect(view.theoryTopics.map((t) => t.id)).toEqual(["functor"]);
    expect(view.revealedHints.map((h) => h.markdown)).toEqual(["힌트 1", "힌트 2"]);
    // Unrevealed hint text never leaves the server; level and kind stay visible.
    expect(view.exercise.hints).toEqual([
      { level: 1, kind: "question", markdown: "힌트 1" },
      { level: 2, kind: "concept", markdown: "힌트 2" },
      { level: 3, kind: "approach", markdown: "" },
    ]);
  });

  it("never sends predict answers", async () => {
    const { client } = setup();
    const view = await client(TOKEN).exercise(PREDICT_ID);
    expect(view.exercise.predict?.acceptedAnswers).toEqual([]);
    expect(view.exercise.predict?.code).toContain("list.map");
  });

  it("returns 404 for an unknown exercise and for notes-opened on it", async () => {
    const { request, post, fakes } = setup();
    expect((await request(`/v1/exercises/${enc("missing/base@1")}`)).status).toBe(404);
    const res = await post(`/v1/exercises/${enc("missing/base@1")}/notes-opened`, { kind: "concept", noteId: "n" });
    expect(res.status).toBe(404);
    expect(callsTo(fakes, "coaching.recordHelp")).toHaveLength(0);
  });

  it("records concept notes as concept_note help", async () => {
    const { post, fakes } = setup();
    const res = await post(`/v1/exercises/${enc(EXERCISE_ID)}/notes-opened`, { kind: "concept", noteId: "list-map" });
    expect(res.status).toBe(200);
    expect(await res.json()).toBeNull();
    expect(callsTo(fakes, "coaching.recordHelp")).toEqual([[USER.id, EXERCISE_ID, "concept_note", "list-map"]]);
  });

  it("validates hint levels and exercise filters", async () => {
    const { post, request, fakes } = setup();
    expect((await post(`/v1/exercises/${enc(EXERCISE_ID)}/hints`, { level: 6 })).status).toBe(400);
    expect((await post(`/v1/exercises/${enc(EXERCISE_ID)}/hints`, { level: "1" })).status).toBe(400);
    expect((await request("/v1/exercises?language=haskell")).status).toBe(400);
    expect((await request("/v1/exercises?kind=essay")).status).toBe(400);
    const ok = await request("/v1/exercises?language=gleam&kind=predict");
    expect(ok.status).toBe(200);
    expect(callsTo(fakes, "catalog.listExercises")).toEqual([[{ language: "gleam", kind: "predict" }, "ko"]]);
  });
});

describe("submissions", () => {
  it("passes the server-side helpUsed to grading and returns the rating change", async () => {
    const { client, fakes } = setup();
    fakes.helpUsed = { ...fakes.helpUsed, maxHintLevel: 3, explanationViewed: true };
    const view = await client(TOKEN).submit({
      exerciseId: EXERCISE_ID,
      code: "pub fn apply() { 1 }",
      idempotencyKey: "k-1",
      sessionId: "sess-1",
    });
    expect(callsTo(fakes, "coaching.helpUsed")).toEqual([[USER.id, EXERCISE_ID]]);
    expect(callsTo(fakes, "grading.submit")).toEqual([
      [
        {
          userId: USER.id,
          exerciseId: EXERCISE_ID,
          code: "pub fn apply() { 1 }",
          idempotencyKey: "k-1",
          sessionId: "sess-1",
          helpUsed: fakes.helpUsed,
          locale: "ko",
        },
      ],
    ]);
    expect(callsTo(fakes, "learner.ratingChangeFor")).toEqual([["s-1"]]);
    expect(view.submission.helpUsed.maxHintLevel).toBe(3);
    expect(view.ratingChange).toMatchObject({ before: 1200, after: 1216 });

    // Order matters: help is read before grading, rating after.
    const order = fakes.calls.map((c) => c.method).filter((m) => m !== "accounts.authenticate");
    expect(order).toEqual(["coaching.helpUsed", "grading.submit", "learner.ratingChangeFor"]);
  });

  it("ignores a client-sent helpUsed and omits an absent sessionId", async () => {
    const { post, fakes } = setup();
    const res = await post("/v1/submissions", {
      exerciseId: EXERCISE_ID,
      code: "x",
      idempotencyKey: "k",
      helpUsed: { maxHintLevel: 0 },
    });
    expect(res.status).toBe(200);
    const req = callsTo(fakes, "grading.submit")[0]?.[0] as Record<string, unknown>;
    expect(req.helpUsed).toBe(fakes.helpUsed);
    expect("sessionId" in req).toBe(false);
  });

  it("rejects invalid submissions before calling any module", async () => {
    const { post, fakes } = setup();
    const res = await post("/v1/submissions", { exerciseId: EXERCISE_ID, code: "x" });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { details: { issues: { path: string }[] } } };
    expect(body.error.details.issues.map((i) => i.path)).toEqual(["idempotencyKey"]);
    expect((await post("/v1/submissions", { exerciseId: EXERCISE_ID, code: "x".repeat(100_001), idempotencyKey: "k" })).status).toBe(400);
    expect(callsTo(fakes, "grading.submit")).toHaveLength(0);
  });

  it("returns grading errors with their status and skips the rating lookup", async () => {
    const fakes = makeFakes({ grading: { submit: async () => err(appError("not_found", "문제를 찾을 수 없습니다.")) } });
    const { post } = setup(fakes);
    const res = await post("/v1/submissions", { exerciseId: "x/y@1", code: "x", idempotencyKey: "k" });
    expect(res.status).toBe(404);
    expect(callsTo(fakes, "learner.ratingChangeFor")).toHaveLength(0);
  });

  it("gets a submission with its rating change, 404 for others", async () => {
    const { client, request } = setup();
    const view = await client(TOKEN).submission("s-1");
    expect(view.ratingChange?.after).toBe(1216);
    expect((await request("/v1/submissions/s-1", { token: OTHER_TOKEN })).status).toBe(404);
  });

  it("requests feedback and chat for the authenticated user", async () => {
    const { client, fakes } = setup();
    const api = client(TOKEN);
    const fb = await api.feedback("s-1");
    expect(fb.source).toBe("rule_based");
    expect(callsTo(fakes, "coaching.feedback")).toEqual([["s-1", USER.id, "ko"]]);
    await api.chat({ exerciseId: EXERCISE_ID, messages: [{ role: "user", content: "도와줘" }] });
    expect(callsTo(fakes, "coaching.chat")).toEqual([
      [{ userId: USER.id, exerciseId: EXERCISE_ID, messages: [{ role: "user", content: "도와줘" }], locale: "ko" }],
    ]);
  });

  it("validates chat messages", async () => {
    const { post } = setup();
    expect((await post("/v1/coach/chat", { exerciseId: EXERCISE_ID, messages: [] })).status).toBe(400);
    expect(
      (await post("/v1/coach/chat", { exerciseId: EXERCISE_ID, messages: [{ role: "system", content: "x" }] })).status,
    ).toBe(400);
  });
});

describe("rate limiting", () => {
  it("limits submit per user and action within the window", async () => {
    const clock = fakeClock();
    const { post, request } = setup(makeFakes(), { clock, rateLimit: { limit: 2, windowMs: 60_000 } });
    const submit = (token = TOKEN) => post("/v1/submissions", { exerciseId: EXERCISE_ID, code: "x", idempotencyKey: "k" }, token);

    expect((await submit()).status).toBe(200);
    clock.advance(10_000);
    expect((await submit()).status).toBe(200);
    const blocked = await submit();
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBe("50");
    expect(await blocked.json()).toEqual({
      error: { code: "rate_limited", message: expect.any(String), details: { action: "submit", retryAfterSeconds: 50 } },
    });

    // Other users and other actions have their own budget.
    expect((await submit(OTHER_TOKEN)).status).toBe(200);
    expect((await post(`/v1/exercises/${enc(EXERCISE_ID)}/run`, { code: "x" })).status).toBe(200);
    // Unlimited routes are unaffected.
    expect((await request("/v1/me")).status).toBe(200);

    // The oldest hit leaves the window after 60s.
    clock.advance(50_000);
    expect((await submit()).status).toBe(200);
    expect((await submit()).status).toBe(429);
  });

  it("limits run, chat and feedback too", async () => {
    const { post } = setup(makeFakes(), { rateLimit: { limit: 1, windowMs: 60_000 } });
    const run = () => post(`/v1/exercises/${enc(EXERCISE_ID)}/run`, { code: "x" });
    const chat = () => post("/v1/coach/chat", { exerciseId: EXERCISE_ID, messages: [{ role: "user", content: "?" }] });
    const feedback = () => post("/v1/submissions/s-1/feedback", {});
    for (const call of [run, chat, feedback]) {
      expect((await call()).status).toBe(200);
      expect((await call()).status).toBe(429);
    }
  });
});

describe("sessions, recommendation and progress", () => {
  it("routes /v1/sessions/active to the active lookup, not to get(:sessionId)", async () => {
    const { client, fakes } = setup();
    const s = await client(TOKEN).activeSession("gleam");
    expect(s?.id).toBe("sess-active");
    expect(callsTo(fakes, "sessions.active")).toEqual([[USER.id, "gleam"]]);
    expect(callsTo(fakes, "sessions.get")).toHaveLength(0);
  });

  it("returns null when there is no active session", async () => {
    const { client } = setup(makeFakes({ sessions: { active: async () => null } }));
    expect(await client(TOKEN).activeSession("gleam")).toBeNull();
  });

  it("requires a supported language query", async () => {
    const { request } = setup();
    expect((await request("/v1/sessions/active")).status).toBe(400);
    expect((await request("/v1/progress?language=haskell")).status).toBe(400);
    expect((await request("/v1/recommendation")).status).toBe(400);
  });

  it("starts, reads, skips and completes sessions", async () => {
    const { client, post, fakes } = setup();
    const api = client(TOKEN);
    await api.startSession({ language: "gleam", targetMinutes: 15, focusSkill: "data-transform" });
    expect(callsTo(fakes, "sessions.start")).toEqual([
      [{ userId: USER.id, language: "gleam", targetMinutes: 15, focusSkill: "data-transform", locale: "ko" }],
    ]);
    expect((await api.session("sess-1")).id).toBe("sess-1");
    expect((await api.skipItem("sess-1")).id).toBe("sess-1");
    expect((await api.completeSession("sess-1")).passed).toBe(1);
    expect((await post("/v1/sessions", { language: "gleam", targetMinutes: 0 })).status).toBe(400);
    await expect(api.session("nope")).rejects.toMatchObject({ status: 404, code: "not_found" });
  });

  it("recommends and composes progress", async () => {
    const { client, fakes } = setup();
    const api = client(TOKEN);
    const rec = await api.recommend("gleam", "recursion");
    expect(rec.skillId).toBe("recursion");
    const progress = await api.progress("gleam");
    expect(progress.profile.userId).toBe(USER.id);
    expect(progress.skills.map((s) => s.id)).toEqual(["data-transform"]);
    expect(callsTo(fakes, "learner.getProfile")).toEqual([[USER.id, "gleam"]]);
  });
});

describe("accounts routes", () => {
  it("issues, lists and revokes tokens", async () => {
    const { client, request } = setup();
    const api = client(TOKEN);
    expect((await api.issueToken({ label: "cli" })).label).toBe("cli");
    expect(await api.listTokens()).toHaveLength(1);
    expect(await api.revokeToken("t1")).toBeNull();
    expect((await request("/v1/me/tokens/zzz", { method: "DELETE" })).status).toBe(404);
  });
});

describe("cors", () => {
  it("answers preflight for the web origin without authentication", async () => {
    const { request } = setup(makeFakes(), { webOrigin: "http://localhost:5173" });
    const res = await request("/v1/submissions", {
      method: "OPTIONS",
      token: null,
      headers: {
        origin: "http://localhost:5173",
        "access-control-request-method": "POST",
        "access-control-request-headers": "authorization,content-type",
      },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
    expect(res.headers.get("access-control-allow-headers")?.toLowerCase()).toContain("authorization");
  });
});
