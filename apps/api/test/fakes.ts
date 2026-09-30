/** Hand-written fakes of the module contracts used by app.ts tests. Every call is recorded in `calls`. */
import { appError, asId, err, ok } from "@fp/kernel";
import type { Clock, ExerciseId, SessionId, SubmissionId, UserId } from "@fp/kernel";
import type { AccountsService, User } from "@fp/accounts/contract";
import type { ContentCatalog, ExerciseDetail } from "@fp/content/contract";
import type { GradingService, HelpUsed, Submission } from "@fp/grading/contract";
import type { LearnerModel, LearnerProfile } from "@fp/learner/contract";
import type { Session, SessionService } from "@fp/sessions/contract";
import type { CoachingService } from "@fp/coaching/contract";
import type { AppServices } from "../src/app.ts";

export const EXERCISE_ID = asId<ExerciseId>("orders-apply-coupon/base@1");
export const PREDICT_ID = asId<ExerciseId>("pipes-predict/base@2");
export const TOKEN = "tok-minsu";
export const OTHER_TOKEN = "tok-jiwoo";

export const USER: User = { id: asId<UserId>("u-minsu"), displayName: "민수", createdAt: "2026-01-01T00:00:00.000Z" };
export const OTHER_USER: User = { id: asId<UserId>("u-jiwoo"), displayName: "지우", createdAt: "2026-01-01T00:00:00.000Z" };

export function makeExercise(id: ExerciseId, extra: Partial<ExerciseDetail> = {}): ExerciseDetail {
  return {
    id,
    familyId: asId("orders-apply-coupon"),
    variantKey: "base",
    version: 1,
    language: "gleam",
    kind: "implement",
    format: "drill",
    title: "쿠폰 적용",
    primarySkill: asId("data-transform"),
    secondarySkills: [],
    difficulty: 1200,
    estimatedMinutes: 5,
    contextTags: ["orders"],
    source: { kind: "original" },
    promptMarkdown: "주문에 쿠폰을 적용하세요.",
    moduleName: "coupon",
    starterFiles: [{ path: "src/coupon.gleam", content: "pub fn apply() { todo }" }],
    publicTests: [],
    hints: [
      { level: 1, kind: "question", markdown: "힌트 1" },
      { level: 2, kind: "concept", markdown: "힌트 2" },
      { level: 3, kind: "approach", markdown: "힌트 3" },
    ],
    rubric: [],
    conceptNoteIds: [asId("list-map")],
    theoryTopicIds: [asId("functor")],
    ...extra,
  };
}

export const NO_HELP: HelpUsed = {
  maxHintLevel: 0,
  conceptNotesOpened: 0,
  theoryNotesOpened: 0,
  explanationViewed: false,
  coachMessages: 0,
};

export function makeSubmission(id: string, extra: Partial<Submission> = {}): Submission {
  return {
    id: asId<SubmissionId>(id),
    userId: USER.id,
    exerciseId: EXERCISE_ID,
    attemptNo: 1,
    code: "pub fn apply() { 1 }",
    helpUsed: NO_HELP,
    status: "completed",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...extra,
  };
}

export function makeSession(id: string): Session {
  return {
    id: asId<SessionId>(id),
    userId: USER.id,
    language: "gleam",
    status: "active",
    targetMinutes: 15,
    startedAt: "2026-01-01T00:00:00.000Z",
    items: [],
    currentIndex: null,
  };
}

export interface MutableClock extends Clock {
  advance(ms: number): void;
}

export function fakeClock(start = Date.parse("2026-01-01T00:00:00.000Z")): MutableClock {
  let t = start;
  return { now: () => new Date(t), advance: (ms) => (t += ms) };
}

export type Call = { readonly method: string; readonly args: readonly unknown[] };

export interface Fakes {
  readonly services: AppServices;
  readonly calls: Call[];
  /** Help ledger state returned by coaching.helpUsed. */
  helpUsed: HelpUsed;
}

type Overrides = {
  accounts?: Partial<AccountsService>;
  catalog?: Partial<ContentCatalog>;
  grading?: Partial<GradingService>;
  learner?: Partial<LearnerModel>;
  sessions?: Partial<SessionService>;
  coaching?: Partial<CoachingService>;
};

/** Wraps every method so calls are recorded as "<service>.<method>". */
function recorded<T extends object>(name: string, impl: T, calls: Call[]): T {
  const out: Record<string, unknown> = {};
  for (const [key, fn] of Object.entries(impl)) {
    out[key] = (...args: unknown[]) => {
      calls.push({ method: `${name}.${key}`, args });
      return (fn as (...a: unknown[]) => unknown)(...args);
    };
  }
  return out as T;
}

