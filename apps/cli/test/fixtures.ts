import type {
  AnswerResult,
  CheckpointResult,
  CourseView,
  ExerciseView,
  LessonView,
  Locale,
  PlacementResult,
  Quiz,
  RecallAnswerResult,
  RecallOverview,
  RecallResponse,
  RecallSessionView,
  RecallSummary,
  Session,
  SubmissionView,
  TrialRun,
} from "@fp/api-contract";
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

// ---------- Gleam basics course (content arrives in the account locale) ----------

export const UNIT = "u01-values";
export const UNIT2 = "u02-functions-pipes";
export const LESSON = "l01-values-let";
export const LESSON2 = "l02-immutability";

const LESSON_TITLE: Record<Locale, string> = { ko: "값과 let", en: "Values and let", zh: "值与 let" };
const PROSE: Record<Locale, string> = {
  ko: "프로그램은 **값**을 다룹니다. `let`으로 값에 *이름*을 붙여요.\n\n```gleam\nlet pi = 3.14\n```\n\n자세히: [Gleam 투어](https://tour.gleam.run)",
  en: "Programs work with **values**. You name a value with `let`.\n\n```gleam\nlet pi = 3.14\n```",
  zh: "程序处理的是**值**。用 `let` 给值起名字。\n\n```gleam\nlet pi = 3.14\n```",
};
const PROMPT: Record<Locale, string> = {
  ko: "함수 본문 안에서 값을 이름에 묶는 문법은?",
  en: "Which syntax binds a value to a name inside a function body?",
  zh: "在函数体内把值绑定到名字上的语法是什么？",
};
const FEEDBACK: Record<Locale, { correct: string; wrong: string }> = {
  ko: { correct: "맞아요! `let`으로 바인딩합니다.", wrong: "Gleam에는 `var`가 없습니다." },
  en: { correct: "Right! You bind with `let`.", wrong: "Gleam has no `var`." },
  zh: { correct: "没错！用 `let` 绑定。", wrong: "Gleam 没有 `var`。" },
};

export function courseView(locale: Locale = "ko", next: CourseView["next"] = { kind: "lesson", unitId: UNIT, lessonId: LESSON2 }): CourseView {
  const unit = (id: string, order: number, title: string, lessons: readonly string[], completed: readonly string[], unlocked: boolean) => ({
    id,
    title,
    order,
    level: 1,
    skill: brand<CourseView["units"][number]["skill"]>("gleam-basics"),
    prerequisites: order === 1 ? [] : [UNIT],
    lessonIds: lessons,
    lessonTitles: lessons.map((l) => (l === LESSON ? LESSON_TITLE[locale] : `${l}-title`)),
    locales: ["ko", "en", "zh"] as Locale[],
    progress: { unitId: id, lessonsCompleted: completed, checkpointPassed: false, unlocked, passedByPlacement: false },
  });
  return {
    units: [
      unit(UNIT2, 2, locale === "ko" ? "함수와 파이프" : locale === "en" ? "Functions and pipes" : "函数与管道", ["l01-functions"], [], false),
      unit(UNIT, 1, locale === "ko" ? "값, 불변성, 표현식" : locale === "en" ? "Values, immutability, expressions" : "值、不可变性与表达式", [LESSON, LESSON2], [LESSON], true),
    ],
    placement: null,
    next,
  };
}

export function lessonView(locale: Locale = "ko", solved: readonly string[] = []): LessonView {
  return {
    lesson: {
      id: LESSON,
      unitId: UNIT,
      title: LESSON_TITLE[locale],
      tags: ["concept:basics"],
      blocks: [
        { kind: "prose", id: "intro", markdown: PROSE[locale] },
        { kind: "exercise", id: "bind-syntax", type: "choice", prompt: PROMPT[locale], choices: ["`x = 5`", "`let x = 5`", "`var x = 5`"] },
        { kind: "exercise", id: "let-use", type: "predict", prompt: "`total`?", code: "let total = 100 * 3", choices: ["`3`", "`300`"] },
      ],
    },
    solved,
    completed: false,
  };
}

/** Correct answers of the fake lesson: bind-syntax -> 1, let-use -> 1. */
export function answerResult(locale: Locale, choice: number | null, giveUp: boolean): AnswerResult {
  const correct = !giveUp && choice === 1;
  return {
    correct,
    ...(correct || giveUp ? { correctIndex: 1 } : {}),
    feedback: correct || giveUp ? FEEDBACK[locale].correct : FEEDBACK[locale].wrong,
  };
}

export function quiz(kind: "checkpoint" | "placement" = "checkpoint"): Quiz {
  return {
    quizId: kind === "checkpoint" ? "quiz-cp-1" : "quiz-pl-1",
    kind,
    ...(kind === "checkpoint" ? { unitId: UNIT, passThreshold: 0.8 } : {}),
    items: [
      { itemId: "item-a", unitId: UNIT, type: "choice", prompt: "**바인딩** 문법은?", choices: ["`let x = 1`", "`x := 1`", "`var x = 1`"] },
      { itemId: "item-b", unitId: UNIT, type: "predict", prompt: "결과는?", code: "1 + 2", choices: ["`3`", "`12`"] },
    ],
  };
}

const review = (answers: Readonly<Record<string, number | null>>) => [
  { itemId: "item-a", chosen: answers["item-a"] ?? null, correct: answers["item-a"] === 0, correctIndex: 0, feedback: "`let`을 씁니다.", backlink: `${UNIT}/${LESSON}#bind-syntax` },
  { itemId: "item-b", chosen: answers["item-b"] ?? null, correct: answers["item-b"] === 0, correctIndex: 0, feedback: "정수 덧셈입니다.", backlink: `${UNIT}/${LESSON2}#plus` },
];

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
    ratingChanges: score === r.length ? [{ skillId: brand("gleam-basics"), before: 1000, after: 1040.4, provisional: true }] : [],
  };
}

export function placementResult(quizId: string, answers: Readonly<Record<string, number | null>>): PlacementResult {
  const r = review(answers);
  const score = r.filter((x) => x.correct).length;
  return {
    quizId,
    score,
    total: r.length,
    band: score === r.length ? "advanced" : "beginner",
    unitsPassed: score === r.length ? [UNIT, UNIT2] : [],
    recommendation: score === r.length ? "training" : "course",
    review: r,
    completedAt: "2026-10-01T00:00:00.000Z",
  };
}

// ---------- recall (cards arrive in the account locale) ----------

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

export function recallSession(locale: Locale = "ko"): RecallSessionView {
  const card = {
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
  const nextDueAt = "2026-10-05T00:00:00.000Z";
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
