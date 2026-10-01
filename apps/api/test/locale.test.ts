import { describe, expect, it } from "vitest";
import { SUPPORTED_LOCALES } from "@fp/kernel";
import type { Locale } from "@fp/kernel";
import type { User } from "@fp/accounts/contract";
import { createApiClient } from "@fp/api-contract";
import { createApp } from "../src/app.ts";
import type { AppOptions } from "../src/app.ts";
import { API_MESSAGES, apiMessage, localeFromAcceptLanguage } from "../src/messages.ts";
import type { ApiMessageId } from "../src/messages.ts";
import { callsTo, EN_TOKEN, EXERCISE_ID, makeFakes, SKILL_NAME, TOKEN, USER, ZH_TOKEN } from "./fakes.ts";
import type { Fakes } from "./fakes.ts";

const enc = encodeURIComponent;

function setup(fakes: Fakes = makeFakes(), options: AppOptions = {}) {
  const app = createApp(fakes.services, options);
  const request = (path: string, init: RequestInit & { token?: string | null } = {}) => {
    const { token = TOKEN, ...rest } = init;
    const headers = new Headers(rest.headers);
    if (token !== null) headers.set("authorization", `Bearer ${token}`);
    if (rest.body !== undefined) headers.set("content-type", "application/json");
    return app.request(path, { ...rest, headers });
  };
  const send = (method: string, path: string, body: unknown, token: string | null = TOKEN, headers: Record<string, string> = {}) =>
    request(path, { method, body: JSON.stringify(body), token, headers });
  const client = (token?: string) =>
    createApiClient({
      baseUrl: "http://localhost",
      ...(token === undefined ? {} : { token }),
      fetch: (async (input: string | URL | Request, init?: RequestInit) =>
        app.request(input instanceof Request ? input.url : String(input), init)) as typeof fetch,
    });
  return { app, fakes, request, send, client };
}

type ErrorJson = { error: { code: string; message: string; details?: { issues?: { path: string; message: string }[] } } };
const errorOf = async (res: Response): Promise<ErrorJson["error"]> => ((await res.json()) as ErrorJson).error;
const msg = (id: ApiMessageId, locale: Locale) => apiMessage(id, locale);

/** Calls every route that has a locale-aware module call, as the user behind `token`. */
async function hitEveryLocaleRoute(token: string, fakes: Fakes) {
  const api = setup(fakes).client(token);
  await api.exercise(EXERCISE_ID);
  await api.exercises({ language: "gleam" });
  await api.theoryTopics();
  await api.skills();
  await api.trialRun(EXERCISE_ID, { code: "x" });
  await api.submit({ exerciseId: EXERCISE_ID, code: "x", idempotencyKey: "k" });
  await api.feedback("s-1");
  await api.chat({ exerciseId: EXERCISE_ID, messages: [{ role: "user", content: "?" }] });
  await api.revealHint(EXERCISE_ID, { level: 1 });
  await api.noteOpened(EXERCISE_ID, { kind: "concept", noteId: "list-map" });
  await api.explanation(EXERCISE_ID);
  await api.startSession({ language: "gleam", targetMinutes: 15 });
  await api.recommend("gleam");
  return api.progress("gleam");
}

/** Where each module method receives its locale. */
const LOCALE_ARGS: readonly [string, (args: readonly unknown[]) => unknown][] = [
  ["catalog.getExercise", (a) => a[1]],
  ["catalog.getConceptNotes", (a) => a[1]],
  ["catalog.getTheoryTopics", (a) => a[1]],
  ["catalog.listExercises", (a) => a[1]],
  ["catalog.listTheoryTopics", (a) => a[0]],
  ["catalog.listSkills", (a) => a[0]],
  ["grading.trialRun", (a) => (a[0] as { locale?: Locale }).locale],
  ["grading.submit", (a) => (a[0] as { locale?: Locale }).locale],
  ["coaching.feedback", (a) => a[2]],
  ["coaching.chat", (a) => (a[0] as { locale?: Locale }).locale],
  ["coaching.revealHint", (a) => a[3]],
  ["coaching.revealExplanation", (a) => a[2]],
  ["sessions.start", (a) => (a[0] as { locale?: Locale }).locale],
  ["sessions.recommend", (a) => a[3]],
];

