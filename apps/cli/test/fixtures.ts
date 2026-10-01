import type { ExerciseView, Locale, Session, SubmissionView, TrialRun } from "@fp/api-contract";
import type { CliApi } from "../src/cli.ts";

/** Branded ids are plain strings at runtime. */
export function brand<T>(s: string): T {
  return s as unknown as T;
}

export const EX_ID = "orders-apply-coupon/base@1";
export const EX2_ID = "orders-total/base@1";
export const PREDICT_ID = "pipe-predict/base@1";

export function exerciseView(id = EX_ID): ExerciseView {
  const family = id.split("/")[0] ?? id;
  return {
    exercise: {
      id: brand(id),
      familyId: brand(family),
      variantKey: "base",
      version: 1,
      language: "gleam",
      locales: ["ko"],
      kind: "implement",
      format: "drill",
      title: id === EX2_ID ? "주문 합계" : "쿠폰 적용하기",
      primarySkill: brand("data-transform"),
      secondarySkills: [],
      difficulty: 1200,
      estimatedMinutes: 5,
      contextTags: ["orders"],
      source: { kind: "original" },
      promptMarkdown: "주문 목록에 쿠폰을 적용하는 `apply` 함수를 작성하세요.",
      moduleName: id === EX2_ID ? "total" : "coupon",
      starterFiles: [{ path: id === EX2_ID ? "src/total.gleam" : "src/coupon.gleam", content: "pub fn apply(orders) {\n  todo\n}\n" }],
      publicTests: [
        { id: "T1", name: "빈 목록", code: "coupon.apply([]) |> should.equal([])" },
        {
          id: "T2",
          name: "리스트 모듈 사용",
          code: "import gleam/list\n\npub fn keeps_length_test() {\n  coupon.apply([1]) |> list.length |> should.equal(1)\n}",
        },
      ],
      hints: [
        { level: 1, kind: "question", markdown: "어떤 주문이 바뀌어야 하나요?" },
        { level: 2, kind: "concept", markdown: "SECRET-HINT-TWO" },
        { level: 3, kind: "approach", markdown: "SECRET-HINT-THREE" },
      ],
      rubric: [{ id: "R-01", title: "파이프라인", description: "파이프 연산자를 사용하세요." }],
      conceptNoteIds: [brand("gleam-list-map")],
      theoryTopicIds: [brand("functor")],
    },
    conceptNotes: [
      { id: brand("gleam-list-map"), language: "gleam", title: "list.map", markdown: "`list.map`은 각 원소를 변환합니다.", source: { kind: "original" } },
    ],
    theoryTopics: [
      { id: brand("functor"), title: "펑터", level: "basic", markdown: "펑터는 구조를 유지한 채 값을 바꿉니다.", relatedSkills: [], furtherReading: [] },
    ],
    revealedHints: [{ level: 1, kind: "question", markdown: "어떤 주문이 바뀌어야 하나요?" }],
  };
}

export function predictView(): ExerciseView {
  const base = exerciseView(PREDICT_ID);
  return {
    ...base,
    exercise: {
      ...base.exercise,
      kind: "predict",
      moduleName: "predict",
      starterFiles: [],
      publicTests: [],
      predict: { code: "[1, 2, 3] |> list.map(fn(x) { x * 2 })", acceptedAnswers: ["SECRET-ANSWER-[2, 4, 6]"] },
    },
    revealedHints: [],
  };
}

export function session(currentIndex: number | null = 0): Session {
  const item = (index: number, exerciseId: string) => ({
    index,
    kind: index === 0 ? ("review" as const) : ("focus" as const),
    exerciseId: brand<Session["items"][number]["exerciseId"]>(exerciseId),
    skillId: brand<Session["items"][number]["skillId"]>("data-transform"),
    reason: index === 0 ? "복습 예정: 데이터 변환" : "집중: 데이터 변환",
    expectedSuccess: 0.7,
    status: currentIndex !== null && index < currentIndex ? ("skipped" as const) : ("pending" as const),
    submissionIds: [],
  });
  return {
    id: brand("sess-1"),
    userId: brand("user-1"),
    language: "gleam",
    status: "active",
    targetMinutes: 15,
    startedAt: "2026-09-30T00:00:00.000Z",
    items: [item(0, EX_ID), item(1, EX2_ID)],
    currentIndex,
  };
}

export const failingRun: TrialRun = {
  outcome: "failed_tests",
  compileDiagnostics: [],
  tests: [
    { id: "T1", name: "빈 목록", status: "failed", visibility: "public", message: "Expected [] got [1]" },
    { id: "T2", name: "리스트 모듈 사용", status: "passed", visibility: "public" },
  ],
};

