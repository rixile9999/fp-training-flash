import { asId, InMemoryEventBus, runMigrations, silentLogger } from "@fp/kernel";
import type { Db, DomainEvent, Locale, SkillId, SubmissionId, UserId } from "@fp/kernel";
import { createFixedClock, createTestDb, type MutableClock } from "@fp/kernel/testing";
import type { ContentCatalog, Lesson, LessonAnswerKey, LessonBlock, LessonUnitSummary } from "@fp/content/contract";
import type { LearnerModel, Observation, RatingChange } from "@fp/learner/contract";
import { createLessonsModule, migrations } from "../src/index.ts";
import type { LessonService, Quiz } from "../src/contract/index.ts";

export const USER = asId<UserId>("u1");
export const OTHER_USER = asId<UserId>("u2");

export interface FakeExercise {
  readonly id: string;
  readonly type: "choice" | "predict";
  /** Correct index among 4 choices. */
  readonly answer: number;
}
export interface FakeLesson {
  readonly id: string;
  readonly exercises: readonly FakeExercise[];
}
export interface FakeUnit {
  readonly id: string;
  readonly order: number;
  readonly level: number;
  readonly skill: string;
  readonly prerequisites: readonly string[];
  readonly lessons: readonly FakeLesson[];
}

const ex = (id: string, type: "choice" | "predict", answer: number): FakeExercise => ({ id, type, answer });

/** ua (L1) -> ub (L2) -> uc (L3) -> ud (L4); ua has 2 lessons x 3 exercises, the others 1 lesson x 4. */
export const UNITS: readonly FakeUnit[] = [
  {
    id: "ua", order: 1, level: 1, skill: "gleam-basics", prerequisites: [],
    lessons: [
      { id: "la1", exercises: [ex("e1", "choice", 1), ex("e2", "predict", 2), ex("e3", "choice", 0)] },
      { id: "la2", exercises: [ex("e1", "predict", 3), ex("e2", "choice", 1), ex("e3", "predict", 2)] },
    ],
  },
  {
    id: "ub", order: 2, level: 2, skill: "gleam-types", prerequisites: ["ua"],
    lessons: [{ id: "lb1", exercises: [ex("e1", "choice", 0), ex("e2", "predict", 1), ex("e3", "choice", 2), ex("e4", "predict", 3)] }],
  },
  {
    id: "uc", order: 3, level: 3, skill: "gleam-lists-recursion", prerequisites: ["ub"],
    lessons: [{ id: "lc1", exercises: [ex("e1", "predict", 1), ex("e2", "choice", 1), ex("e3", "predict", 1), ex("e4", "choice", 1)] }],
  },
  {
    id: "ud", order: 4, level: 4, skill: "gleam-basics", prerequisites: ["uc"],
    lessons: [{ id: "ld1", exercises: [ex("e1", "choice", 2), ex("e2", "predict", 2), ex("e3", "choice", 0), ex("e4", "predict", 0)] }],
  },
];

const tag = (locale: Locale | undefined, text: string): string => (locale === "en" || locale === "zh" ? `[${locale}] ${text}` : text);

/** Prompt carries the exercise ref so tests can find the answer of an opaque quiz item. */
export const promptOf = (unitId: string, lessonId: string, exId: string, locale?: Locale): string =>
  tag(locale, `Q ${unitId}/${lessonId}#${exId}`);

export function answerOfPrompt(prompt: string): { unitId: string; lessonId: string; exerciseId: string; answer: number } {
  const m = /Q (\S+)\/(\S+)#(\S+)$/.exec(prompt);
  if (!m) throw new Error(`bad prompt ${prompt}`);
  const [, unitId, lessonId, exerciseId] = m as unknown as [string, string, string, string];
  const e = UNITS.find((u) => u.id === unitId)?.lessons.find((l) => l.id === lessonId)?.exercises.find((x) => x.id === exerciseId);
  if (!e) throw new Error(`unknown ${prompt}`);
  return { unitId, lessonId, exerciseId, answer: e.answer };
}

