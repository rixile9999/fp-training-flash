import type { ExerciseView, RatingChange, Session, SubmissionView, TrialRun } from "@fp/api-contract";
import type { FpApi } from "../src/api.ts";

/** Branded ids are plain strings at runtime. */
export function brand<T>(s: string): T {
  return s as unknown as T;
}

export const EX_ID = "orders-apply-coupon/base@1";
export const EX2_ID = "orders-total/base@1";

export function exerciseView(id = EX_ID, title = "쿠폰 적용하기"): ExerciseView {
  return {
    exercise: {
      id: brand(id),
      familyId: brand(id.split("/")[0] ?? id),
      variantKey: "base",
      version: 1,
      language: "gleam",
      kind: "implement",
      format: "drill",
      title,
      primarySkill: brand("data-transform"),
      secondarySkills: [],
      difficulty: 1200,
      estimatedMinutes: 5,
      contextTags: ["orders"],
      source: { kind: "original" },
      promptMarkdown: "주문 목록에 쿠폰을 적용하는 `apply` 함수를 작성하세요.",
      moduleName: "coupon",
      starterFiles: [{ path: "src/coupon.gleam", content: "pub fn apply(orders) {\n  todo\n}\n" }],
      publicTests: [{ id: "T1", name: "다른 주문은 유지", code: "coupon.apply([]) |> should.equal([])" }],
      hints: [
        { level: 1, kind: "question", markdown: "어떤 주문이 바뀌어야 하나요?" },
        { level: 2, kind: "concept", markdown: "SECRET-HINT-TWO list.map을 떠올려 보세요." },
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
    { id: "T1", name: "다른 주문은 유지", status: "failed", visibility: "public", message: "Expected [] got [1]" },
    { id: "T2", name: "쿠폰 적용", status: "passed", visibility: "public" },
  ],
};

export const ratingChange: RatingChange = { skillId: brand("data-transform"), before: 1200, after: 1216.4, provisional: true };

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
        tests: [{ id: "T1", name: "다른 주문은 유지", status: "passed", visibility: "public" }],
        requirements: [{ id: "REQ-1", description: "다른 주문 유지", status: "met" }],
        rubricChecks: [],
        errorTags: [],
        evaluatedAt: "2026-09-30T00:01:00.000Z",
      },
      createdAt: "2026-09-30T00:01:00.000Z",
    },
    ratingChange,
  };
}

export interface Call {
  readonly method: string;
  readonly args: readonly unknown[];
}

/** Hand-written fake API. Each method records its call; override behaviour via `overrides`. */
export function fakeApi(overrides: Partial<FpApi> = {}, active: Session | null = session()): { api: FpApi; calls: Call[] } {
  const calls: Call[] = [];
  const rec =
    <A extends unknown[], R>(method: string, fn: (...args: A) => Promise<R>) =>
    (...args: A): Promise<R> => {
      calls.push({ method, args });
      return fn(...args);
    };
  const base: FpApi = {
    exercise: async (id) => exerciseView(id, id === EX2_ID ? "주문 합계" : "쿠폰 적용하기"),
    trialRun: async () => failingRun,
    revealHint: async (_id, req) => exerciseView().exercise.hints.filter((h) => h.level <= req.level),
    noteOpened: async () => null,
    explanation: async (id) => ({ exerciseId: brand(id), markdown: "map으로 변환합니다.", solutionCode: "pub fn apply(o) { o }" }),
    theoryTopics: async () => exerciseView().theoryTopics.slice(),
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
    startSession: async () => session(0),
    activeSession: async () => active,
    skipItem: async () => session(1),
    recommend: async () => ({ exerciseId: brand(EX2_ID), skillId: brand("data-transform"), kind: "focus", reason: "약한 기술", expectedSuccess: 0.65 }),
    progress: async () => ({
      profile: {
        userId: brand("user-1"),
        language: "gleam",
        estimates: [
          { skillId: brand("data-transform"), language: "gleam", rating: 1216, deviation: 180, ratedObservations: 1, provisional: true, updatedAt: "2026-09-30T00:00:00.000Z" },
        ],
        overall: { rating: 1216, provisional: true, method: "observation_weighted_mean" },
        reviews: [{ skillId: brand("data-transform"), language: "gleam", dueAt: "2026-10-02T00:00:00.000Z", intervalDays: 2 }],
        errorTags: [{ tag: "drops_items_with_filter", count: 2, lastSeenAt: "2026-09-29T00:00:00.000Z" }],
        policyVersion: "elo-v1",
      },
      skills: [{ id: brand("data-transform"), name: "데이터 변환", description: "", track: "core", prerequisites: [], order: 1 }],
    }),
  };
  const merged = { ...base, ...overrides } as Record<string, (...a: unknown[]) => Promise<unknown>>;
  const api = Object.fromEntries(Object.entries(merged).map(([k, fn]) => [k, rec(k, fn)])) as unknown as FpApi;
  return { api, calls };
}