export function submissionView(sessionId?: string): SubmissionView {
  return {
    submission: {
      id: brand("sub-1"),
      userId: brand("user-1"),
      exerciseId: brand(EX_ID),
      ...(sessionId ? { sessionId: brand(sessionId) } : {}),
      attemptNo: 1,
      code: "pub fn apply(o) { o }",
      helpUsed: { maxHintLevel: 1, conceptNotesOpened: 0, theoryNotesOpened: 0, explanationViewed: false, coachMessages: 0 },
      status: "completed",
      evaluation: {
        outcome: "passed",
        correctness: true,
        compileDiagnostics: [],
        tests: [
          { id: "T1", name: "빈 목록", status: "passed", visibility: "public" },
          { id: "H1", name: "숨김 1", status: "passed", visibility: "hidden" },
        ],
        requirements: [{ id: "REQ-1", description: "다른 주문 유지", status: "met" }],
        rubricChecks: [],
        errorTags: [],
        evaluatedAt: "2026-09-30T00:01:00.000Z",
      },
      createdAt: "2026-09-30T00:01:00.000Z",
    },
    ratingChange: { skillId: brand("data-transform"), before: 1200, after: 1216.4, provisional: true },
  };
}

export interface Call {
  readonly method: string;
  readonly args: readonly unknown[];
}

/**
 * Hand-written fake API; every call is recorded. `overrides` replace individual methods. `accountLocale` is the
 * user's server-side locale (devLogin with a locale and updateMe change it).
 */
export function fakeApi(overrides: Partial<CliApi> = {}, accountLocale: Locale = "ko"): { api: CliApi; calls: Call[] } {
  const calls: Call[] = [];
  let active: Session | null = session(0);
  let locale: Locale = accountLocale;
  const base: CliApi = {
    devLogin: async (req) => ({
      user: { id: brand("user-1"), displayName: req.displayName, locale: (locale = req.locale ?? locale), createdAt: "2026-09-30T00:00:00.000Z" },
      token: { token: "tok-secret", tokenId: "tid-1", label: "cli", createdAt: "2026-09-30T00:00:00.000Z" },
    }),
    me: async () => ({ id: brand("user-1"), displayName: "민수", locale, createdAt: "2026-09-30T00:00:00.000Z" }),
    updateMe: async (req) => ({ id: brand("user-1"), displayName: "민수", locale: (locale = req.locale), createdAt: "2026-09-30T00:00:00.000Z" }),
    issueToken: async (req) => ({ token: "tok-mcp", tokenId: "tid-2", label: req.label, createdAt: "2026-09-30T00:00:00.000Z" }),
    exercise: async (id) => (id === PREDICT_ID ? predictView() : exerciseView(id)),
    trialRun: async () => failingRun,
    revealHint: async (_id, req) => exerciseView().exercise.hints.filter((h) => h.level <= req.level),
    explanation: async (id) => ({ exerciseId: brand(id), markdown: "map으로 변환합니다.", solutionCode: "pub fn apply(o) { o }" }),
    submit: async (req) => submissionView(req.sessionId),
    feedback: async (id) => ({
      submissionId: brand(id),
      summary: "모든 테스트를 통과했습니다.",
      evidence: [{ text: "T1 통과", testId: "T1" }],
      priorities: ["파이프라인으로 정리해 보세요."],
      nextAction: "다음 문제로 넘어가세요.",
      rubricNotes: [],
      source: "rule_based",
      promptVersion: "v1",
      createdAt: "2026-09-30T00:02:00.000Z",
    }),
    startSession: async () => (active = session(0)),
    activeSession: async () => active,
    skipItem: async () => (active = session(1)),
    progress: async () => ({
      profile: {
        userId: brand("user-1"),
        language: "gleam",
        estimates: [
          { skillId: brand("data-transform"), language: "gleam", rating: 1216, deviation: 180, ratedObservations: 1, provisional: true, updatedAt: "2026-09-30T00:00:00.000Z" },
        ],
        overall: { rating: 1216, provisional: true, method: "observation_weighted_mean" },
        reviews: [{ skillId: brand("data-transform"), language: "gleam", dueAt: "2026-10-02T00:00:00.000Z", intervalDays: 2 }],
        errorTags: [],
        policyVersion: "elo-v1",
      },
      skills: [{ id: brand("data-transform"), name: "데이터 변환", description: "", track: "core", prerequisites: [], order: 1 }],
    }),
  };
  const merged = { ...base, ...overrides } as Record<string, (...a: unknown[]) => Promise<unknown>>;
  const api = Object.fromEntries(
    Object.entries(merged).map(([k, fn]) => [
      k,
      (...args: unknown[]) => {
        calls.push({ method: k, args });
        return fn(...args);
      },
    ]),
  ) as unknown as CliApi;
  return { api, calls };
}