describe("locale threading", () => {
  it.each([
    ["ko", TOKEN],
    ["en", EN_TOKEN],
    ["zh", ZH_TOKEN],
  ] as const)("passes the %s user's locale to every module call that takes one", async (locale, token) => {
    const fakes = makeFakes();
    const progress = await hitEveryLocaleRoute(token, fakes);
    for (const [method, pick] of LOCALE_ARGS) {
      const calls = callsTo(fakes, method);
      expect(calls.length, method).toBeGreaterThan(0);
      for (const args of calls) expect(pick(args), method).toBe(locale);
    }
    // Progress skill names come from the catalog in the user's locale.
    expect(progress.skills[0]?.name).toBe(SKILL_NAME[locale]);
  });

  it("gives en and zh users skill names that differ from ko", async () => {
    const names = await Promise.all(
      [TOKEN, EN_TOKEN, ZH_TOKEN].map(async (t) => (await setup().client(t).progress("gleam")).skills[0]?.name),
    );
    expect(new Set(names).size).toBe(3);
  });

  it("falls back to Accept-Language when the stored user has no valid locale", async () => {
    const legacy = { ...USER, locale: undefined } as unknown as User;
    const fakes = makeFakes({ accounts: { authenticate: async () => legacy } });
    const { request } = setup(fakes);
    await request("/v1/skills", { headers: { "accept-language": "zh-CN,zh;q=0.9" } });
    await request("/v1/theory");
    expect(callsTo(fakes, "catalog.listSkills")).toEqual([["zh"]]);
    expect(callsTo(fakes, "catalog.listTheoryTopics")).toEqual([["ko"]]);
  });
});

