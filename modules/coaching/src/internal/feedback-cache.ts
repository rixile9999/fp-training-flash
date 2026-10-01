import type { Clock, Db, Locale, SubmissionId, UserId } from "@fp/kernel";
import type { CoachingFeedback } from "../contract/index.ts";

export interface FeedbackCacheKey {
  readonly submissionId: SubmissionId;
  readonly promptVersion: string;
  readonly model: string;
  /** Feedback text language; the same submission is cached once per locale. */
  readonly locale: Locale;
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
         where submission_id = $1 and prompt_version = $2 and model = $3 and locale = $4`,
        [key.submissionId, key.promptVersion, key.model, key.locale],
      );
      const raw = rows[0]?.feedback;
      if (raw === undefined || raw === null) return null;
      return (typeof raw === "string" ? JSON.parse(raw) : raw) as CoachingFeedback;
    },
    async put(key, userId, feedback) {
      // First writer wins; a concurrent duplicate is simply dropped.
      await db.query(
        `insert into coaching.feedback_cache (submission_id, prompt_version, model, locale, user_id, feedback, created_at)
         values ($1, $2, $3, $4, $5, $6::jsonb, $7)
         on conflict (submission_id, prompt_version, model, locale) do nothing`,
        [key.submissionId, key.promptVersion, key.model, key.locale, userId, JSON.stringify(feedback), clock.now().toISOString()],
      );
    },
  };
}
