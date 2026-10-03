import type {
  AnswerResult,
  CheckpointResult,
  CourseView,
  ExerciseView,
  LessonView,
  Locale,
  PlacementResult,
  Quiz,
  RatingChange,
  RecallAnswerResult,
  RecallDeckCards,
  RecallOverview,
  RecallResponse,
  RecallSessionView,
  RecallSummary,
  Session,
  SubmissionView,
  TrialRun,
} from "@fp/api-contract";
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
      locales: ["ko"],
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

// ---------- Gleam basics course (content arrives in the learner's locale) ----------

export const UNIT = "u01-values";
export const LESSON = "l01-values-let";
export const LESSON2 = "l02-immutability";

const TEXT: Record<Locale, { unit: string; lesson: string; prose: string; prompt: string; correct: string; wrong: string }> = {
  ko: {
    unit: "값, 불변성, 표현식",
    lesson: "값과 let",
    prose: "프로그램은 **값**을 다룹니다.",
    prompt: "값을 이름에 묶는 문법은?",
    correct: "맞아요! `let`으로 바인딩합니다.",
    wrong: "Gleam에는 `var`가 없습니다.",
  },
  en: {
    unit: "Values, immutability, expressions",
    lesson: "Values and let",
    prose: "Programs work with **values**.",
    prompt: "Which syntax binds a value to a name?",
    correct: "Right! You bind with `let`.",
    wrong: "Gleam has no `var`.",
  },
  zh: {
    unit: "值、不可变性与表达式",
    lesson: "值与 let",
    prose: "程序处理的是**值**。",
    prompt: "把值绑定到名字上的语法是什么？",
    correct: "没错！用 `let` 绑定。",
    wrong: "Gleam 没有 `var`。",
  },
};

export function courseView(locale: Locale = "ko", next: CourseView["next"] = { kind: "lesson", unitId: UNIT, lessonId: LESSON2 }): CourseView {
  return {
    units: [
      {
        id: UNIT,
        title: TEXT[locale].unit,
        order: 1,
        level: 1,
        skill: brand("gleam-basics"),
        prerequisites: [],
        lessonIds: [LESSON, LESSON2],
        lessonTitles: [TEXT[locale].lesson, "불변성"],
        locales: ["ko", "en", "zh"],
        progress: { unitId: UNIT, lessonsCompleted: [LESSON], checkpointPassed: false, checkpointBest: 0.5, unlocked: true, passedByPlacement: false },
      },
    ],
    placement: null,
    next,
  };
}

export function lessonView(locale: Locale = "ko"): LessonView {
  return {
    lesson: {
      id: LESSON,
      unitId: UNIT,
      title: TEXT[locale].lesson,
      tags: [],
      blocks: [
        { kind: "prose", id: "intro", markdown: TEXT[locale].prose },
        { kind: "exercise", id: "bind-syntax", type: "choice", prompt: TEXT[locale].prompt, choices: ["`x = 5`", "`let x = 5`", "`var x = 5`"] },
        { kind: "exercise", id: "let-use", type: "predict", prompt: "`total`?", code: "let total = 100 * 3", choices: ["`3`", "`300`"] },
      ],
    },
    solved: ["let-use"],
    completed: false,
  };
}

/** The fake's correct choice is always index 1. */
export function answerResult(locale: Locale, choice: number | null, giveUp: boolean): AnswerResult {
  const correct = !giveUp && choice === 1;
  return { correct, ...(correct || giveUp ? { correctIndex: 1 } : {}), feedback: correct || giveUp ? TEXT[locale].correct : TEXT[locale].wrong };
}

export function quiz(kind: "checkpoint" | "placement"): Quiz {
  return {
    quizId: kind === "checkpoint" ? "quiz-cp-1" : "quiz-pl-1",
    kind,
    ...(kind === "checkpoint" ? { unitId: UNIT, passThreshold: 0.8 } : {}),
    items: [
      { itemId: "item-a", unitId: UNIT, type: "choice", prompt: "바인딩 문법은?", choices: ["`let x = 1`", "`x := 1`"] },
      { itemId: "item-b", unitId: UNIT, type: "predict", prompt: "결과는?", code: "1 + 2", choices: ["`3`", "`12`"] },
    ],
  };
}

