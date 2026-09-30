import type { Clock, Db, SubmissionId, UserId } from "@fp/kernel";
import type { CoachingFeedback } from "../contract/index.ts";

export interface FeedbackCacheKey {
  readonly submissionId: SubmissionId;
  readonly promptVersion: string;
  readonly model: string;
}

export interface FeedbackCache {
  get(key: FeedbackCacheKey): Promise<CoachingFeedback | null>;
  put(key: FeedbackCacheKey, userId: UserId, feedback: CoachingFeedback): Promise<void>;
}

export function createFeedbackCache(db: Db, clock: Clock): FeedbackCache {
  return {
    async get(key) {
      const { rows } = await db.query<{ feedback: unknown }>(
        `select feedback from coaching.feedback_cache
         where submission_id = $1 and prompt_version = $2 and model = $3`,
        [key.submissionId, key.promptVersion, key.model],
      );
      const raw = rows[0]?.feedback;
      if (raw === undefined || raw === null) return null;
      return (typeof raw === "string" ? JSON.parse(raw) : raw) as CoachingFeedback;
    },
    async put(key, userId, feedback) {
      // First writer wins; a concurrent duplicate is simply dropped.
      await db.query(
        `insert into coaching.feedback_cache (submission_id, prompt_version, model, user_id, feedback, created_at)
         values ($1, $2, $3, $4, $5::jsonb, $6)
         on conflict (submission_id, prompt_version, model) do nothing`,
        [key.submissionId, key.promptVersion, key.model, userId, JSON.stringify(feedback), clock.now().toISOString()],
      );
    },
  };
}
