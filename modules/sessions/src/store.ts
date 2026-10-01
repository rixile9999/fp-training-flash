/** SQL access to the `sessions` schema. Only this file writes SQL. */
import type { Db, ExerciseId, FamilyId, Language, SessionId, SkillId, SubmissionId, UserId } from "@fp/kernel";
import { resolveLocale } from "./messages.ts";
import type { SessionItemKind, SessionItemStatus, SessionStatus, SessionSummary } from "./contract/index.ts";
import type { StoredItem, StoredSession } from "./progress.ts";

/** Number of most recent sessions whose families the planner tries to avoid. */
export const RECENT_SESSIONS = 3;

export interface VariantHistory {
  /** Epoch ms of the latest submission on this family/variant. */
  readonly lastAt: number;
  readonly passed: boolean;
  readonly skillId: SkillId | null;
  readonly contextTags: readonly string[];
}

export interface History {
  /** Keyed by `variantRef(familyId, variantKey)`; version-independent. */
  readonly variants: ReadonlyMap<string, VariantHistory>;
  readonly recentFamilies: ReadonlySet<FamilyId>;
}

export function variantRef(familyId: string, variantKey: string): string {
  return `${familyId}/${variantKey}`;
}

interface SessionRow {
  id: string;
  user_id: string;
  language: string;
  locale: string | null;
  status: string;
  target_minutes: number;
  started_at: unknown;
  completed_at: unknown;
  current_index: number | null;
  summary: SessionSummary | null;
}

interface ItemRow {
  idx: number;
  kind: string;
  exercise_id: string;
  skill_id: string;
  family_id: string;
  variant_key: string;
  reason: string;
  expected_success: number;
  status: string;
  submission_ids: string[];
  had_failure: boolean;
}

function toIso(v: unknown): string {
  return (v instanceof Date ? v : new Date(String(v))).toISOString();
}

function toItem(r: ItemRow): StoredItem {
  return {
    index: r.idx,
    kind: r.kind as SessionItemKind,
    exerciseId: r.exercise_id as ExerciseId,
    skillId: r.skill_id as SkillId,
    familyId: r.family_id as FamilyId,
    variantKey: r.variant_key,
    reason: r.reason,
    expectedSuccess: Number(r.expected_success),
    status: r.status as SessionItemStatus,
    submissionIds: r.submission_ids as SubmissionId[],
    hadFailure: r.had_failure,
  };
}

async function hydrate(db: Db, row: SessionRow): Promise<StoredSession> {
  const items = await db.query<ItemRow>(
    `select idx, kind, exercise_id, skill_id, family_id, variant_key, reason, expected_success, status,
            submission_ids, had_failure
       from sessions.session_items where session_id = $1 order by idx`,
    [row.id],
  );
  const base = {
    id: row.id as SessionId,
    userId: row.user_id as UserId,
    language: row.language as Language,
    locale: resolveLocale(row.locale),
    status: row.status as SessionStatus,
    targetMinutes: Number(row.target_minutes),
    startedAt: toIso(row.started_at),
    currentIndex: row.current_index === null ? null : Number(row.current_index),
    items: items.rows.map(toItem),
    summary: row.summary ?? null,
  };
  return row.completed_at == null ? base : { ...base, completedAt: toIso(row.completed_at) };
}

const SESSION_COLS =
  "id, user_id, language, locale, status, target_minutes, started_at, completed_at, current_index, summary";

export async function loadSession(db: Db, id: SessionId, forUpdate = false): Promise<StoredSession | null> {
  const r = await db.query<SessionRow>(
    `select ${SESSION_COLS} from sessions.sessions where id = $1${forUpdate ? " for update" : ""}`,
    [id],
  );
  const row = r.rows[0];
  return row ? hydrate(db, row) : null;
}

export async function loadActiveSession(db: Db, userId: UserId, language: Language): Promise<StoredSession | null> {
  const r = await db.query<SessionRow>(
    `select ${SESSION_COLS} from sessions.sessions
      where user_id = $1 and language = $2 and status = 'active'
      order by started_at desc, seq desc limit 1`,
    [userId, language],
  );
  const row = r.rows[0];
  return row ? hydrate(db, row) : null;
}