/** Choice feedback exists for every wrong index except 3 (exercises generic fallback). */
export function fakeCatalog(units: readonly FakeUnit[] = UNITS): ContentCatalog {
  const summary = (u: FakeUnit, locale?: Locale): LessonUnitSummary => ({
    id: u.id,
    title: tag(locale, `단원 ${u.id}`),
    order: u.order,
    level: u.level,
    skill: asId<SkillId>(u.skill),
    prerequisites: u.prerequisites,
    lessonIds: u.lessons.map((l) => l.id),
    lessonTitles: u.lessons.map((l) => tag(locale, `레슨 ${l.id}`)),
    locales: ["ko", "en", "zh"],
  });
  const find = (unitId: string, lessonId: string) => units.find((u) => u.id === unitId)?.lessons.find((l) => l.id === lessonId);
  const notImplemented = async (): Promise<never> => {
    throw new Error("not used by lessons");
  };
  return {
    listSkills: async () => [],
    getSkill: async () => null,
    listExercises: async () => [],
    getExercise: async () => null,
    getGradingSpec: async () => null,
    getReferenceMaterial: async () => null,
    getConceptNotes: async () => [],
    getTheoryTopics: async () => [],
    listTheoryTopics: async () => [],
    currentBundle: notImplemented,
    // Reverse order on purpose: the service must sort by `order`.
    listLessonUnits: async (locale) => [...units].reverse().map((u) => summary(u, locale)),
    getLesson: async (unitId, lessonId, locale) => {
      const l = find(unitId, lessonId);
      if (!l) return null;
      const blocks: LessonBlock[] = [{ kind: "prose", id: "intro", markdown: tag(locale, "소개") }];
      for (const e of l.exercises) {
        blocks.push({
          kind: "exercise",
          id: e.id,
          type: e.type,
          prompt: promptOf(unitId, lessonId, e.id, locale),
          ...(e.type === "predict" ? { code: "1 + 1" } : {}),
          choices: ["a", "b", "c", "d"],
        });
      }
      return { id: l.id, unitId, title: tag(locale, `레슨 ${l.id}`), tags: [], blocks } satisfies Lesson;
    },
    getLessonAnswer: async (unitId, lessonId, exerciseId, locale) => {
      const e = find(unitId, lessonId)?.exercises.find((x) => x.id === exerciseId);
      if (!e) return null;
      const choiceFeedback: Record<number, string> = {};
      for (const i of [0, 1, 2]) if (i !== e.answer) choiceFeedback[i] = tag(locale, `오답 ${i}`);
      return {
        unitId, lessonId, exerciseId, answer: e.answer,
        correctFeedback: tag(locale, "정답 해설"),
        choiceFeedback,
      } satisfies LessonAnswerKey;
    },
    listRecallDecks: async () => [],
    listRecallCards: async () => [],
    getRecallCard: async () => null,
    getRecallCardKey: async () => null,
  };
}

/** Records observations (deduped per submissionId); each rated one moves the skill rating by +/-10 from 1200. */
export function fakeLearner() {
  const observations: Observation[] = [];
  const changes = new Map<string, RatingChange>();
  const ratings = new Map<string, number>();
  const learner: LearnerModel = {
    getProfile: async () => {
      throw new Error("not used");
    },
    expectedSuccess: async () => 0.5,
    dueReviews: async () => [],
    ratingChangeFor: async (id: SubmissionId) => changes.get(id) ?? null,
    recordObservation: async (obs) => {
      if (observations.some((o) => o.submissionId === obs.submissionId)) return;
      observations.push(obs);
      const before = ratings.get(obs.skillId) ?? 1200;
      const after = before + (obs.success ? 10 : -10);
      ratings.set(obs.skillId, after);
      changes.set(obs.submissionId, { skillId: obs.skillId, before, after, provisional: true });
    },
    replayAll: async () => ({ observations: observations.length, policyVersion: "fake" }),
  };
  return { learner, observations };
}

export interface Harness {
  readonly db: Db;
  readonly clock: MutableClock;
  readonly service: LessonService;
  readonly observations: Observation[];
  readonly events: DomainEvent[];
}

export async function createHarness(units: readonly FakeUnit[] = UNITS): Promise<Harness> {
  const db = await createTestDb();
  await runMigrations(db, "lessons", migrations);
  const clock = createFixedClock();
  const bus = new InMemoryEventBus(silentLogger);
  const events: DomainEvent[] = [];
  for (const type of ["lessons.checkpoint_passed", "lessons.placement_completed"]) {
    bus.subscribe(type, async (e) => {
      events.push(e);
    });
  }
  const { learner, observations } = fakeLearner();
  const { service } = createLessonsModule({ db, clock, events: bus, logger: silentLogger, catalog: fakeCatalog(units), learner });
  return { db, clock, service, observations, events };
}

/** Answers for a quiz: correct where `pick(item, index)` is true, otherwise a wrong index (answer + 1 mod 4). */
export function answersFor(quiz: Quiz, pick: (unitId: string, index: number) => boolean): Record<string, number> {
  const out: Record<string, number> = {};
  quiz.items.forEach((item, i) => {
    const { answer } = answerOfPrompt(item.prompt);
    out[item.itemId] = pick(item.unitId, i) ? answer : (answer + 1) % 4;
  });
  return out;
}

export function unwrap<T>(r: { ok: true; value: T } | { ok: false; error: { message: string } }): T {
  if (!r.ok) throw new Error(`expected ok, got ${r.error.message}`);
  return r.value;
}
