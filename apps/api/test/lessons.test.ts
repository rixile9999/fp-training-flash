/** Lesson course routes: course, lesson, answers, complete, checkpoint start/submit, placement start/submit. */
import { describe, expect, it } from "vitest";
import { appError, err } from "@fp/kernel";
import type { AppErrorCode, Locale } from "@fp/kernel";
import { ApiError, createApiClient } from "@fp/api-contract";
import { createApp } from "../src/app.ts";
import { apiMessage } from "../src/messages.ts";
import { MAX_QUIZ_ANSWERS } from "../src/schemas.ts";
import {
  callsTo,
  CHECKPOINT_QUIZ_ID,
  EN_TOKEN,
  LESSON_EXERCISE_ID,
  LESSON_ID,
  LESSON_TITLE,
  makeFakes,
  PLACEMENT_QUIZ_ID,
  TOKEN,
  UNIT_ID,
  USER,
  ZH_TOKEN,
} from "./fakes.ts";
import type { Fakes } from "./fakes.ts";

const enc = encodeURIComponent;

function setup(fakes: Fakes = makeFakes()) {
  const app = createApp(fakes.services);
  const request = (path: string, init: RequestInit & { token?: string | null } = {}) => {
    const { token = TOKEN, ...rest } = init;
    const headers = new Headers(rest.headers);
    if (token !== null) headers.set("authorization", `Bearer ${token}`);
    if (rest.body !== undefined) headers.set("content-type", "application/json");
    return app.request(path, { ...rest, headers });
  };
  const send = (method: string, path: string, body?: unknown, token: string | null = TOKEN) =>
    request(path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }), token });
  const client = (token: string = TOKEN) =>
    createApiClient({
      baseUrl: "http://localhost",
      token,
      fetch: (async (input: string | URL | Request, init?: RequestInit) =>
        app.request(input instanceof Request ? input.url : String(input), init)) as typeof fetch,
    });
  return { fakes, request, send, client };
}

type ErrorJson = { error: { code: string; message: string; details?: { issues?: { path: string; message: string }[] } } };
const errorOf = async (res: Response): Promise<ErrorJson["error"]> => ((await res.json()) as ErrorJson).error;
const lessonCalls = (fakes: Fakes) => fakes.calls.filter((c) => c.method.startsWith("lessons."));

const LESSON_PATH = `/v1/lessons/${UNIT_ID}/${LESSON_ID}`;

/** [method, path, body] for each of the 8 lesson routes with valid input. */
const ROUTE_CASES: readonly (readonly [string, string, unknown])[] = [
  ["GET", "/v1/course", undefined],
  ["GET", LESSON_PATH, undefined],
  ["POST", `${LESSON_PATH}/answers`, { exerciseId: LESSON_EXERCISE_ID, choice: 1 }],
  ["POST", `${LESSON_PATH}/complete`, {}],
  ["POST", `/v1/units/${UNIT_ID}/checkpoint`, {}],
  ["POST", `/v1/checkpoints/${CHECKPOINT_QUIZ_ID}/submit`, { answers: { i1: 1 } }],
  ["POST", "/v1/placement", {}],
  ["POST", `/v1/placement/${PLACEMENT_QUIZ_ID}/submit`, { answers: { i1: 0 } }],
];