function review(answers: Readonly<Record<string, number | null>>) {
  return ["item-a", "item-b"].map((itemId) => ({
    itemId,
    chosen: answers[itemId] ?? null,
    correct: answers[itemId] === 0,
    correctIndex: 0,
    feedback: `${itemId} 해설`,
    backlink: `${UNIT}/${LESSON}#bind-syntax`,
  }));
}

export function checkpointResult(quizId: string, answers: Readonly<Record<string, number | null>>): CheckpointResult {
  const r = review(answers);
  const score = r.filter((x) => x.correct).length;
  return {
    quizId,
    unitId: UNIT,
    score,
    total: r.length,
    passed: score === r.length,
    review: r,
    ratingChanges: [{ skillId: brand("gleam-basics"), before: 1000, after: score === r.length ? 1032 : 984, provisional: true }],
  };
}

export function placementResult(quizId: string, answers: Readonly<Record<string, number | null>>): PlacementResult {
  const r = review(answers);
  const score = r.filter((x) => x.correct).length;
  const all = score === r.length;
  return {
    quizId,
    score,
    total: r.length,
    band: all ? "advanced" : "beginner",
    unitsPassed: all ? [UNIT] : [],
    recommendation: all ? "training" : "course",
    review: r,
    completedAt: "2026-10-01T00:00:00.000Z",
  };
}

// ---------- recall (cards arrive in the learner's locale; never answers) ----------

export const RECALL_SESSION = "rs-1";
const RECALL_SUMMARY: Record<Locale, string> = {
  ko: "리스트를 왼쪽부터 접어 값 하나로 만듭니다.",
  en: "Folds a list from the left into a single value.",
  zh: "从左到右把列表折叠成一个值。",
};

export function recallOverview(): RecallOverview {
  return {
    decks: [
      { deckId: "syntax", title: "문법", total: 60, seen: 12, mastered: 3, due: 4 },
      { deckId: "stdlib", title: "핵심 라이브러리", total: 50, seen: 5, mastered: 0, due: 1 },
    ],
    dueNow: 5,
    newAvailableToday: 7,
    newPerDay: 10,
  };
}

export function recallCard(locale: Locale = "ko") {
  return {
    id: "stdlib/list-fold",
    deckId: "stdlib",
    title: "list.fold",
    topic: "gleam/list",
    summary: RECALL_SUMMARY[locale],
    example: "list.fold([1, 2, 3], 0, fn(acc, x) { acc + x })  // -> 6",
    imports: ["gleam/list"],
    signature: "list.fold(List(a), from: b, with: fn(b, a) -> b) -> b",
    recognize: { prompt: "`list.fold` 콜백의 인자 순서는?", choices: ["`fn(원소, 누적값)`", "`fn(누적값, 원소)`"] },
    cloze: { prompt: "빈칸을 채우세요.", code: "list.____([1, 2, 3], 0, fn(acc, x) { acc + x })" },
    predict: { prompt: "이 식의 값은?", code: "list.fold([1, 2, 3], 0, fn(acc, x) { acc - x })" },
    produce: { prompt: "합을 돌려주는 본문을 쓰세요.", header: "pub fn total(xs: List(Int)) -> Int", hint: "시작값은 0이에요." },
    locales: ["ko", "en", "zh"] as Locale[],
  };
}

export function recallSession(locale: Locale = "ko"): RecallSessionView {
  const card = recallCard(locale);
  return {
    sessionId: RECALL_SESSION,
    startedAt: "2026-10-03T00:00:00.000Z",
    items: [
      { itemId: "i-new", kind: "new", form: "recognize", card },
      { itemId: "i-cloze", kind: "mix", form: "cloze", card },
      { itemId: "i-predict", kind: "review", form: "predict", card },
      { itemId: "i-produce", kind: "finale", form: "produce", card },
    ],
  };
}

