import { asId, createEvent, InMemoryEventBus, runMigrations } from "@fp/kernel";
import type { Db, DomainEvent, ExerciseId, FamilyId, Logger, SessionId, SkillId, SubmissionId, UserId } from "@fp/kernel";
import { createFixedClock, createTestDb, type MutableClock } from "@fp/kernel/testing";
import type { ContentCatalog, ExerciseDetail, ExerciseSummary, Skill } from "@fp/content/contract";
import type { EvaluationOutcome, SubmissionEvaluatedPayload } from "@fp/grading/contract";
import type { LearnerModel, ReviewItem, SkillEstimate } from "@fp/learner/contract";
import { createSessionsModule, migrations } from "../src/index.ts";
import type { SessionService } from "../src/contract/index.ts";

export const USER = asId<UserId>("u1");
export const OTHER_USER = asId<UserId>("u2");
export const sk = (id: string): SkillId => asId<SkillId>(id);
export const exId = (id: string): ExerciseId => asId<ExerciseId>(id);

export function skill(id: string, order: number, prerequisites: string[] = [], track: Skill["track"] = "core"): Skill {
  return { id: sk(id), name: `기술-${id}`, description: "", track, prerequisites: prerequisites.map(sk), order };
}

export function exercise(
  family: string,
  variant: string,
  skillId: string,
  opts: Partial<Pick<ExerciseSummary, "difficulty" | "estimatedMinutes" | "contextTags" | "format" | "title">> = {},
): ExerciseSummary {
  return {
    id: exId(`${family}/${variant}@1`),
    familyId: asId<FamilyId>(family),
    variantKey: variant,
    version: 1,
    language: "gleam",
    kind: "implement",
    format: opts.format ?? "drill",
    title: opts.title ?? `${family}-${variant}`,
    primarySkill: sk(skillId),
    secondarySkills: [],
    difficulty: opts.difficulty ?? 1200,
    estimatedMinutes: opts.estimatedMinutes ?? 4,
    contextTags: opts.contextTags ?? [],
    source: { kind: "original" },
  };
}

export function fakeCatalog(skills: Skill[], exercises: ExerciseSummary[]): ContentCatalog {
  return {
    listSkills: async () => skills,
    getSkill: async (id) => skills.find((s) => s.id === id) ?? null,
    listExercises: async (f = {}) =>
      exercises.filter(
        (e) =>
          (f.language === undefined || e.language === f.language) &&
          (f.skill === undefined || e.primarySkill === f.skill) &&
          (f.format === undefined || e.format === f.format) &&
          (f.familyId === undefined || e.familyId === f.familyId) &&
          (f.kind === undefined || e.kind === f.kind),
      ),
    getExercise: async (id) => {
      const e = exercises.find((x) => x.id === id);
      if (!e) return null;
      const detail: ExerciseDetail = {
        ...e, promptMarkdown: "", moduleName: "m", starterFiles: [], publicTests: [], hints: [], rubric: [],
        conceptNoteIds: [], theoryTopicIds: [],
      };
      return detail;
    },
    getGradingSpec: async () => null,
    getReferenceMaterial: async () => null,
    getConceptNotes: async () => [],
    getTheoryTopics: async () => [],
    listTheoryTopics: async () => [],
    currentBundle: async () => null,
  };
}

export interface FakeLearnerState {
  estimates: Partial<SkillEstimate>[];
  reviews: ReviewItem[];
  /** Optional explicit expected-success table by difficulty. */
  esByDifficulty?: Record<number, number>;
}

export function estimate(skillId: string, rating: number, extra: Partial<SkillEstimate> = {}): SkillEstimate {
  return {
    skillId: sk(skillId), language: "gleam", rating, deviation: 100, ratedObservations: 5, provisional: false,
    updatedAt: "2026-09-01T00:00:00.000Z", ...extra,
  };
}

export function review(skillId: string, dueAt: string): ReviewItem {
  return { skillId: sk(skillId), language: "gleam", dueAt, intervalDays: 3 };
}

export function fakeLearner(state: FakeLearnerState): LearnerModel {
  const rating = (s: SkillId) => state.estimates.find((e) => e.skillId === s)?.rating ?? 1200;
  return {
    getProfile: async (userId, language) => ({
      userId, language, estimates: state.estimates as SkillEstimate[], overall: null, reviews: state.reviews,
      errorTags: [], policyVersion: "test",
    }),
    expectedSuccess: async (_u, skillId, _l, difficulty) =>
      state.esByDifficulty?.[difficulty] ?? 1 / (1 + 10 ** ((difficulty - rating(skillId)) / 400)),
    dueReviews: async (_u, _l, at) => state.reviews.filter((r) => Date.parse(r.dueAt) <= at.getTime()),
    ratingChangeFor: async () => null,
    recordObservation: async () => {},
    replayAll: async () => ({ observations: 0, policyVersion: "test" }),
  };
}

export interface Harness {
  db: Db;
  clock: MutableClock;
  bus: InMemoryEventBus;
  service: SessionService;
  learnerState: FakeLearnerState;
  published: DomainEvent[];
  handlerErrors: unknown[];
  evaluate(
    exerciseId: string,
    outcome: EvaluationOutcome,
    opts?: { submissionId?: string; sessionId?: SessionId; userId?: UserId },
  ): Promise<void>;
}

let seq = 0;

export async function setup(skills: Skill[], exercises: ExerciseSummary[], learner: Partial<FakeLearnerState> = {}): Promise<Harness> {
  const db = await createTestDb();
  await runMigrations(db, "sessions", migrations);
  const clock = createFixedClock("2026-09-30T09:00:00.000Z");
  const handlerErrors: unknown[] = [];
  const logger: Logger = { info: () => {}, warn: () => {}, error: (_m, f) => handlerErrors.push(f) };
  const bus = new InMemoryEventBus(logger);
  const published: DomainEvent[] = [];
  bus.subscribe("sessions.session_completed", async (e) => {
    published.push(e);
  });
  const learnerState: FakeLearnerState = { estimates: [], reviews: [], ...learner };
  const { service } = createSessionsModule({
    db, clock, events: bus, logger, catalog: fakeCatalog(skills, exercises), learner: fakeLearner(learnerState),
  });
  return {
    db, clock, bus, service, learnerState, published, handlerErrors,
    evaluate: async (exerciseId, outcome, opts = {}) => {
      const payload: SubmissionEvaluatedPayload = {
        submissionId: asId<SubmissionId>(opts.submissionId ?? `sub-${++seq}`),
        userId: opts.userId ?? USER,
        exerciseId: exId(exerciseId),
        ...(opts.sessionId ? { sessionId: opts.sessionId } : {}),
        attemptNo: 1,
        outcome,
        correctness: outcome === "passed",
        efficiency: null,
        errorTags: [],
        helpUsed: { maxHintLevel: 0, conceptNotesOpened: 0, theoryNotesOpened: 0, explanationViewed: false, coachMessages: 0 },
        evaluatedAt: clock.now().toISOString(),
      };
      await bus.publish(createEvent("grading.submission_evaluated", payload, clock));
    },
  };
}