describe("PATCH /v1/me", () => {
  it("updates the locale through AccountsService.setLocale and later requests use it", async () => {
    const { client, request, fakes } = setup();
    const api = client(TOKEN);
    const updated = await api.updateMe({ locale: "zh" });
    expect(updated).toEqual({ ...USER, locale: "zh" });
    expect(callsTo(fakes, "accounts.setLocale")).toEqual([[USER.id, "zh"]]);
    expect((await api.me()).locale).toBe("zh");

    await api.skills();
    expect(callsTo(fakes, "catalog.listSkills")).toEqual([["zh"]]);
    const missing = await request("/v1/sessions/nope");
    expect((await errorOf(missing)).message).toBe(msg("sessionNotFound", "zh"));
  });

  it("validates the body with messages in the user's locale", async () => {
    const { send, fakes } = setup();
    const bad = await send("PATCH", "/v1/me", { locale: "fr" });
    expect(bad.status).toBe(400);
    const e = await errorOf(bad);
    expect(e.code).toBe("invalid_input");
    expect(e.message).toBe(msg("invalidInput", "ko"));
    expect(e.details?.issues).toEqual([{ path: "locale", message: apiMessage("unsupportedLocale", "ko", { supported: "ko, en, zh" }) }]);

    const enBad = await send("PATCH", "/v1/me", {}, EN_TOKEN);
    expect(enBad.status).toBe(400);
    expect((await errorOf(enBad)).message).toBe(msg("invalidInput", "en"));
    expect(callsTo(fakes, "accounts.setLocale")).toHaveLength(0);
  });

  it("requires authentication and is allowed by CORS", async () => {
    const { send, request } = setup(makeFakes());
    expect((await send("PATCH", "/v1/me", { locale: "en" }, null)).status).toBe(401);
    const preflight = await request("/v1/me", {
      method: "OPTIONS",
      token: null,
      headers: { origin: "http://localhost:5173", "access-control-request-method": "PATCH" },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-methods")).toContain("PATCH");
  });
});

describe("dev-login locale", () => {
  it("passes an optional locale to accounts.devLogin", async () => {
    const { client, fakes } = setup();
    const res = await client().devLogin({ displayName: "Emma", locale: "en" });
    expect(res.user.locale).toBe("en");
    await client().devLogin({ displayName: "민수" });
    expect(callsTo(fakes, "accounts.devLogin")).toEqual([["Emma", "en"], ["민수"]]);
  });

  it("rejects an unsupported locale in the Accept-Language locale", async () => {
    const { send, fakes } = setup();
    const res = await send("POST", "/v1/auth/dev-login", { displayName: "Emma", locale: "jp" }, null, {
      "accept-language": "en",
    });
    expect(res.status).toBe(400);
    const e = await errorOf(res);
    expect(e.message).toBe(msg("invalidInput", "en"));
    expect(e.details?.issues?.[0]?.message).toBe(apiMessage("unsupportedLocale", "en", { supported: "ko, en, zh" }));
    expect(callsTo(fakes, "accounts.devLogin")).toHaveLength(0);
  });
});

describe("localized API errors", () => {
  it("uses Accept-Language for unauthenticated errors, default ko", async () => {
    const { request } = setup();
    const cases: [string | undefined, Locale][] = [
      [undefined, "ko"],
      ["en-US,en;q=0.9", "en"],
      ["zh-CN", "zh"],
      ["fr-FR", "ko"],
      ["fr, zh;q=0.5, en;q=0.8", "en"],
      ["en;q=0, zh", "zh"],
    ];
    for (const [header, locale] of cases) {
      const res = await request("/v1/me", { token: null, headers: header === undefined ? {} : { "accept-language": header } });
      expect(res.status).toBe(401);
      expect((await errorOf(res)).message, String(header)).toBe(msg("loginRequired", locale));
      const invalid = await request("/v1/me", { token: "nope", headers: header === undefined ? {} : { "accept-language": header } });
      expect((await errorOf(invalid)).message).toBe(msg("invalidToken", locale));
    }
  });

  it("localizes validation errors, including zod issue messages", async () => {
    const { send } = setup();
    const issues: Record<string, string | undefined> = {};
    for (const locale of SUPPORTED_LOCALES) {
      const res = await send("POST", "/v1/auth/dev-login", { displayName: "" }, null, { "accept-language": locale });
      const e = await errorOf(res);
      expect(e.message).toBe(msg("invalidInput", locale));
      issues[locale] = e.details?.issues?.[0]?.message;
    }
    expect(issues.en).not.toBe(issues.ko);
    expect(issues.zh).not.toBe(issues.ko);
    expect(issues.zh).not.toBe(issues.en);

    const { request } = setup();
    const badJson = await request("/v1/auth/dev-login", {
      method: "POST",
      body: "{nope",
      token: null,
      headers: { "accept-language": "zh" },
    });
    expect((await errorOf(badJson)).message).toBe(msg("invalidJson", "zh"));
  });

  it("prefers the authenticated user's locale over Accept-Language", async () => {
    const { send, request } = setup();
    const res = await send("POST", `/v1/exercises/${enc(EXERCISE_ID)}/hints`, { level: 9 }, EN_TOKEN, {
      "accept-language": "zh",
    });
    expect((await errorOf(res)).message).toBe(msg("invalidInput", "en"));
    const lang = await request("/v1/progress?language=haskell", { token: ZH_TOKEN, headers: { "accept-language": "en" } });
    expect((await errorOf(lang)).details?.issues?.[0]?.message).toBe(msg("unsupportedLanguage", "zh"));
    const route = await request("/v1/nope", { token: ZH_TOKEN });
    expect((await errorOf(route)).message).toBe(msg("routeNotFound", "zh"));
    const ex = await request(`/v1/exercises/${enc("missing/base@1")}`, { token: EN_TOKEN });
    expect((await errorOf(ex)).message).toBe(msg("exerciseNotFound", "en"));
  });

  it("localizes the rate-limit message per user", async () => {
    const { send } = setup(makeFakes(), { rateLimit: { limit: 1, windowMs: 60_000 } });
    for (const [token, locale] of [
      [TOKEN, "ko"],
      [EN_TOKEN, "en"],
      [ZH_TOKEN, "zh"],
    ] as const) {
      const run = () => send("POST", `/v1/exercises/${enc(EXERCISE_ID)}/run`, { code: "x" }, token);
      expect((await run()).status).toBe(200);
      const blocked = await run();
      expect(blocked.status).toBe(429);
      expect((await errorOf(blocked)).message).toBe(msg("rateLimited", locale));
    }
  });
});

describe("message catalog", () => {
  it("has en and zh text for every message, different from ko", () => {
    for (const [id, text] of Object.entries(API_MESSAGES)) {
      expect(text.en, id).toBeTruthy();
      expect(text.zh, id).toBeTruthy();
      expect(text.en, id).not.toBe(text.ko);
      expect(text.zh, id).not.toBe(text.ko);
    }
  });

  it("falls back to ko for a missing translation and fills placeholders", () => {
    expect(apiMessage("internal")).toBe(API_MESSAGES.internal.ko);
    expect(apiMessage("internal", "fr" as Locale)).toBe(API_MESSAGES.internal.ko);
    expect(apiMessage("unsupportedLocale", "en", { supported: "ko, en" })).toContain("ko, en");
  });

  it("negotiates Accept-Language by primary subtag and q-value", () => {
    expect(localeFromAcceptLanguage(undefined)).toBe("ko");
    expect(localeFromAcceptLanguage("")).toBe("ko");
    expect(localeFromAcceptLanguage("*")).toBe("ko");
    expect(localeFromAcceptLanguage("zh-Hant-TW")).toBe("zh");
    expect(localeFromAcceptLanguage("EN-gb")).toBe("en");
    expect(localeFromAcceptLanguage("ko;q=0.4, en;q=0.6")).toBe("en");
    expect(localeFromAcceptLanguage("de, ko;q=0.1")).toBe("ko");
  });
});