export function makeFakes(overrides: Overrides = {}): Fakes {
  const calls: Call[] = [];
  const exercises = new Map<string, ExerciseDetail>([
    [EXERCISE_ID, makeExercise(EXERCISE_ID)],
    [
      PREDICT_ID,
      makeExercise(PREDICT_ID, {
        kind: "predict",
        predict: { code: "[1, 2] |> list.map(fn(x) { x * 2 })", acceptedAnswers: ["[2, 4]"] },
      }),
    ],
  ]);
  const fakes: Fakes = { calls, helpUsed: NO_HELP, services: undefined as unknown as AppServices };

  const accounts: AccountsService = {
    devLogin: async (displayName) =>
      ok({
        user: { ...USER, displayName },
        token: { token: TOKEN, tokenId: "t1", label: "dev", createdAt: USER.createdAt },
      }),
    getUser: async (id) => (id === USER.id ? USER : null),
    issueToken: async (_u, label) => ok({ token: "tok-new", tokenId: "t2", label, createdAt: USER.createdAt }),
    listTokens: async () => [{ tokenId: "t1", label: "dev", createdAt: USER.createdAt }],
    revokeToken: async (_u, tokenId) => (tokenId === "t1" ? ok(undefined) : err(appError("not_found", "토큰 없음"))),
    authenticate: async (token) => (token === TOKEN ? USER : token === OTHER_TOKEN ? OTHER_USER : null),
    ...overrides.accounts,
  };

  const catalog: ContentCatalog = {
    listSkills: async () => [
      { id: asId("data-transform"), name: "데이터 변환", description: "", track: "core", prerequisites: [], order: 1 },
    ],
    getSkill: async () => null,
    listExercises: async () => [...exercises.values()],
    getExercise: async (id) => exercises.get(id) ?? null,
    getGradingSpec: async () => null,
    getReferenceMaterial: async () => null,
    getConceptNotes: async (ids) =>
      ids.map((id) => ({ id, language: "gleam", title: "list.map", markdown: "노트", source: { kind: "original" } })),
    getTheoryTopics: async (ids) =>
      ids.map((id) => ({ id, title: "펑터", level: "basic", markdown: "이론", relatedSkills: [], furtherReading: [] })),
    listTheoryTopics: async () => [],
    currentBundle: async () => ({ bundleId: "b-1", contentHash: "h", importedAt: USER.createdAt, exerciseCount: 2 }),
    ...overrides.catalog,
  };

  const grading: GradingService = {
    evaluateSnippet: async () => ok({ kind: "value" as const, value: "[2, 4]" }),
    submit: async (req) =>
      ok(
        makeSubmission("s-1", {
          userId: req.userId,
          exerciseId: req.exerciseId,
          code: req.code,
          helpUsed: req.helpUsed,
          ...(req.sessionId === undefined ? {} : { sessionId: req.sessionId }),
        }),
      ),
    trialRun: async () => ok({ outcome: "passed", compileDiagnostics: [], tests: [] }),
    getSubmission: async (id, userId) => (id === "s-1" && userId === USER.id ? makeSubmission("s-1") : null),
    listSubmissions: async () => [],
    ...overrides.grading,
  };

  const learner: LearnerModel = {
    getProfile: async (userId, language): Promise<LearnerProfile> => ({
      userId,
      language,
      estimates: [],
      overall: null,
      reviews: [],
      errorTags: [],
      policyVersion: "elo-v1",
    }),
    expectedSuccess: async () => 0.5,
    dueReviews: async () => [],
    ratingChangeFor: async (id) =>
      id === "s-1" ? { skillId: asId("data-transform"), before: 1200, after: 1216, provisional: true } : null,
    recordObservation: async () => {},
    replayAll: async () => ({ observations: 0, policyVersion: "elo-v1" }),
    ...overrides.learner,
  };

  const sessions: SessionService = {
    start: async () => ok(makeSession("sess-1")),
    get: async (id) => (id === "sess-1" ? makeSession("sess-1") : null),
    active: async () => makeSession("sess-active"),
    skip: async (id) => ok(makeSession(id)),
    complete: async (id) =>
      ok({ sessionId: id, passed: 1, failed: 0, fixedAfterFeedback: 0, skillsPracticed: [], nextReviews: [] }),
    recommend: async (_u, _l, skill) =>
      ok({
        exerciseId: EXERCISE_ID,
        skillId: skill ?? asId("data-transform"),
        kind: "focus",
        reason: "집중 연습",
        expectedSuccess: 0.6,
      }),
    ...overrides.sessions,
  };

  const coaching: CoachingService = {
    feedback: async (submissionId) =>
      ok({
        submissionId,
        summary: "통과했습니다.",
        evidence: [],
        priorities: [],
        nextAction: "다음 문제로 넘어가세요.",
        rubricNotes: [],
        source: "rule_based",
        promptVersion: "v1",
        createdAt: USER.createdAt,
      }),
    chat: async () => ok({ message: { role: "assistant", content: "어떤 부분이 막히나요?" }, references: [], source: "rule_based" }),
    revealHint: async (_u, exerciseId, level) => {
      const ex = exercises.get(exerciseId);
      return ex ? ok(ex.hints.filter((h) => h.level <= level)) : err(appError("not_found", "문제 없음"));
    },
    revealExplanation: async (_u, exerciseId) => ok({ exerciseId, markdown: "해설", solutionCode: "pub fn apply() { 1 }" }),
    recordHelp: async () => {},
    helpUsed: async () => fakes.helpUsed,
    ...overrides.coaching,
  };

  const services: AppServices = {
    accounts: recorded("accounts", accounts, calls),
    catalog: recorded("catalog", catalog, calls),
    grading: recorded("grading", grading, calls),
    learner: recorded("learner", learner, calls),
    sessions: recorded("sessions", sessions, calls),
    coaching: recorded("coaching", coaching, calls),
  };
  (fakes as { services: AppServices }).services = services;
  return fakes;
}

export function callsTo(fakes: Fakes, method: string): readonly (readonly unknown[])[] {
  return fakes.calls.filter((c) => c.method === method).map((c) => c.args);
}
