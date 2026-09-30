/**
 * Learner model contract: per-skill Elo estimates, review schedule, recurring error tags.
 * Fed by `grading.submission_evaluated`. All derived state can be recomputed from the stored
 * observation log (replay), so rating policies can be replaced and re-run.
 */
import type { ExerciseId, Language, SkillId, SubmissionId, UserId } from "@fp/kernel";

export interface SkillEstimate {
  readonly skillId: SkillId;
  readonly language: Language;
  readonly rating: number;
  /** Uncertainty (± on the rating scale). Shrinks with rated observations. */
  readonly deviation: number;
  readonly ratedObservations: number;
  /** True while ratedObservations is below the policy's confidence threshold. */
  readonly provisional: boolean;
  readonly lastIndependentSuccessAt?: string;
  readonly updatedAt: string;
}

export interface ReviewItem {
  readonly skillId: SkillId;
  readonly language: Language;
  readonly dueAt: string;
  readonly intervalDays: number;
  readonly lastResult?: "success" | "failure";
}

export interface ErrorTagStat {
  readonly tag: string;
  readonly count: number;
  readonly lastSeenAt: string;
  /** Set when a later independent attempt on an exercise probing this tag succeeded. */
  readonly lastResolvedAt?: string;
}

export interface OverallRating {
  readonly rating: number;
  readonly provisional: boolean;
  /** How it was computed, shown to learners. */
  readonly method: "observation_weighted_mean";
}

export interface LearnerProfile {
  readonly userId: UserId;
  readonly language: Language;
  readonly estimates: readonly SkillEstimate[];
  readonly overall: OverallRating | null;
  readonly reviews: readonly ReviewItem[];
  readonly errorTags: readonly ErrorTagStat[];
  readonly policyVersion: string;
}

/**
 * One evaluated submission as the learner model sees it.
 * `rated` = counts toward Elo: first attempt, no explanation viewed, hint level <= 2, not a system error.
 * `success` for track "algorithm" skills requires correctness and efficiency not "too_slow".
 */
export interface Observation {
  readonly submissionId: SubmissionId;
  readonly userId: UserId;
  readonly exerciseId: ExerciseId;
  readonly skillId: SkillId;
  readonly language: Language;
  readonly difficulty: number;
  readonly success: boolean;
  readonly rated: boolean;
  readonly errorTags: readonly string[];
  readonly occurredAt: string;
}

export interface RatingChange {
  readonly skillId: SkillId;
  readonly before: number;
  readonly after: number;
  readonly provisional: boolean;
}

export interface LearnerModel {
  getProfile(userId: UserId, language: Language): Promise<LearnerProfile>;
  /** Probability (0..1) that the user solves an exercise of this difficulty on the given skill. */
  expectedSuccess(userId: UserId, skillId: SkillId, language: Language, difficulty: number): Promise<number>;
  dueReviews(userId: UserId, language: Language, at: Date): Promise<readonly ReviewItem[]>;
  /** Rating change caused by a submission, or null if it was not rated / not yet processed. */
  ratingChangeFor(submissionId: SubmissionId): Promise<RatingChange | null>;
  /** Idempotent per submissionId. Normally called by the event subscription. */
  recordObservation(obs: Observation): Promise<void>;
  /** Recompute all derived state from the observation log with the active policy. */
  replayAll(): Promise<{ readonly observations: number; readonly policyVersion: string }>;
}

export const LEARNER_EVENTS = {
  ratingUpdated: "learner.rating_updated",
} as const;

export interface RatingUpdatedPayload {
  readonly userId: UserId;
  readonly submissionId: SubmissionId;
  readonly change: RatingChange;
}
