/** LessonService implementation (docs/design/lessons.md). */
import { appError, asId, createEvent, err, newId, ok } from "@fp/kernel";
import type { AppError, Clock, Db, EventBus, ExerciseId, Locale, Logger, Result, SkillId, SubmissionId, UserId } from "@fp/kernel";
import type { ContentCatalog, Lesson, LessonAnswerKey, LessonBlock, LessonUnitSummary } from "@fp/content/contract";
import type { LearnerModel, RatingChange } from "@fp/learner/contract";
import {
  LESSON_EVENTS,
  type AnswerResult,
  type CheckpointPassedPayload,
  type CheckpointResult,
  type CourseView,
  type LessonService,
  type NextStep,
  type PlacementCompletedPayload,
  type PlacementResult,
  type Quiz,
  type QuizItem,
  type QuizItemReview,
  type UnitProgress,
} from "./contract/index.ts";
import { resolveLocale, t, type MessageId } from "./messages.ts";
import {
  CHECKPOINT_PASS_THRESHOLD,
  checkpointPassed,
  itemDifficulty,
  placementBand,
  placementUnitsPassed,
  sampleCheckpoint,
  samplePlacement,
  seededRandom,
  type Candidate,
} from "./sampling.ts";
import { createStore, type GradedItem, type StoredItemRef, type StoredQuiz, type UnitStatusRow } from "./store.ts";

/** An unsubmitted quiz can be submitted for this long after it was started. */
export const QUIZ_TTL_MS = 24 * 60 * 60 * 1000;

export interface LessonServiceDeps {
  readonly db: Db;
  readonly clock: Clock;
  readonly events: EventBus;
  readonly logger: Logger;
  readonly catalog: ContentCatalog;
  readonly learner: LearnerModel;
}

type ExerciseBlock = Extract<LessonBlock, { kind: "exercise" }>;
type Params = Readonly<Record<string, string | number>>;
type Answers = Readonly<Record<string, number | null>>;