describe("lesson routes through the contract client", () => {
  it("maps every route onto LessonService with the user's id", async () => {
    const { client, fakes } = setup();
    const api = client();

    const course = await api.course();
    expect(course.next).toEqual({ kind: "lesson", unitId: UNIT_ID, lessonId: LESSON_ID });
    expect(course.units[0]?.progress.unlocked).toBe(true);

    const view = await api.lesson(UNIT_ID, LESSON_ID);
    expect(view.lesson.title).toBe(LESSON_TITLE.ko);

    expect(await api.lessonAnswer(UNIT_ID, LESSON_ID, { exerciseId: LESSON_EXERCISE_ID, choice: 1 })).toEqual({
      correct: true,
      correctIndex: 1,
      feedback: "맞아요!",
    });
    const progress = await api.lessonComplete(UNIT_ID, LESSON_ID);
    expect(progress.lessonsCompleted).toEqual([LESSON_ID]);

    const checkpoint = await api.startCheckpoint(UNIT_ID);
    expect(checkpoint).toMatchObject({ quizId: CHECKPOINT_QUIZ_ID, kind: "checkpoint", unitId: UNIT_ID });
    const cpResult = await api.submitCheckpoint(CHECKPOINT_QUIZ_ID, { answers: { i1: 1 } });
    expect(cpResult).toMatchObject({ passed: true, score: 1, total: 1 });

    const placement = await api.startPlacement();
    expect(placement.kind).toBe("placement");
    const plResult = await api.submitPlacement(PLACEMENT_QUIZ_ID, { answers: { i1: null } });
    expect(plResult).toMatchObject({ band: "beginner", recommendation: "course" });

    expect(callsTo(fakes, "lessons.course")).toEqual([[USER.id, "ko"]]);
    expect(callsTo(fakes, "lessons.lesson")).toEqual([[USER.id, UNIT_ID, LESSON_ID, "ko"]]);
    expect(callsTo(fakes, "lessons.answer")).toEqual([
      [USER.id, UNIT_ID, LESSON_ID, LESSON_EXERCISE_ID, 1, { locale: "ko" }],
    ]);
    expect(callsTo(fakes, "lessons.completeLesson")).toEqual([[USER.id, UNIT_ID, LESSON_ID]]);
    expect(callsTo(fakes, "lessons.startCheckpoint")).toEqual([[USER.id, UNIT_ID, "ko"]]);
    expect(callsTo(fakes, "lessons.submitCheckpoint")).toEqual([[USER.id, CHECKPOINT_QUIZ_ID, { i1: 1 }, "ko"]]);
    expect(callsTo(fakes, "lessons.startPlacement")).toEqual([[USER.id, "ko"]]);
    expect(callsTo(fakes, "lessons.submitPlacement")).toEqual([[USER.id, PLACEMENT_QUIZ_ID, { i1: null }, "ko"]]);
  });

  it("returns 201 when a checkpoint or placement quiz is started", async () => {
    const { send } = setup();
    expect((await send("POST", `/v1/units/${UNIT_ID}/checkpoint`)).status).toBe(201);
    expect((await send("POST", "/v1/placement")).status).toBe(201);
  });

  it("passes giveUp and a null choice through", async () => {
    const { client, fakes } = setup();
    const res = await client().lessonAnswer(UNIT_ID, LESSON_ID, {
      exerciseId: LESSON_EXERCISE_ID,
      choice: null,
      giveUp: true,
    });
    expect(res).toMatchObject({ correct: false, correctIndex: 1 });
    expect(callsTo(fakes, "lessons.answer")[0]?.slice(4)).toEqual([null, { giveUp: true, locale: "ko" }]);
  });

  it("decodes percent-encoded path segments before calling the module", async () => {
    const { request, fakes } = setup();
    const res = await request(`/v1/lessons/${enc("u01-values")}/l01%2Dvalues%2Dlet`);
    expect(res.status).toBe(200);
    expect(callsTo(fakes, "lessons.lesson")[0]?.slice(1, 3)).toEqual([UNIT_ID, LESSON_ID]);
  });
});

describe("authentication", () => {
  it.each(ROUTE_CASES)("%s %s requires a bearer token", async (method, path, body) => {
    const { send, fakes } = setup();
    const missing = await send(method, path, body, null);
    expect(missing.status).toBe(401);
    expect((await errorOf(missing)).code).toBe("unauthorized");
    expect((await send(method, path, body, "wrong")).status).toBe(401);
    expect(lessonCalls(fakes)).toHaveLength(0);
  });

  it("acts on behalf of the token's user", async () => {
    const { client, fakes } = setup();
    await client(EN_TOKEN).course();
    expect(callsTo(fakes, "lessons.course")[0]?.[0]).toBe("u-emma");
  });
});

