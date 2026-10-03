import { asId, type DomainEvent, type EventBus, type ExerciseId, type SkillId, type SubmissionId, type UserId } from "@fp/kernel";
import type { ContentCatalog, ExerciseDetail, GradingSpec, Skill, SkillTrack } from "@fp/content/contract";
import type { HelpUsed, SubmissionEvaluatedPayload } from "@fp/grading/contract";

export const USER = asId<UserId>("user-1");
export const SKILL_CORE = asId<SkillId>("list-basics");
export const SKILL_ALGO = asId<SkillId>("sorting");
export const SKILL_UNSEEN = asId<SkillId>("pattern-matching");
export const EX_CORE = asId<ExerciseId>("orders-filter/base@1");
export const EX_CORE_2 = asId<ExerciseId>("orders-filter/variant@1");
export const EX_ALGO = asId<ExerciseId>("sort-scores/base@1");

export function skill(id: SkillId, track: SkillTrack, order: number): Skill {
  return { id, name: String(id), description: "", track, prerequisites: [], order };
}

export function exercise(id: ExerciseId, primarySkill: SkillId, difficulty: number): ExerciseDetail {
  return {
    id,
    familyId: asId(String(id).split("/")[0] ?? "f"),
    variantKey: "base",
    version: 1,
    language: "gleam",
    kind: "implement",
    format: "drill",
    title: String(id),
    primarySkill,
    secondarySkills: [],
    difficulty,
    estimatedMinutes: 5,
    contextTags: [],
    source: { kind: "original" },
    locales: ["ko"],
    promptMarkdown: "",
    moduleName: "m",
    starterFiles: [],
    publicTests: [],
    hints: [],
    rubric: [],
    conceptNoteIds: [],
    theoryTopicIds: [],
  };
}

export function gradingSpec(exerciseId: ExerciseId, errorTags: readonly string[]): GradingSpec {
  return {
    exerciseId,
    language: "gleam",
    kind: "implement",
    moduleName: "m",
    testFiles: [],
    supportFiles: [],
    tests: errorTags.map((tag, i) => ({
      id: `T-${i}`,
      functionName: `t${i}_test`,
      name: `t${i}`,
      visibility: "hidden" as const,
      errorTag: tag,
    })),
    requirements: [],
    rubric: [],
    limits: { timeMs: 1000, memoryMb: 128 },
  };
}

export interface FakeCatalog extends ContentCatalog {
  readonly skills: Skill[];
  readonly exercises: Map<string, ExerciseDetail>;
  readonly specs: Map<string, GradingSpec>;
}

export function fakeCatalog(): FakeCatalog {
  const skills = [skill(SKILL_CORE, "core", 1), skill(SKILL_ALGO, "algorithm", 3), skill(SKILL_UNSEEN, "core", 2)];
  const exercises = new Map<string, ExerciseDetail>([
    [EX_CORE, exercise(EX_CORE, SKILL_CORE, 1200)],
    [EX_CORE_2, exercise(EX_CORE_2, SKILL_CORE, 1300)],
    [EX_ALGO, exercise(EX_ALGO, SKILL_ALGO, 1400)],
  ]);
  const specs = new Map<string, GradingSpec>([
    [EX_CORE, gradingSpec(EX_CORE, ["drops_items_with_filter", "wrong_order"])],
    [EX_CORE_2, gradingSpec(EX_CORE_2, ["off_by_one"])],
    [EX_ALGO, gradingSpec(EX_ALGO, [])],
  ]);
  return {
    skills,
    exercises,
    specs,
    listSkills: async () => skills,
    getSkill: async (id) => skills.find((s) => s.id === id) ?? null,
    listExercises: async () => [...exercises.values()],
    getExercise: async (id) => exercises.get(id) ?? null,
    getGradingSpec: async (id) => specs.get(id) ?? null,
    getReferenceMaterial: async () => null,
    getConceptNotes: async () => [],
    getTheoryTopics: async () => [],
    listTheoryTopics: async () => [],
    listLessonUnits: async () => [],
    getLesson: async () => null,
    getLessonAnswer: async () => null,
    listRecallDecks: async () => [],
    listRecallCards: async () => [],
    getRecallCard: async () => null,
    getRecallCardKey: async () => null,
    currentBundle: async () => null,
  };
}

export const NO_HELP: HelpUsed = {
  maxHintLevel: 0,
  conceptNotesOpened: 0,
  theoryNotesOpened: 0,
  explanationViewed: false,
  coachMessages: 0,
};

let counter = 0;

export function evaluated(overrides: Partial<SubmissionEvaluatedPayload> = {}): SubmissionEvaluatedPayload {
  counter += 1;
  const correctness = overrides.correctness ?? true;
  return {
    submissionId: asId<SubmissionId>(`sub-${counter}`),
    userId: USER,
    exerciseId: EX_CORE,
    attemptNo: 1,
    outcome: correctness ? "passed" : "failed_tests",
    correctness,
    efficiency: null,
    errorTags: [],
    helpUsed: NO_HELP,
    evaluatedAt: "2026-09-01T10:00:00.000Z",
    ...overrides,
  };
}

export function evaluatedEvent(payload: SubmissionEvaluatedPayload): DomainEvent<"grading.submission_evaluated", SubmissionEvaluatedPayload> {
  return { id: `evt-${payload.submissionId}`, type: "grading.submission_evaluated", occurredAt: payload.evaluatedAt, payload };
}

/** Bus that records published events and lets tests deliver events to subscribers. */
export function recordingBus(): EventBus & { readonly published: DomainEvent[] } {
  const published: DomainEvent[] = [];
  const handlers = new Map<string, ((e: DomainEvent) => Promise<void>)[]>();
  return {
    published,
    async publish(event) {
      published.push(event);
      for (const h of handlers.get(event.type) ?? []) await h(event);
    },
    subscribe(type, handler) {
      const list = handlers.get(type) ?? [];
      list.push(handler as (e: DomainEvent) => Promise<void>);
      handlers.set(type, list);
      return () => {};
    },
  };
}