/** Correct answers of the fake: choice 1, fill "fold", value "-6", a body that uses list.fold. */
export function recallAnswerResult(itemId: string, response: RecallResponse): RecallAnswerResult {
  const nextDueAt = "2026-10-05T09:30:00.000Z";
  switch (response.kind) {
    case "choice": {
      const correct = response.choice === 1;
      return { correct, rating: correct ? "good" : "again", feedback: correct ? "맞아요. 누적값이 먼저예요." : "반대예요.", stage: "recognize", nextDueAt };
    }
    case "text": {
      const expected = itemId === "i-cloze" ? "fold" : "-6";
      const correct = response.text === expected;
      return { correct, rating: correct ? "good" : "again", feedback: correct ? "좋아요." : "다시 볼게요.", expected, ...(correct ? {} : { actual: "6" }), stage: "cloze", nextDueAt };
    }
    case "code": {
      const correct = response.body.includes("list.fold");
      return correct
        ? { correct, rating: "easy", feedback: "모든 검사를 통과했어요.", actual: "#(6, 0, 5)", stage: "produce", nextDueAt }
        : {
            correct,
            rating: "again",
            feedback: "검사를 통과하지 못했어요.",
            actual: "#(0, 0, 0)",
            diagnostics: ["warning: unused variable xs"],
            missing: ["list.fold"],
            reference: "list.fold(xs, 0, fn(acc, x) { acc + x })",
            stage: "cloze",
            nextDueAt,
          };
    }
  }
}

export function recallSummary(answered: number): RecallSummary {
  return { sessionId: RECALL_SESSION, answered, correct: Math.min(answered, 3), newLearned: 1, dueTomorrow: 2, decks: recallOverview().decks.slice(1) };
}

export function recallDeckCards(locale: Locale = "ko"): RecallDeckCards {
  return [
    { ...recallCard(locale), state: { stage: "cloze", reps: 3, lapses: 0, dueAt: "2026-10-05T09:30:00.000Z", stabilityDays: 4 } },
    { ...recallCard(locale), id: "stdlib/list-map", title: "list.map", state: null },
  ];
}

export interface Call {
  readonly method: string;
  readonly args: readonly unknown[];
}

/** Hand-written fake API. Each method records its call; override behaviour via `overrides`. `locale` is user.locale. */
export function fakeApi(
  overrides: Partial<FpApi> = {},
  active: Session | null = session(),
  locale: Locale = "ko",
): { api: FpApi; calls: Call[] } {
  const calls: Call[] = [];
  const rec =
    <A extends unknown[], R>(method: string, fn: (...args: A) => Promise<R>) =>
    (...args: A): Promise<R> => {
      calls.push({ method, args });
      return fn(...args);
    };
  const base: FpApi = {
    me: async () => ({ id: brand("user-1"), displayName: "민수", locale, createdAt: "2026-09-30T00:00:00.000Z" }),
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
    course: async () => courseView(locale),
    lesson: async () => lessonView(locale),
    lessonAnswer: async (_u, _l, req) => answerResult(locale, req.choice, req.giveUp ?? false),
    lessonComplete: async (unitId, lessonId) => ({
      unitId,
      lessonsCompleted: [LESSON, lessonId],
      checkpointPassed: false,
      unlocked: true,
      passedByPlacement: false,
    }),
    startCheckpoint: async () => quiz("checkpoint"),
    submitCheckpoint: async (quizId, req) => checkpointResult(quizId, req.answers),
    startPlacement: async () => quiz("placement"),
    submitPlacement: async (quizId, req) => placementResult(quizId, req.answers),
    recallOverview: async () => recallOverview(),
    startRecall: async () => recallSession(locale),
    recallAnswer: async (_s, req) => recallAnswerResult(req.itemId, req.response),
    finishRecall: async () => recallSummary(calls.filter((c) => c.method === "recallAnswer").length),
    recallDeckCards: async () => recallDeckCards(locale),
  };
  const merged = { ...base, ...overrides } as Record<string, (...a: unknown[]) => Promise<unknown>>;
  const api = Object.fromEntries(Object.entries(merged).map(([k, fn]) => [k, rec(k, fn)])) as unknown as FpApi;
  return { api, calls };
}