describe("validation", () => {
  const invalidIds = [enc("a/b"), "a%20b", "-lead", "x".repeat(129), enc("한글")];

  it.each(invalidIds)("rejects the path id %s with 400 before calling the module", async (bad) => {
    const { send, fakes } = setup();
    const cases: [string, string, unknown, string][] = [
      ["GET", `/v1/lessons/${bad}/${LESSON_ID}`, undefined, "unitId"],
      ["GET", `/v1/lessons/${UNIT_ID}/${bad}`, undefined, "lessonId"],
      ["POST", `/v1/lessons/${bad}/${LESSON_ID}/answers`, { exerciseId: LESSON_EXERCISE_ID, choice: 0 }, "unitId"],
      ["POST", `/v1/lessons/${UNIT_ID}/${bad}/complete`, {}, "lessonId"],
      ["POST", `/v1/units/${bad}/checkpoint`, {}, "unitId"],
      ["POST", `/v1/checkpoints/${bad}/submit`, { answers: {} }, "quizId"],
      ["POST", `/v1/placement/${bad}/submit`, { answers: {} }, "quizId"],
    ];
    for (const [method, path, body, param] of cases) {
      const res = await send(method, path, body);
      expect(res.status, path).toBe(400);
      const e = await errorOf(res);
      expect(e.code).toBe("invalid_input");
      expect(e.details?.issues).toEqual([{ path: param, message: apiMessage("invalidPathId", "ko") }]);
    }
    expect(lessonCalls(fakes)).toHaveLength(0);
  });

  it.each([
    [{ choice: 1 }, "exerciseId"],
    [{ exerciseId: LESSON_EXERCISE_ID }, "choice"],
    [{ exerciseId: LESSON_EXERCISE_ID, choice: -1 }, "choice"],
    [{ exerciseId: LESSON_EXERCISE_ID, choice: 1.5 }, "choice"],
    [{ exerciseId: LESSON_EXERCISE_ID, choice: "1" }, "choice"],
    [{ exerciseId: LESSON_EXERCISE_ID, choice: 999 }, "choice"],
    [{ exerciseId: LESSON_EXERCISE_ID, choice: 0, giveUp: "yes" }, "giveUp"],
    [{ exerciseId: "a b", choice: 0 }, "exerciseId"],
  ] as const)("rejects the answer body %j at %s", async (body, path) => {
    const { send, fakes } = setup();
    const res = await send("POST", `${LESSON_PATH}/answers`, body);
    expect(res.status).toBe(400);
    expect((await errorOf(res)).details?.issues?.map((i) => i.path)).toEqual([path]);
    expect(lessonCalls(fakes)).toHaveLength(0);
  });

  it.each([
    [{}, "answers"],
    [{ answers: [1, 2] }, "answers"],
    [{ answers: { i1: "1" } }, "answers.i1"],
    [{ answers: { i1: -1 } }, "answers.i1"],
    [{ answers: { i1: 0.5 } }, "answers.i1"],
  ] as const)("rejects the quiz body %j at %s", async (body, path) => {
    const { send, fakes } = setup();
    for (const url of [`/v1/checkpoints/${CHECKPOINT_QUIZ_ID}/submit`, `/v1/placement/${PLACEMENT_QUIZ_ID}/submit`]) {
      const res = await send("POST", url, body);
      expect(res.status, url).toBe(400);
      expect((await errorOf(res)).details?.issues?.map((i) => i.path)).toEqual([path]);
    }
    expect(lessonCalls(fakes)).toHaveLength(0);
  });

  it("bounds the number of quiz answers and reports it in the user's locale", async () => {
    const { send, fakes } = setup();
    const answers = Object.fromEntries(Array.from({ length: MAX_QUIZ_ANSWERS + 1 }, (_, i) => [`i${i}`, 0]));
    const res = await send("POST", `/v1/checkpoints/${CHECKPOINT_QUIZ_ID}/submit`, { answers }, ZH_TOKEN);
    expect(res.status).toBe(400);
    const e = await errorOf(res);
    expect(e.message).toBe(apiMessage("invalidInput", "zh"));
    expect(e.details?.issues).toEqual([
      { path: "answers", message: apiMessage("tooManyAnswers", "zh", { max: String(MAX_QUIZ_ANSWERS) }) },
    ]);
    const atLimit = Object.fromEntries(Array.from({ length: MAX_QUIZ_ANSWERS }, (_, i) => [`i${i}`, null]));
    expect((await send("POST", `/v1/checkpoints/${CHECKPOINT_QUIZ_ID}/submit`, { answers: atLimit })).status).toBe(200);
    expect(callsTo(fakes, "lessons.submitCheckpoint")).toHaveLength(1);
  });

  it("accepts quiz item ids that embed exercise ids", async () => {
    const { client, fakes } = setup();
    await client().submitPlacement(PLACEMENT_QUIZ_ID, { answers: { "orders-apply-coupon/base@1": 2 } });
    expect(callsTo(fakes, "lessons.submitPlacement")[0]?.[2]).toEqual({ "orders-apply-coupon/base@1": 2 });
  });

  it("drops a __proto__ answer key instead of passing it on", async () => {
    const { request, fakes } = setup();
    const res = await request(`/v1/checkpoints/${CHECKPOINT_QUIZ_ID}/submit`, {
      method: "POST",
      body: '{"answers":{"__proto__":{"polluted":1},"i1":1}}',
    });
    expect(res.status).toBe(200);
    const answers = callsTo(fakes, "lessons.submitCheckpoint")[0]?.[2] as Record<string, unknown>;
    expect(Object.keys(answers)).toEqual(["i1"]);
    expect(Object.getPrototypeOf(answers)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>)["polluted"]).toBeUndefined();
  });

  it("localizes path validation errors in the user's locale", async () => {
    const { request } = setup();
    const res = await request(`/v1/units/${enc("a/b")}/checkpoint`, { method: "POST", token: EN_TOKEN });
    const e = await errorOf(res);
    expect(e.message).toBe(apiMessage("invalidInput", "en"));
    expect(e.details?.issues?.[0]?.message).toBe(apiMessage("invalidPathId", "en"));
  });
});

