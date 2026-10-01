/**
 * Lessons contract: the Gleam basics course (docs/design/lessons.md). Lesson exercises are learning steps
 * (unrated, retry without penalty). Unit checkpoints and the placement test are rated: they record observations for
 * the unit's skill in the learner model. Answers are always checked server-side.
 */
import type { AppError, Locale, Result, UserId } from "@fp/kernel";
import type { Lesson, LessonUnitSummary } from "@fp/content/contract";
import type { RatingChange } from "@fp/learner/contract";

export interface UnitProgress {
  readonly unitId: string;
  readonly lessonsCompleted: readonly string[];
  readonly checkpointPassed: boolean;
  /** Best checkpoint score as a fraction 0..1, if attempted. */
  readonly checkpointBest?: number;
  /** True when every prerequisite unit's checkpoint is passed (or implied by placement). Locked units stay openable. */
  readonly unlocked: boolean;
  /** Passed because the placement test implied it. */
  readonly passedByPlacement: boolean;
}

export type NextStep =
  | { readonly kind: "lesson"; readonly unitId: string; readonly lessonId: string }
  | { readonly kind: "checkpoint"; readonly unitId: string }
  | { readonly kind: "done" };

export interface CourseView {
  readonly units: readonly (LessonUnitSummary & { readonly progress: UnitProgress })[];
  readonly placement: PlacementResult | null;
  readonly next: NextStep;
}

export interface LessonView {
  readonly lesson: Lesson;
  /** Exercise ids the learner already answered correctly. */
  readonly solved: readonly string[];
  readonly completed: boolean;
}

export interface AnswerResult {
  readonly correct: boolean;
  /** Revealed only when correct, or after the learner asks (giveUp). */
  readonly correctIndex?: number;
  /** Feedback for the chosen answer (the per-choice explanation, or the "correct" text). */
  readonly feedback: string;
}

/** A rated multiple-choice item (checkpoint or placement). Never contains the answer. */
export interface QuizItem {
  readonly itemId: string;
  readonly unitId: string;
  readonly type: "choice" | "predict";
  readonly prompt: string;
  readonly code?: string;
  readonly choices: readonly string[];
}

export interface Quiz {
  readonly quizId: string;
  readonly kind: "checkpoint" | "placement";
  readonly unitId?: string;
  readonly items: readonly QuizItem[];
  /** Fraction of correct answers needed to pass (checkpoints). */
  readonly passThreshold?: number;
}

export interface QuizItemReview {
  readonly itemId: string;
  readonly chosen: number | null;
  readonly correct: boolean;
  readonly correctIndex: number;
  readonly feedback: string;
  /** "<unitId>/<lessonId>#<exerciseId>" to revisit. */
  readonly backlink: string;
}

export interface CheckpointResult {
  readonly quizId: string;
  readonly unitId: string;
  readonly score: number;
  readonly total: number;
  readonly passed: boolean;
  readonly review: readonly QuizItemReview[];
  readonly ratingChanges: readonly RatingChange[];
}

export type PlacementBand = "beginner" | "intermediate" | "advanced";

export interface PlacementResult {
  readonly quizId: string;
  readonly score: number;
  readonly total: number;
  readonly band: PlacementBand;
  /** Units whose checkpoints are implied as passed. */
  readonly unitsPassed: readonly string[];
  /** advanced -> "training" (go to the core track); otherwise "course". */
  readonly recommendation: "course" | "training";
  readonly review: readonly QuizItemReview[];
  readonly completedAt: string;
}

export interface LessonService {
  course(userId: UserId, locale?: Locale): Promise<CourseView>;
  lesson(userId: UserId, unitId: string, lessonId: string, locale?: Locale): Promise<Result<LessonView, AppError>>;
  /** Unrated; any number of attempts. `giveUp` reveals the answer without counting as solved. */
  answer(
    userId: UserId,
    unitId: string,
    lessonId: string,
    exerciseId: string,
    choice: number | null,
    opts?: { readonly giveUp?: boolean; readonly locale?: Locale },
  ): Promise<Result<AnswerResult, AppError>>;
  completeLesson(userId: UserId, unitId: string, lessonId: string): Promise<Result<UnitProgress, AppError>>;
  startCheckpoint(userId: UserId, unitId: string, locale?: Locale): Promise<Result<Quiz, AppError>>;
  /** Rated: records one observation per item for the unit's skill. Idempotent per quizId. */
  submitCheckpoint(
    userId: UserId,
    quizId: string,
    answers: Readonly<Record<string, number | null>>,
    locale?: Locale,
  ): Promise<Result<CheckpointResult, AppError>>;
  startPlacement(userId: UserId, locale?: Locale): Promise<Result<Quiz, AppError>>;
  submitPlacement(
    userId: UserId,
    quizId: string,
    answers: Readonly<Record<string, number | null>>,
    locale?: Locale,
  ): Promise<Result<PlacementResult, AppError>>;
}

export const LESSON_EVENTS = {
  checkpointPassed: "lessons.checkpoint_passed",
  placementCompleted: "lessons.placement_completed",
} as const;

export interface CheckpointPassedPayload {
  readonly userId: UserId;
  readonly unitId: string;
  readonly score: number;
  readonly total: number;
}

export interface PlacementCompletedPayload {
  readonly userId: UserId;
  readonly band: PlacementBand;
  readonly unitsPassed: readonly string[];
}
