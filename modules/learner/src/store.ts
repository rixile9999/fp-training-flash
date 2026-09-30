/**
 * SQL for the `learner` schema. `applyObservation` is the single place derived state changes; both the
 * live path and `replayAll()` go through it, so replay reproduces live state exactly.
 */
import type { Db, ExerciseId, Language, SkillId, SubmissionId, UserId } from "@fp/kernel";
import type { ErrorTagStat, Observation, RatingChange, ReviewItem } from "./contract/index.ts";
import type { RatingPolicy } from "./policy/elo-v1.ts";
import { scheduleReview, type ReviewState } from "./review.ts";

/** An Observation as stored in the log, plus the error tags its exercise's tests probe. */
export interface LoggedObservation {
  readonly observation: Observation;
  readonly probedTags: readonly string[];
}

export interface RatingRow {
  readonly skillId: SkillId;
  readonly rating: number;
  readonly ratedObservations: number;
  readonly lastIndependentSuccessAt?: string;
  readonly updatedAt: string;
}

export function toIso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
}

function toStringArray(value: unknown): string[] {
  const parsed: unknown = typeof value === "string" ? JSON.parse(value) : value;
  return Array.isArray(parsed) ? parsed.map(String) : [];
}

// ---------- observation log ----------

export async function observationExists(db: Db, submissionId: SubmissionId): Promise<boolean> {
  const r = await db.query("select 1 from learner.observations where submission_id = $1", [submissionId]);
  return r.rows.length > 0;
}

/** Returns false when the submission was already logged (idempotency). */
export async function insertObservation(db: Db, entry: LoggedObservation, recordedAt: string): Promise<boolean> {
  const o = entry.observation;
  const r = await db.query(
    `insert into learner.observations
       (submission_id, user_id, exercise_id, skill_id, language, difficulty, success, rated,
        error_tags, probed_tags, occurred_at, recorded_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11, $12)
     on conflict (submission_id) do nothing
     returning submission_id`,
    [
      o.submissionId,
      o.userId,
      o.exerciseId,
      o.skillId,
      o.language,
      o.difficulty,
      o.success,
      o.rated,
      JSON.stringify(o.errorTags),
      JSON.stringify(entry.probedTags),
      o.occurredAt,
      recordedAt,
    ],
  );
  return r.rows.length > 0;
}

interface ObservationRow {
  submission_id: string;
  user_id: string;
  exercise_id: string;
  skill_id: string;
  language: string;
  difficulty: number;
  success: boolean;
  rated: boolean;
  error_tags: unknown;
  probed_tags: unknown;
  occurred_at: unknown;
}

/** The whole log in replay order (occurredAt, then arrival). */
export async function listObservationLog(db: Db): Promise<LoggedObservation[]> {
  const r = await db.query<ObservationRow>(
    `select submission_id, user_id, exercise_id, skill_id, language, difficulty, success, rated,
            error_tags, probed_tags, occurred_at
       from learner.observations order by occurred_at, seq`,
  );
  return r.rows.map((row) => ({
    observation: {
      submissionId: row.submission_id as SubmissionId,
      userId: row.user_id as UserId,
      exerciseId: row.exercise_id as ExerciseId,
      skillId: row.skill_id as SkillId,
      language: row.language as Language,
      difficulty: Number(row.difficulty),
      success: row.success,
      rated: row.rated,
      errorTags: toStringArray(row.error_tags),
      occurredAt: toIso(row.occurred_at),
    },
    probedTags: toStringArray(row.probed_tags),
  }));
}

export async function truncateDerived(db: Db): Promise<void> {
  await db.exec("truncate learner.skill_ratings, learner.rating_changes, learner.reviews, learner.error_tags");
}

// ---------- derived state ----------

/** Applies one logged observation to all derived tables. Returns the rating change for rated observations. */
export async function applyObservation(db: Db, entry: LoggedObservation, policy: RatingPolicy): Promise<RatingChange | null> {
  const o = entry.observation;
  await recordErrorTags(db, o);
  if (!o.rated) return null;

  const change = await updateRating(db, o, policy);
  await updateReview(db, o);
  if (o.success && entry.probedTags.length > 0) {
    await db.query(
      `update learner.error_tags
          set last_resolved_at = case when last_resolved_at is null or last_resolved_at < $3
                                      then $3::timestamptz else last_resolved_at end
        where user_id = $1
          and tag in (select jsonb_array_elements_text($2::jsonb))
          and last_seen_at < $3`,
      [o.userId, JSON.stringify(entry.probedTags), o.occurredAt],
    );
  }
  return change;
}

async function recordErrorTags(db: Db, o: Observation): Promise<void> {
  for (const tag of new Set(o.errorTags)) {
    await db.query(
      `insert into learner.error_tags (user_id, tag, count, last_seen_at) values ($1, $2, 1, $3)
       on conflict (user_id, tag) do update
         set count = learner.error_tags.count + 1,
             last_seen_at = greatest(learner.error_tags.last_seen_at, excluded.last_seen_at)`,
      [o.userId, tag, o.occurredAt],
    );
  }
}