describe("locale threading", () => {
  it.each([
    ["ko", TOKEN],
    ["en", EN_TOKEN],
    ["zh", ZH_TOKEN],
  ] as const)("passes the %s user's locale to every lesson call that takes one", async (locale, token) => {
    const { client, fakes } = setup();
    const api = client(token);
    await api.course();
    const view = await api.lesson(UNIT_ID, LESSON_ID);
    await api.lessonAnswer(UNIT_ID, LESSON_ID, { exerciseId: LESSON_EXERCISE_ID, choice: 0 });
    await api.lessonComplete(UNIT_ID, LESSON_ID);
    await api.startCheckpoint(UNIT_ID);
    await api.submitCheckpoint(CHECKPOINT_QUIZ_ID, { answers: { i1: 1 } });
    await api.startPlacement();
    await api.submitPlacement(PLACEMENT_QUIZ_ID, { answers: { i1: 1 } });

    expect(view.lesson.title).toBe(LESSON_TITLE[locale]);
    const pick: [string, (a: readonly unknown[]) => unknown][] = [
      ["lessons.course", (a) => a[1]],
      ["lessons.lesson", (a) => a[3]],
      ["lessons.answer", (a) => (a[5] as { locale?: Locale }).locale],
      ["lessons.startCheckpoint", (a) => a[2]],
      ["lessons.submitCheckpoint", (a) => a[3]],
      ["lessons.startPlacement", (a) => a[1]],
      ["lessons.submitPlacement", (a) => a[3]],
    ];
    for (const [method, get] of pick) {
      const calls = callsTo(fakes, method);
      expect(calls, method).toHaveLength(1);
      expect(get(calls[0] ?? []), method).toBe(locale);
    }
    // completeLesson takes no locale.
    expect(callsTo(fakes, "lessons.completeLesson")[0]).toHaveLength(3);
  });
});

describe("error mapping", () => {
  it("maps module not_found to 404 with the module's message", async () => {
    const { client } = setup();
    const api = client();
    const attempts: (() => Promise<unknown>)[] = [
      () => api.lesson(UNIT_ID, "l99-missing"),
      () => api.lessonAnswer(UNIT_ID, LESSON_ID, { exerciseId: "missing", choice: 0 }),
      () => api.lessonComplete("u99-missing", LESSON_ID),
      () => api.startCheckpoint("u99-missing"),
      () => api.submitCheckpoint("quiz-unknown", { answers: {} }),
      () => api.submitPlacement("quiz-unknown", { answers: {} }),
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
  ] as const)("maps %s from the lesson service to %i with details", async (code: AppErrorCode, status) => {
    const failing = async () => err(appError(code, "module says no", { reason: code }));
    const fakes = makeFakes({
      lessons: {
        lesson: failing,
        answer: failing,
        completeLesson: failing,
        startCheckpoint: failing,
        submitCheckpoint: failing,
        startPlacement: failing,
        submitPlacement: failing,
      },
    });
    const { send } = setup(fakes);
    for (const [method, path, body] of ROUTE_CASES.slice(1)) {
      const res = await send(method, path, body);
      expect(res.status, path).toBe(status);
      expect(await res.json()).toEqual({ error: { code, message: "module says no", details: { reason: code } } });
    }
  });

  it("turns a thrown module error into 500 internal without leaking it", async () => {
    const fakes = makeFakes({
      lessons: {
        course: async () => {
          throw new Error("db exploded");
        },
      },
    });
    const { request } = setup(fakes);
    const res = await request("/v1/course", { token: ZH_TOKEN });
    expect(res.status).toBe(500);
    expect(await errorOf(res)).toEqual({ code: "internal", message: apiMessage("internal", "zh") });
  });
});
