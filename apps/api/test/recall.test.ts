/** Recall routes: overview, start, answer (rate limited), finish, deck cards. */
import { describe, expect, it } from "vitest";
import { appError, err } from "@fp/kernel";
import type { AppErrorCode } from "@fp/kernel";
import { ApiError, createApiClient } from "@fp/api-contract";
import { createApp } from "../src/app.ts";
import { apiMessage } from "../src/messages.ts";
import { MAX_RECALL_BODY_CHARS, MAX_RECALL_ELAPSED_MS } from "../src/schemas.ts";
import {
  callsTo,
  EN_TOKEN,
  fakeClock,
  makeFakes,
  RECALL_CARD_ID,
  RECALL_DECK_ID,
  RECALL_ITEM_ID,
  RECALL_SESSION_ID,
  RECALL_SUMMARY,
  TOKEN,
  USER,
  ZH_TOKEN,
} from "./fakes.ts";
import type { Fakes } from "./fakes.ts";

const enc = encodeURIComponent;

function setup(fakes: Fakes = makeFakes(), options: Parameters<typeof createApp>[1] = {}) {
  const app = createApp(fakes.services, options);
  const send = (method: string, path: string, body?: unknown, token: string | null = TOKEN) => {
    const headers = new Headers();
    if (token !== null) headers.set("authorization", `Bearer ${token}`);
    if (body !== undefined) headers.set("content-type", "application/json");
    return app.request(path, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  };
  const client = (token: string = TOKEN) =>
    createApiClient({
      baseUrl: "http://localhost",
      token,
      fetch: (async (input: string | URL | Request, init?: RequestInit) =>
        app.request(input instanceof Request ? input.url : String(input), init)) as typeof fetch,
    });
  return { fakes, send, client };
}

type ErrorJson = { error: { code: string; message: string; details?: { issues?: { path: string; message: string }[] } } };
const errorOf = async (res: Response): Promise<ErrorJson["error"]> => ((await res.json()) as ErrorJson).error;
const recallCalls = (fakes: Fakes) => fakes.calls.filter((c) => c.method.startsWith("recall."));

const SESSION_PATH = `/v1/recall/sessions/${RECALL_SESSION_ID}`;
const CHOICE = { itemId: RECALL_ITEM_ID, response: { kind: "choice", choice: 1 }, elapsedMs: 4200 } as const;

/** [method, path, body] for each recall route with valid input. */
const ROUTE_CASES: readonly (readonly [string, string, unknown])[] = [
  ["GET", "/v1/recall", undefined],
  ["POST", "/v1/recall/sessions", {}],
  ["POST", `${SESSION_PATH}/answers`, CHOICE],
  ["POST", `${SESSION_PATH}/finish`, {}],
  ["GET", `/v1/recall/decks/${RECALL_DECK_ID}/cards`, undefined],
];

describe("recall routes through the contract client", () => {
  it("maps every route onto RecallService with the user's id and locale", async () => {
    const { client, fakes } = setup();
    const api = client();

    const overview = await api.recallOverview();
    expect(overview).toMatchObject({ dueNow: 2, newPerDay: 10 });

    const view = await api.startRecall({ minutes: 10, deckIds: [RECALL_DECK_ID] });
    expect(view.sessionId).toBe(RECALL_SESSION_ID);
    expect(view.items[0]?.card.summary).toBe(RECALL_SUMMARY.ko);

    const res = await api.recallAnswer(RECALL_SESSION_ID, CHOICE);
    expect(res).toMatchObject({ correct: true, rating: "good", stage: "recognize" });

    const summary = await api.finishRecall(RECALL_SESSION_ID);
    expect(summary).toMatchObject({ sessionId: RECALL_SESSION_ID, answered: 1 });

    const cards = await api.recallDeckCards(RECALL_DECK_ID);
    expect(cards.map((c) => [c.id, c.state])).toEqual([[RECALL_CARD_ID, null]]);

    expect(callsTo(fakes, "recall.overview")).toEqual([[USER.id, "ko"]]);
    expect(callsTo(fakes, "recall.startSession")).toEqual([[USER.id, { minutes: 10, deckIds: [RECALL_DECK_ID] }, "ko"]]);
    expect(callsTo(fakes, "recall.answer")).toEqual([
      [USER.id, RECALL_SESSION_ID, RECALL_ITEM_ID, { kind: "choice", choice: 1 }, 4200, "ko"],
    ]);
    expect(callsTo(fakes, "recall.finish")).toEqual([[USER.id, RECALL_SESSION_ID, "ko"]]);
    expect(callsTo(fakes, "recall.cards")).toEqual([[USER.id, RECALL_DECK_ID, "ko"]]);
  });

  it("starts with 201 and passes no options when none are sent", async () => {
    const { send, fakes } = setup();
    const res = await send("POST", "/v1/recall/sessions");
    expect(res.status).toBe(201);
    expect(callsTo(fakes, "recall.startSession")).toEqual([[USER.id, {}, "ko"]]);
  });

  it("forwards text and code responses unchanged", async () => {
    const { client, fakes } = setup();
    const api = client();
    await api.recallAnswer(RECALL_SESSION_ID, { itemId: RECALL_ITEM_ID, response: { kind: "text", text: " fold " }, elapsedMs: 0 });
    const body = "list.fold(xs, 0, fn(acc, x) {\n  acc + x\n})";
    await api.recallAnswer(RECALL_SESSION_ID, { itemId: RECALL_ITEM_ID, response: { kind: "code", body }, elapsedMs: 61_000 });
    expect(callsTo(fakes, "recall.answer").map((a) => [a[3], a[4]])).toEqual([
      [{ kind: "text", text: " fold " }, 0],
      [{ kind: "code", body }, 61_000],
    ]);
  });

  it("rounds fractional elapsed times and clamps very long ones", async () => {
    const { send, fakes } = setup();
    await send("POST", `${SESSION_PATH}/answers`, { ...CHOICE, elapsedMs: 1234.6 });
    await send("POST", `${SESSION_PATH}/answers`, { ...CHOICE, elapsedMs: MAX_RECALL_ELAPSED_MS * 3 });
    expect(callsTo(fakes, "recall.answer").map((a) => a[4])).toEqual([1235, MAX_RECALL_ELAPSED_MS]);
  });
});

describe("authentication", () => {
  it.each(ROUTE_CASES)("%s %s requires a bearer token", async (method, path, body) => {
    const { send, fakes } = setup();
    const missing = await send(method, path, body, null);
    expect(missing.status).toBe(401);
    expect((await errorOf(missing)).code).toBe("unauthorized");
    expect((await send(method, path, body, "wrong")).status).toBe(401);
    expect(recallCalls(fakes)).toHaveLength(0);
  });

  it("acts on behalf of the token's user", async () => {
    const { client, fakes } = setup();
    await client(EN_TOKEN).recallOverview();
    expect(callsTo(fakes, "recall.overview")[0]?.[0]).toBe("u-emma");
  });
});

describe("validation", () => {
  const invalidIds = [enc("a/b"), "a%20b", "-lead", "x".repeat(129)];

  it.each(invalidIds)("rejects the path id %s with 400 before calling the module", async (bad) => {
    const { send, fakes } = setup();
    const cases: [string, string, unknown, string][] = [
      ["POST", `/v1/recall/sessions/${bad}/answers`, CHOICE, "sessionId"],
      ["POST", `/v1/recall/sessions/${bad}/finish`, {}, "sessionId"],
      ["GET", `/v1/recall/decks/${bad}/cards`, undefined, "deckId"],
    ];
    for (const [method, path, body, param] of cases) {
      const res = await send(method, path, body);
      expect(res.status, path).toBe(400);
      const e = await errorOf(res);
      expect(e.code).toBe("invalid_input");
      expect(e.details?.issues).toEqual([{ path: param, message: apiMessage("invalidPathId", "ko") }]);
    }
    expect(recallCalls(fakes)).toHaveLength(0);
  });

  it.each([
    [{ minutes: 0 }, "minutes"],
    [{ minutes: 61 }, "minutes"],
    [{ minutes: 2.5 }, "minutes"],
    [{ minutes: "10" }, "minutes"],
    [{ deckIds: [] }, "deckIds"],
    [{ deckIds: "stdlib" }, "deckIds"],
    [{ deckIds: ["a/b"] }, "deckIds.0"],
  ] as const)("rejects the start body %j at %s", async (body, path) => {
    const { send, fakes } = setup();
    const res = await send("POST", "/v1/recall/sessions", body);
    expect(res.status).toBe(400);
    expect((await errorOf(res)).details?.issues?.map((i) => i.path)).toEqual([path]);
    expect(recallCalls(fakes)).toHaveLength(0);
  });

  it.each([
    [{ ...CHOICE, itemId: "" }, "itemId"],
    [{ response: CHOICE.response, elapsedMs: 1 }, "itemId"],
    [{ ...CHOICE, response: { kind: "choice", choice: -1 } }, "response.choice"],
    [{ ...CHOICE, response: { kind: "choice", choice: "1" } }, "response.choice"],
    [{ ...CHOICE, response: { kind: "text" } }, "response.text"],
    [{ ...CHOICE, response: { kind: "code", body: "x".repeat(MAX_RECALL_BODY_CHARS + 1) } }, "response.body"],
    [{ ...CHOICE, response: { kind: "voice", text: "fold" } }, "response.kind"],
    [{ ...CHOICE, elapsedMs: -1 }, "elapsedMs"],
    [{ itemId: RECALL_ITEM_ID, response: CHOICE.response }, "elapsedMs"],
  ] as const)("rejects the answer body %# at %s", async (body, path) => {
    const { send, fakes } = setup();
    const res = await send("POST", `${SESSION_PATH}/answers`, body);
    expect(res.status).toBe(400);
    expect((await errorOf(res)).details?.issues?.map((i) => i.path)).toEqual([path]);
    expect(recallCalls(fakes)).toHaveLength(0);
  });

  it("reports validation errors in the user's locale", async () => {
    const { send } = setup();
    const res = await send("POST", `/v1/recall/sessions/${enc("a/b")}/finish`, {}, ZH_TOKEN);
    const e = await errorOf(res);
    expect(e.message).toBe(apiMessage("invalidInput", "zh"));
    expect(e.details?.issues?.[0]?.message).toBe(apiMessage("invalidPathId", "zh"));
  });
});

describe("rate limit", () => {
  it("limits answers per user, after validation, with retry-after", async () => {
    const clock = fakeClock();
    const { send, fakes } = setup(makeFakes(), { clock, rateLimit: { limit: 2, windowMs: 60_000 } });
    const path = `${SESSION_PATH}/answers`;
    // Invalid requests do not consume quota.
    expect((await send("POST", path, { ...CHOICE, elapsedMs: -1 })).status).toBe(400);
    expect((await send("POST", path, CHOICE)).status).toBe(200);
    expect((await send("POST", path, CHOICE)).status).toBe(200);
    const blocked = await send("POST", path, CHOICE, TOKEN);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBe("60");
    const e = await errorOf(blocked);
    expect(e.code).toBe("rate_limited");
    expect(e.message).toBe(apiMessage("rateLimited", "ko"));
    expect(callsTo(fakes, "recall.answer")).toHaveLength(2);
    // Other users and other recall routes are not affected.
    expect((await send("POST", path, CHOICE, EN_TOKEN)).status).toBe(200);
    expect((await send("POST", `${SESSION_PATH}/finish`, {})).status).toBe(200);
    clock.advance(60_001);
    expect((await send("POST", path, CHOICE)).status).toBe(200);
  });
});

describe("locale threading", () => {
  it.each([
    ["ko", TOKEN],
    ["en", EN_TOKEN],
    ["zh", ZH_TOKEN],
  ] as const)("passes the %s user's locale to every recall call", async (locale, token) => {
    const { client, fakes } = setup();
    const api = client(token);
    await api.recallOverview();
    const view = await api.startRecall();
    await api.recallAnswer(RECALL_SESSION_ID, CHOICE);
    await api.finishRecall(RECALL_SESSION_ID);
    const cards = await api.recallDeckCards(RECALL_DECK_ID);

    expect(view.items[0]?.card.summary).toBe(RECALL_SUMMARY[locale]);
    expect(cards[0]?.summary).toBe(RECALL_SUMMARY[locale]);
    for (const method of ["recall.overview", "recall.startSession", "recall.answer", "recall.finish", "recall.cards"]) {
      const calls = callsTo(fakes, method);
      expect(calls, method).toHaveLength(1);
      expect(calls[0]?.at(-1), method).toBe(locale);
    }
  });
});

describe("error mapping", () => {
  it("maps module not_found to 404 with the module's message", async () => {
    const api = setup().client();
    const attempts: (() => Promise<unknown>)[] = [
      () => api.recallAnswer("other-session", CHOICE),
      () => api.recallAnswer(RECALL_SESSION_ID, { ...CHOICE, itemId: "item-99" }),
      () => api.finishRecall("other-session"),
      () => api.recallDeckCards("missing-deck"),
    ];
    for (const attempt of attempts) {
      const e = await attempt().catch((x: unknown) => x);
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(404);
      expect((e as ApiError).code).toBe("not_found");
      expect((e as ApiError).message).toMatch(/찾을 수 없습니다/);
    }
  });

  it.each([
    ["conflict", 409],
    ["forbidden", 403],
    ["invalid_input", 400],
    ["unavailable", 503],
  ] as const)("maps %s from the recall service to %i with details", async (code: AppErrorCode, status) => {
    const failing = async () => err(appError(code, "module says no", { reason: code }));
    const fakes = makeFakes({ recall: { startSession: failing, answer: failing, finish: failing, cards: failing } });
    const { send } = setup(fakes);
    for (const [method, path, body] of ROUTE_CASES.slice(1)) {
      const res = await send(method, path, body);
      expect(res.status, path).toBe(status);
      expect(await res.json()).toEqual({ error: { code, message: "module says no", details: { reason: code } } });
    }
  });

  it("turns a thrown module error into 500 internal without leaking it", async () => {
    const fakes = makeFakes({
      recall: {
        overview: async () => {
          throw new Error("db exploded");
        },
      },
    });
    const res = await setup(fakes).send("GET", "/v1/recall", undefined, EN_TOKEN);
    expect(res.status).toBe(500);
    expect(await errorOf(res)).toEqual({ code: "internal", message: apiMessage("internal", "en") });
  });
});