async function updateRating(db: Db, o: Observation, policy: RatingPolicy): Promise<RatingChange> {
  const key = [o.userId, o.language, o.skillId];
  await db.query(
    `insert into learner.skill_ratings (user_id, language, skill_id, rating, rated_observations, updated_at)
     values ($1, $2, $3, $4, 0, $5) on conflict (user_id, language, skill_id) do nothing`,
    [...key, policy.initialRating, o.occurredAt],
  );
  const cur = await db.query<{ rating: number; rated_observations: number }>(
    `select rating, rated_observations from learner.skill_ratings
      where user_id = $1 and language = $2 and skill_id = $3 for update`,
    key,
  );
  const row = cur.rows[0];
  if (!row) throw new Error("skill rating row missing after upsert");
  const before = { rating: Number(row.rating), ratedObservations: Number(row.rated_observations) };
  const after = policy.update(before, o.difficulty, o.success);
  await db.query(
    `update learner.skill_ratings
        set rating = $4, rated_observations = $5, updated_at = $6,
            last_independent_success_at = case
              when $7::boolean then greatest(coalesce(last_independent_success_at, $6::timestamptz), $6::timestamptz)
              else last_independent_success_at end
      where user_id = $1 and language = $2 and skill_id = $3`,
    [...key, after.rating, after.ratedObservations, o.occurredAt, o.success],
  );
  const change: RatingChange = {
    skillId: o.skillId,
    before: before.rating,
    after: after.rating,
    provisional: policy.isProvisional(after.ratedObservations),
  };
  await db.query(
    `insert into learner.rating_changes
       (submission_id, user_id, language, skill_id, before_rating, after_rating, provisional, policy_version)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     on conflict (submission_id) do update
       set before_rating = excluded.before_rating, after_rating = excluded.after_rating,
           provisional = excluded.provisional, policy_version = excluded.policy_version`,
    [o.submissionId, ...key, change.before, change.after, change.provisional, policy.version],
  );
  return change;
}

async function updateReview(db: Db, o: Observation): Promise<void> {
  const key = [o.userId, o.language, o.skillId];
  const cur = await db.query<{ interval_days: number; due_at: unknown; last_result: "success" | "failure" }>(
    `select interval_days, due_at, last_result from learner.reviews
      where user_id = $1 and language = $2 and skill_id = $3 for update`,
    key,
  );
  const row = cur.rows[0];
  const previous: ReviewState | null = row
    ? { intervalDays: Number(row.interval_days), dueAt: toIso(row.due_at), lastResult: row.last_result }
    : null;
  const next = scheduleReview(previous, o.success, o.occurredAt);
  if (!next) return;
  await db.query(
    `insert into learner.reviews (user_id, language, skill_id, interval_days, due_at, last_result)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (user_id, language, skill_id) do update
       set interval_days = excluded.interval_days, due_at = excluded.due_at, last_result = excluded.last_result`,
    [...key, next.intervalDays, next.dueAt, next.lastResult],
  );
}

// ---------- reads ----------

export async function getRating(db: Db, userId: UserId, skillId: SkillId, language: Language): Promise<RatingRow | null> {
  const rows = await listRatings(db, userId, language, skillId);
  return rows[0] ?? null;
}

export async function listRatings(db: Db, userId: UserId, language: Language, skillId?: SkillId): Promise<RatingRow[]> {
  const r = await db.query<{
    skill_id: string;
    rating: number;
    rated_observations: number;
    last_independent_success_at: unknown;
    updated_at: unknown;
  }>(
    `select skill_id, rating, rated_observations, last_independent_success_at, updated_at
       from learner.skill_ratings
      where user_id = $1 and language = $2 and ($3::text is null or skill_id = $3)
      order by skill_id`,
    [userId, language, skillId ?? null],
  );
  return r.rows.map((row) => ({
    skillId: row.skill_id as SkillId,
    rating: Number(row.rating),
    ratedObservations: Number(row.rated_observations),
    ...(row.last_independent_success_at == null
      ? {}
      : { lastIndependentSuccessAt: toIso(row.last_independent_success_at) }),
    updatedAt: toIso(row.updated_at),
  }));
}

export async function listReviews(db: Db, userId: UserId, language: Language, dueBy?: string): Promise<ReviewItem[]> {
  const r = await db.query<{ skill_id: string; interval_days: number; due_at: unknown; last_result: "success" | "failure" }>(
    `select skill_id, interval_days, due_at, last_result from learner.reviews
      where user_id = $1 and language = $2 and ($3::timestamptz is null or due_at <= $3::timestamptz)
      order by due_at, skill_id`,
    [userId, language, dueBy ?? null],
  );
  return r.rows.map((row) => ({
    skillId: row.skill_id as SkillId,
    language,
    dueAt: toIso(row.due_at),
    intervalDays: Number(row.interval_days),
    lastResult: row.last_result,
  }));
}

export async function listErrorTags(db: Db, userId: UserId): Promise<ErrorTagStat[]> {
  const r = await db.query<{ tag: string; count: number; last_seen_at: unknown; last_resolved_at: unknown }>(
    `select tag, count, last_seen_at, last_resolved_at from learner.error_tags
      where user_id = $1 order by count desc, last_seen_at desc, tag`,
    [userId],
  );
  return r.rows.map((row) => ({
    tag: row.tag,
    count: Number(row.count),
    lastSeenAt: toIso(row.last_seen_at),
    ...(row.last_resolved_at == null ? {} : { lastResolvedAt: toIso(row.last_resolved_at) }),
  }));
}

export async function getRatingChange(db: Db, submissionId: SubmissionId): Promise<RatingChange | null> {
  const r = await db.query<{ skill_id: string; before_rating: number; after_rating: number; provisional: boolean }>(
    "select skill_id, before_rating, after_rating, provisional from learner.rating_changes where submission_id = $1",
    [submissionId],
  );
  const row = r.rows[0];
  if (!row) return null;
  return {
    skillId: row.skill_id as SkillId,
    before: Number(row.before_rating),
    after: Number(row.after_rating),
    provisional: row.provisional,
  };
}
