/** Turns a `grading.submission_evaluated` payload into an Observation (pure). */
import type { ExerciseSummary, SkillTrack } from "@fp/content/contract";
import type { HelpUsed, SubmissionEvaluatedPayload } from "@fp/grading/contract";
import type { Observation } from "./contract/index.ts";

export const MAX_RATED_HINT_LEVEL = 2;

/** First attempt, explanation not viewed, hint level <= 2. */
export function isRated(attemptNo: number, helpUsed: HelpUsed): boolean {
  return attemptNo === 1 && !helpUsed.explanationViewed && helpUsed.maxHintLevel <= MAX_RATED_HINT_LEVEL;
}

/** Correctness; algorithm-track skills also need acceptable performance. */
export function isSuccess(
  correctness: boolean,
  efficiency: SubmissionEvaluatedPayload["efficiency"],
  track: SkillTrack,
): boolean {
  if (!correctness) return false;
  return track !== "algorithm" || efficiency !== "too_slow";
}

/** Returns null for evaluations that must never count (infrastructure failures). */
export function observationFromEvaluation(
  payload: SubmissionEvaluatedPayload,
  exercise: Pick<ExerciseSummary, "primarySkill" | "difficulty" | "language">,
  track: SkillTrack,
): Observation | null {
  if (payload.outcome === "system_error") return null;
  return {
    submissionId: payload.submissionId,
    userId: payload.userId,
    exerciseId: payload.exerciseId,
    skillId: exercise.primarySkill,
    language: exercise.language,
    difficulty: exercise.difficulty,
    success: isSuccess(payload.correctness, payload.efficiency, track),
    rated: isRated(payload.attemptNo, payload.helpUsed),
    errorTags: [...new Set(payload.errorTags)],
    occurredAt: payload.evaluatedAt,
  };
}