/** Abandons any active session of (user, language), then stores the new one. Call inside a transaction. */
export async function insertSession(tx: Db, s: StoredSession): Promise<void> {
  await tx.query(
    "update sessions.sessions set status = 'abandoned' where user_id = $1 and language = $2 and status = 'active'",
    [s.userId, s.language],
  );
  await tx.query(
    `insert into sessions.sessions (id, user_id, language, locale, status, target_minutes, started_at, current_index)
     values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [s.id, s.userId, s.language, s.locale, s.status, s.targetMinutes, s.startedAt, s.currentIndex],
  );
  for (const i of s.items) {
    await tx.query(
      `insert into sessions.session_items (session_id, idx, kind, exercise_id, skill_id, family_id, variant_key,
         reason, expected_success, status, submission_ids, had_failure)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12)`,
      [
        s.id,
        i.index,
        i.kind,
        i.exerciseId,
        i.skillId,
        i.familyId,
        i.variantKey,
        i.reason,
        i.expectedSuccess,
        i.status,
        JSON.stringify(i.submissionIds),
        i.hadFailure,
      ],
    );
  }
}

/** Persists status, progress and item state of an existing session. */
export async function saveSession(tx: Db, s: StoredSession): Promise<void> {
  await tx.query(
    `update sessions.sessions set status = $2, current_index = $3, completed_at = $4, summary = $5::jsonb
      where id = $1`,
    [s.id, s.status, s.currentIndex, s.completedAt ?? null, s.summary === null ? null : JSON.stringify(s.summary)],
  );
  for (const i of s.items) {
    await tx.query(
      `update sessions.session_items set status = $3, submission_ids = $4::jsonb, had_failure = $5
        where session_id = $1 and idx = $2`,
      [s.id, i.index, i.status, JSON.stringify(i.submissionIds), i.hadFailure],
    );
  }
}

export interface AttemptRecord {
  readonly submissionId: SubmissionId;
  readonly userId: UserId;
  readonly exerciseId: ExerciseId;
  readonly familyId: FamilyId;
  readonly variantKey: string;
  readonly skillId: SkillId | null;
  readonly contextTags: readonly string[];
  readonly sessionId: SessionId | null;
  readonly passed: boolean;
  readonly evaluatedAt: string;
}

/** Returns false when this submission was already recorded (duplicate delivery). */
export async function insertAttempt(tx: Db, a: AttemptRecord): Promise<boolean> {
  const r = await tx.query(
    `insert into sessions.attempts (submission_id, user_id, exercise_id, family_id, variant_key, skill_id,
       context_tags, session_id, passed, evaluated_at)
     values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10)
     on conflict (submission_id) do nothing
     returning submission_id`,
    [
      a.submissionId,
      a.userId,
      a.exerciseId,
      a.familyId,
      a.variantKey,
      a.skillId,
      JSON.stringify(a.contextTags),
      a.sessionId,
      a.passed,
      a.evaluatedAt,
    ],
  );
  return r.rows.length > 0;
}

export async function loadHistory(db: Db, userId: UserId, language: Language): Promise<History> {
  const attempts = await db.query<{
    family_id: string;
    variant_key: string;
    skill_id: string | null;
    context_tags: string[];
    evaluated_at: unknown;
    passed_any: boolean;
  }>(
    `select distinct on (family_id, variant_key) family_id, variant_key, skill_id, context_tags, evaluated_at,
            bool_or(passed) over (partition by family_id, variant_key) as passed_any
       from sessions.attempts where user_id = $1
      order by family_id, variant_key, evaluated_at desc`,
    [userId],
  );
  const variants = new Map<string, VariantHistory>();
  for (const r of attempts.rows) {
    variants.set(variantRef(r.family_id, r.variant_key), {
      lastAt: new Date(toIso(r.evaluated_at)).getTime(),
      passed: r.passed_any,
      skillId: r.skill_id as SkillId | null,
      contextTags: r.context_tags,
    });
  }
  const fams = await db.query<{ family_id: string }>(
    `select distinct i.family_id from sessions.session_items i
      where i.session_id in (
        select id from sessions.sessions where user_id = $1 and language = $2
         order by started_at desc, seq desc limit ${RECENT_SESSIONS})`,
    [userId, language],
  );
  return { variants, recentFamilies: new Set(fams.rows.map((r) => r.family_id as FamilyId)) };
}