export function createLessonService(deps: LessonServiceDeps): LessonService {
  const { catalog, clock, learner, events, logger } = deps;
  const store = createStore(deps.db);

  const fail = (code: AppError["code"], locale: Locale, id: MessageId, params: Params = {}): Result<never, AppError> =>
    err(appError(code, t(locale, id, params), { ...params }));

  async function sortedUnits(locale: Locale): Promise<LessonUnitSummary[]> {
    return [...(await catalog.listLessonUnits(locale))].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  }

  async function loadLesson(
    unitId: string,
    lessonId: string,
    locale: Locale,
  ): Promise<Result<{ unit: LessonUnitSummary; lesson: Lesson }, AppError>> {
    const unit = (await catalog.listLessonUnits(locale)).find((u) => u.id === unitId);
    if (!unit) return fail("not_found", locale, "error.unknownUnit", { unitId });
    const lesson = unit.lessonIds.includes(lessonId) ? await catalog.getLesson(unitId, lessonId, locale) : null;
    if (!lesson) return fail("not_found", locale, "error.unknownLesson", { unitId, lessonId });
    return ok({ unit, lesson });
  }

  function exerciseBlocks(lesson: Lesson): ExerciseBlock[] {
    return lesson.blocks.filter((b): b is ExerciseBlock => b.kind === "exercise");
  }

  // ---------- progress ----------

  const isPassed = (s: UnitStatusRow | undefined): boolean => s !== undefined && (s.checkpointPassed || s.placementPassed);

  function unitProgress(
    unit: LessonUnitSummary,
    known: ReadonlySet<string>,
    completions: ReadonlyMap<string, ReadonlySet<string>>,
    statuses: ReadonlyMap<string, UnitStatusRow>,
  ): UnitProgress {
    const done = completions.get(unit.id) ?? new Set<string>();
    const st = statuses.get(unit.id);
    const own = st?.checkpointPassed ?? false;
    const byPlacement = st?.placementPassed ?? false;
    return {
      unitId: unit.id,
      lessonsCompleted: unit.lessonIds.filter((l) => done.has(l)),
      checkpointPassed: own || byPlacement,
      ...(st?.checkpointBest != null ? { checkpointBest: st.checkpointBest } : {}),
      // Prerequisites missing from the catalog are ignored.
      unlocked: unit.prerequisites.filter((p) => known.has(p)).every((p) => isPassed(statuses.get(p))),
      passedByPlacement: byPlacement && !own,
    };
  }

  async function progressAll(userId: UserId, units: readonly LessonUnitSummary[]): Promise<Map<string, UnitProgress>> {
    const [completions, statuses] = await Promise.all([store.completions(userId), store.unitStatuses(userId)]);
    const known = new Set(units.map((u) => u.id));
    return new Map(units.map((u) => [u.id, unitProgress(u, known, completions, statuses)]));
  }

  function nextStep(units: readonly LessonUnitSummary[], progress: ReadonlyMap<string, UnitProgress>): NextStep {
    for (const unit of units) {
      const p = progress.get(unit.id);
      if (p?.checkpointPassed) continue;
      const lessonId = unit.lessonIds.find((l) => !p?.lessonsCompleted.includes(l));
      return lessonId !== undefined ? { kind: "lesson", unitId: unit.id, lessonId } : { kind: "checkpoint", unitId: unit.id };
    }
    return { kind: "done" };
  }

  // ---------- quizzes ----------

  async function unitCandidates(unit: LessonUnitSummary, locale: Locale): Promise<{ candidates: Candidate[]; blocks: Map<string, ExerciseBlock> }> {
    const lessons = await Promise.all(unit.lessonIds.map((l) => catalog.getLesson(unit.id, l, locale)));
    const candidates: Candidate[] = [];
    const blocks = new Map<string, ExerciseBlock>();
    lessons.forEach((lesson, lessonIndex) => {
      if (!lesson) return;
      exerciseBlocks(lesson).forEach((b, exerciseIndex) => {
        candidates.push({
          unitId: unit.id,
          lessonId: lesson.id,
          exerciseId: b.id,
          type: b.type,
          level: unit.level,
          skillId: unit.skill,
          lessonIndex,
          exerciseIndex,
        });
        blocks.set(refKey(unit.id, lesson.id, b.id), b);
      });
    });
    return { candidates, blocks };
  }

  const refKey = (unitId: string, lessonId: string, exerciseId: string): string => `${unitId}/${lessonId}#${exerciseId}`;

  function toItemRefs(picked: readonly Candidate[]): StoredItemRef[] {
    return picked.map((c, i) => ({
      itemId: `i${i + 1}`,
      unitId: c.unitId,
      lessonId: c.lessonId,
      exerciseId: c.exerciseId,
      type: c.type,
      level: c.level,
      skillId: c.skillId,
    }));
  }

  function toQuizItem(ref: StoredItemRef, block: ExerciseBlock): QuizItem {
    return {
      itemId: ref.itemId,
      unitId: ref.unitId,
      type: block.type,
      prompt: block.prompt,
      ...(block.code !== undefined ? { code: block.code } : {}),
      choices: block.choices,
    };
  }

  /** Loads the quiz if it exists, belongs to `userId` and has `kind`; otherwise one localized not_found. */
  async function ownedQuiz(userId: UserId, quizId: string, kind: StoredQuiz["kind"], locale: Locale): Promise<Result<StoredQuiz, AppError>> {
    const quiz = await store.getQuiz(quizId);
    if (!quiz || quiz.userId !== userId || quiz.kind !== kind) return fail("not_found", locale, "error.quizNotFound", { quizId });
    return ok(quiz);
  }

  async function answerKeys(items: readonly StoredItemRef[], locale: Locale): Promise<(LessonAnswerKey | null)[]> {
    return Promise.all(items.map((i) => catalog.getLessonAnswer(i.unitId, i.lessonId, i.exerciseId, locale)));
  }

  function normaliseChoice(v: unknown): number | null {
    return typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null;
  }

  function grade(items: readonly StoredItemRef[], keys: readonly LessonAnswerKey[], answers: Answers): GradedItem[] {
    return items.map((item, i) => {
      const key = keys[i] as LessonAnswerKey;
      const chosen = normaliseChoice(Object.hasOwn(answers, item.itemId) ? answers[item.itemId] : null);
      return { itemId: item.itemId, chosen, correct: chosen === key.answer, correctIndex: key.answer };
    });
  }

  function feedbackFor(key: LessonAnswerKey | null, chosen: number | null, correct: boolean, locale: Locale): string {
    if (correct) return key?.correctFeedback || t(locale, "feedback.correct");
    if (chosen === null) return t(locale, "feedback.skipped");
    return key?.choiceFeedback[chosen] || t(locale, "feedback.wrong");
  }

  async function review(quiz: StoredQuiz, graded: readonly GradedItem[], locale: Locale): Promise<QuizItemReview[]> {
    const keys = await answerKeys(quiz.items, locale);
    return quiz.items.map((ref, i) => {
      const g = graded.find((x) => x.itemId === ref.itemId) ?? { itemId: ref.itemId, chosen: null, correct: false, correctIndex: 0 };
      return {
        itemId: ref.itemId,
        chosen: g.chosen,
        correct: g.correct,
        correctIndex: g.correctIndex,
        feedback: feedbackFor(keys[i] ?? null, g.chosen, g.correct, locale),
        backlink: refKey(ref.unitId, ref.lessonId, ref.exerciseId),
      };
    });
  }

  const submissionIdOf = (quizId: string, itemId: string): SubmissionId => asId<SubmissionId>(`lesson-quiz:${quizId}:${itemId}`);

  /** Idempotent (learner dedupes per submissionId), so it is safe to repeat on every submit of the same quiz. */
  async function recordObservations(quiz: StoredQuiz, graded: readonly GradedItem[], occurredAt: string): Promise<void> {
    for (const ref of quiz.items) {
      const g = graded.find((x) => x.itemId === ref.itemId);
      await learner.recordObservation({
        submissionId: submissionIdOf(quiz.id, ref.itemId),
        userId: asId<UserId>(quiz.userId),
        exerciseId: asId<ExerciseId>(`lesson:${refKey(ref.unitId, ref.lessonId, ref.exerciseId)}`),
        skillId: asId<SkillId>(ref.skillId),
        language: "gleam",
        difficulty: itemDifficulty(ref.level, ref.type),
        success: g?.correct ?? false,
        rated: true,
        errorTags: [],
        occurredAt,
      });
    }
  }

  /** One change per skill: `before` of its first rated item, `after` of its last. */
  async function ratingChanges(quiz: StoredQuiz): Promise<RatingChange[]> {
    const changes = await Promise.all(quiz.items.map((ref) => learner.ratingChangeFor(submissionIdOf(quiz.id, ref.itemId))));
    const bySkill = new Map<string, RatingChange>();
    for (const c of changes) {
      if (!c) continue;
      const prev = bySkill.get(c.skillId);
      bySkill.set(c.skillId, prev ? { ...c, before: prev.before } : c);
    }
    return [...bySkill.values()];
  }

  /** Expiry check + answer keys for a quiz that has no outcome yet. */
  async function prepareGrading(quiz: StoredQuiz, locale: Locale): Promise<Result<LessonAnswerKey[], AppError>> {
    if (clock.now().getTime() - new Date(quiz.createdAt).getTime() > QUIZ_TTL_MS) {
      return fail("conflict", locale, "error.quizExpired", { quizId: quiz.id });
    }
    const keys = await answerKeys(quiz.items, locale);
    if (keys.some((k) => k === null)) {
      logger.warn("lesson quiz references missing exercises", { quizId: quiz.id });
      return fail("conflict", locale, "error.quizContentChanged", { quizId: quiz.id });
    }
    return ok(keys as LessonAnswerKey[]);
  }

  async function placementView(quiz: StoredQuiz, locale: Locale): Promise<PlacementResult | null> {
    const o = quiz.outcome;
    if (!o || o.kind !== "placement") return null;
    return {
      quizId: quiz.id,
      score: o.score,
      total: o.total,
      band: o.band,
      unitsPassed: o.unitsPassed,
      recommendation: o.recommendation,
      review: await review(quiz, o.items, locale),
      completedAt: quiz.submittedAt ?? quiz.createdAt,
    };
  }

  // ---------- service ----------

  return {
    async course(userId, locale) {
      const loc = resolveLocale(locale);
      const units = await sortedUnits(loc);
      const progress = await progressAll(userId, units);
      const latest = await store.latestPlacement(userId);
      return {
        units: units.map((u) => ({ ...u, progress: progress.get(u.id) as UnitProgress })),
        placement: latest ? await placementView(latest, loc) : null,
        next: nextStep(units, progress),
      } satisfies CourseView;
    },

    async lesson(userId, unitId, lessonId, locale) {
      const loc = resolveLocale(locale);
      const found = await loadLesson(unitId, lessonId, loc);
      if (!found.ok) return found;
      const { lesson } = found.value;
      const [solved, completed] = await Promise.all([
        store.solvedExercises(userId, unitId, lessonId),
        store.isCompleted(userId, unitId, lessonId),
      ]);
      return ok({ lesson, solved: exerciseBlocks(lesson).map((b) => b.id).filter((id) => solved.has(id)), completed });
    },

    async answer(userId, unitId, lessonId, exerciseId, choice, opts = {}) {
      const loc = resolveLocale(opts.locale);
      const found = await loadLesson(unitId, lessonId, loc);
      if (!found.ok) return found;
      const block = exerciseBlocks(found.value.lesson).find((b) => b.id === exerciseId);
      const key = block ? await catalog.getLessonAnswer(unitId, lessonId, exerciseId, loc) : null;
      if (!block || !key) return fail("not_found", loc, "error.unknownExercise", { exerciseId });
      if (opts.giveUp) {
        return ok({ correct: false, correctIndex: key.answer, feedback: key.correctFeedback || t(loc, "feedback.correct") });
      }
      if (choice === null || choice === undefined) return fail("invalid_input", loc, "error.choiceRequired");
      if (!Number.isInteger(choice) || choice < 0 || choice >= block.choices.length) {
        return fail("invalid_input", loc, "error.invalidChoice", { choice: String(choice) });
      }
      if (choice === key.answer) {
        await store.markSolved(userId, unitId, lessonId, exerciseId, clock.now().toISOString());
        return ok({ correct: true, correctIndex: key.answer, feedback: feedbackFor(key, choice, true, loc) } satisfies AnswerResult);
      }
      return ok({ correct: false, feedback: feedbackFor(key, choice, false, loc) } satisfies AnswerResult);
    },

    async completeLesson(userId, unitId, lessonId) {
      const loc = resolveLocale(undefined);
      const units = await sortedUnits(loc);
      const unit = units.find((u) => u.id === unitId);
      if (!unit) return fail("not_found", loc, "error.unknownUnit", { unitId });
      if (!unit.lessonIds.includes(lessonId)) return fail("not_found", loc, "error.unknownLesson", { unitId, lessonId });
      await store.markCompleted(userId, unitId, lessonId, clock.now().toISOString());
      const progress = await progressAll(userId, units);
      return ok(progress.get(unitId) as UnitProgress);
    },

    async startCheckpoint(userId, unitId, locale) {
      const loc = resolveLocale(locale);
      const unit = (await catalog.listLessonUnits(loc)).find((u) => u.id === unitId);
      if (!unit) return fail("not_found", loc, "error.unknownUnit", { unitId });
      const { candidates, blocks } = await unitCandidates(unit, loc);
      if (candidates.length === 0) return fail("invalid_input", loc, "error.noCheckpointItems", { unitId });
      const attempt = await store.countQuizzes(userId, "checkpoint", unitId);
      const picked = sampleCheckpoint(candidates, seededRandom(`${userId}|checkpoint|${unitId}|${attempt}`));
      const refs = toItemRefs(picked);
      const quizId = newId();
      await store.insertQuiz({ id: quizId, userId, kind: "checkpoint", unitId, items: refs, createdAt: clock.now().toISOString() });
      return ok({
        quizId,
        kind: "checkpoint",
        unitId,
        items: refs.map((r) => toQuizItem(r, blocks.get(refKey(r.unitId, r.lessonId, r.exerciseId)) as ExerciseBlock)),
        passThreshold: CHECKPOINT_PASS_THRESHOLD,
      } satisfies Quiz);
    },

    async submitCheckpoint(userId, quizId, answers, locale) {
      const loc = resolveLocale(locale);
      const found = await ownedQuiz(userId, quizId, "checkpoint", loc);
      if (!found.ok) return found;
      let quiz = found.value;
      let claimed = false;
      if (!quiz.outcome) {
        const keys = await prepareGrading(quiz, loc);
        if (!keys.ok) return keys;
        const graded = grade(quiz.items, keys.value, answers);
        const score = graded.filter((g) => g.correct).length;
        const total = graded.length;
        const outcome = { kind: "checkpoint" as const, items: graded, score, total, passed: checkpointPassed(score, total) };
        claimed = await store.claimOutcome(quiz, outcome, clock.now().toISOString());
        quiz = (await store.getQuiz(quizId)) as StoredQuiz;
      }
      const o = quiz.outcome;
      if (!o || o.kind !== "checkpoint" || quiz.unitId === null) throw new Error(`checkpoint ${quizId} has no outcome`);
      await recordObservations(quiz, o.items, quiz.submittedAt as string);
      if (claimed && o.passed) {
        const payload: CheckpointPassedPayload = { userId, unitId: quiz.unitId, score: o.score, total: o.total };
        await events.publish(createEvent(LESSON_EVENTS.checkpointPassed, payload, clock));
      }
      return ok({
        quizId,
        unitId: quiz.unitId,
        score: o.score,
        total: o.total,
        passed: o.passed,
        review: await review(quiz, o.items, loc),
        ratingChanges: await ratingChanges(quiz),
      } satisfies CheckpointResult);
    },

    async startPlacement(userId, locale) {
      const loc = resolveLocale(locale);
      const units = await sortedUnits(loc);
      const perUnit = await Promise.all(units.map((u) => unitCandidates(u, loc)));
      const blocks = new Map(perUnit.flatMap((p) => [...p.blocks]));
      const attempt = await store.countQuizzes(userId, "placement", null);
      const picked = samplePlacement(
        units.map((u, i) => ({ unitId: u.id, order: u.order, level: u.level, candidates: perUnit[i]?.candidates ?? [] })),
        seededRandom(`${userId}|placement|${attempt}`),
      );
      if (picked.length === 0) return fail("invalid_input", loc, "error.noPlacementItems");
      const refs = toItemRefs(picked);
      const quizId = newId();
      await store.insertQuiz({ id: quizId, userId, kind: "placement", unitId: null, items: refs, createdAt: clock.now().toISOString() });
      return ok({
        quizId,
        kind: "placement",
        items: refs.map((r) => toQuizItem(r, blocks.get(refKey(r.unitId, r.lessonId, r.exerciseId)) as ExerciseBlock)),
      } satisfies Quiz);
    },

    async submitPlacement(userId, quizId, answers, locale) {
      const loc = resolveLocale(locale);
      const found = await ownedQuiz(userId, quizId, "placement", loc);
      if (!found.ok) return found;
      let quiz = found.value;
      let claimed = false;
      if (!quiz.outcome) {
        const keys = await prepareGrading(quiz, loc);
        if (!keys.ok) return keys;
        const graded = grade(quiz.items, keys.value, answers);
        const levelItems = quiz.items.map((ref, i) => ({ unitId: ref.unitId, level: ref.level, correct: graded[i]?.correct ?? false }));
        const band = placementBand(levelItems);
        const units = await sortedUnits(loc);
        const outcome = {
          kind: "placement" as const,
          items: graded,
          score: graded.filter((g) => g.correct).length,
          total: graded.length,
          band,
          unitsPassed: placementUnitsPassed(band, units, levelItems),
          recommendation: band === "advanced" ? ("training" as const) : ("course" as const),
        };
        claimed = await store.claimOutcome(quiz, outcome, clock.now().toISOString());
        quiz = (await store.getQuiz(quizId)) as StoredQuiz;
      }
      const o = quiz.outcome;
      if (!o || o.kind !== "placement") throw new Error(`placement ${quizId} has no outcome`);
      await recordObservations(quiz, o.items, quiz.submittedAt as string);
      if (claimed) {
        const payload: PlacementCompletedPayload = { userId, band: o.band, unitsPassed: o.unitsPassed };
        await events.publish(createEvent(LESSON_EVENTS.placementCompleted, payload, clock));
      }
      return ok((await placementView(quiz, loc)) as PlacementResult);
    },
  };
}
