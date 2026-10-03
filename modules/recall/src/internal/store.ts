/** SQL access to the `recall` schema. Only this file writes SQL. */
import type { Db, UserId } from "@fp/kernel";
import type { RecallItemForm, RecallItemKind, RecallRating } from "../contract/index.ts";
import type { Outcome } from "./grade.ts";
import type { CardProgress, Stage1Form, StageNumber } from "./progress.ts";
import type { StoredItem } from "./session-builder.ts";

export interface StoredSession {
  readonly id: string;
  readonly userId: string;
  readonly items: readonly StoredItem[];
  readonly startedAt: string;
  readonly finishedAt: string | null;
}

export interface StoredReview {
  readonly itemId: string;
  readonly cardId: string;
  readonly kind: RecallItemKind;
  readonly form: RecallItemForm;
  readonly correct: boolean;
  readonly rating: RecallRating;
  readonly elapsedMs: number;
  readonly policyVersion: string;
  readonly memoryUpdated: boolean;
  readonly stageBefore: StageNumber;
  readonly stageAfter: StageNumber;
  readonly dueAt: string;
  readonly answeredAt: string;
  readonly result: Outcome;
}

export interface NewReview extends StoredReview {
  readonly userId: UserId;
  readonly sessionId: string;
}

function toIso(v: unknown): string {
  return (v instanceof Date ? v : new Date(String(v))).toISOString();
}

interface StateRow {
  card_id: string;
  stage: number;
  difficulty: number;
  stability: number;
  reps: number;
  lapses: number;
  due_at: unknown;
  last_review_at: unknown;
  last_answer_at: unknown;
  first_seen_at: unknown;
  last_stage1_form: string | null;
  last_produce_correct: boolean | null;
  policy_version: string;
}

const STATE_COLUMNS =
  "card_id, stage, difficulty, stability, reps, lapses, due_at, last_review_at, last_answer_at, first_seen_at, last_stage1_form, last_produce_correct, policy_version";

function toProgress(r: StateRow): CardProgress {
  return {
    memory: {
      difficulty: Number(r.difficulty),
      stability: Number(r.stability),
      reps: Number(r.reps),
      lapses: Number(r.lapses),
      lastReviewAt: toIso(r.last_review_at),
    },
    stage: Number(r.stage) as StageNumber,
    dueAt: toIso(r.due_at),
    lastAnswerAt: toIso(r.last_answer_at),
    firstSeenAt: toIso(r.first_seen_at),
    lastStage1Form: r.last_stage1_form as Stage1Form | null,
    lastProduceCorrect: r.last_produce_correct,
    policyVersion: r.policy_version,
  };
}

interface ReviewRow {
  item_id: string;
  card_id: string;
  kind: string;
  form: string;
  correct: boolean;
  rating: string;
  elapsed_ms: number;
  policy_version: string;
  memory_updated: boolean;
  stage_before: number;
  stage_after: number;
  due_at: unknown;
  answered_at: unknown;
  result: Outcome;
}

function toReview(r: ReviewRow): StoredReview {
  return {
    itemId: r.item_id,
    cardId: r.card_id,
    kind: r.kind as RecallItemKind,
    form: r.form as RecallItemForm,
    correct: r.correct,
    rating: r.rating as RecallRating,
    elapsedMs: Number(r.elapsed_ms),
    policyVersion: r.policy_version,
    memoryUpdated: r.memory_updated,
    stageBefore: Number(r.stage_before) as StageNumber,
    stageAfter: Number(r.stage_after) as StageNumber,
    dueAt: toIso(r.due_at),
    answeredAt: toIso(r.answered_at),
    result: r.result,
  };
}

const REVIEW_COLUMNS =
  "item_id, card_id, kind, form, correct, rating, elapsed_ms, policy_version, memory_updated, stage_before, stage_after, due_at, answered_at, result";

export function createStore(db: Db) {
  return {
    async states(userId: UserId, tx: Db = db): Promise<Map<string, CardProgress>> {
      const r = await tx.query<StateRow>(`select ${STATE_COLUMNS} from recall.card_states where user_id = $1`, [userId]);
      return new Map(r.rows.map((row) => [row.card_id, toProgress(row)]));
    },

    async state(userId: UserId, cardId: string, tx: Db = db): Promise<CardProgress | null> {
      const r = await tx.query<StateRow>(`select ${STATE_COLUMNS} from recall.card_states where user_id = $1 and card_id = $2 for update`, [
        userId,
        cardId,
      ]);
      const row = r.rows[0];
      return row ? toProgress(row) : null;
    },

    async saveState(userId: UserId, cardId: string, p: CardProgress, tx: Db = db): Promise<void> {
      await tx.query(
        `insert into recall.card_states (user_id, ${STATE_COLUMNS})
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         on conflict (user_id, card_id) do update set
           stage = excluded.stage, difficulty = excluded.difficulty, stability = excluded.stability, reps = excluded.reps,
           lapses = excluded.lapses, due_at = excluded.due_at, last_review_at = excluded.last_review_at,
           last_answer_at = excluded.last_answer_at, first_seen_at = excluded.first_seen_at,
           last_stage1_form = excluded.last_stage1_form, last_produce_correct = excluded.last_produce_correct,
           policy_version = excluded.policy_version`,
        [
          userId,
          cardId,
          p.stage,
          p.memory.difficulty,
          p.memory.stability,
          p.memory.reps,
          p.memory.lapses,
          p.dueAt,
          p.memory.lastReviewAt,
          p.lastAnswerAt,
          p.firstSeenAt,
          p.lastStage1Form,
          p.lastProduceCorrect,
          p.policyVersion,
        ],
      );
    },

    async createSession(s: StoredSession, minutes: number, deckIds: readonly string[] | null): Promise<void> {
      await db.query(
        `insert into recall.sessions (id, user_id, items, minutes, deck_ids, started_at) values ($1, $2, $3::jsonb, $4, $5::jsonb, $6)`,
        [s.id, s.userId, JSON.stringify(s.items), minutes, deckIds === null ? null : JSON.stringify(deckIds), s.startedAt],
      );
    },

    async session(id: string): Promise<StoredSession | null> {
      const r = await db.query<{ id: string; user_id: string; items: StoredItem[]; started_at: unknown; finished_at: unknown }>(
        "select id, user_id, items, started_at, finished_at from recall.sessions where id = $1",
        [id],
      );
      const row = r.rows[0];
      if (!row) return null;
      return {
        id: row.id,
        userId: row.user_id,
        items: row.items,
        startedAt: toIso(row.started_at),
        finishedAt: row.finished_at == null ? null : toIso(row.finished_at),
      };
    },

    async finishSession(id: string, at: string): Promise<void> {
      await db.query("update recall.sessions set finished_at = $2 where id = $1 and finished_at is null", [id, at]);
    },

    async review(sessionId: string, itemId: string, tx: Db = db): Promise<StoredReview | null> {
      const r = await tx.query<ReviewRow>(`select ${REVIEW_COLUMNS} from recall.reviews where session_id = $1 and item_id = $2`, [sessionId, itemId]);
      const row = r.rows[0];
      return row ? toReview(row) : null;
    },

    async sessionReviews(sessionId: string): Promise<StoredReview[]> {
      const r = await db.query<ReviewRow>(`select ${REVIEW_COLUMNS} from recall.reviews where session_id = $1 order by id`, [sessionId]);
      return r.rows.map(toReview);
    },

    /** Review log of one card, oldest first (for replay). */
    async cardLog(userId: UserId, cardId: string): Promise<StoredReview[]> {
      const r = await db.query<ReviewRow>(`select ${REVIEW_COLUMNS} from recall.reviews where user_id = $1 and card_id = $2 order by id`, [
        userId,
        cardId,
      ]);
      return r.rows.map(toReview);
    },

    /** Inserts the review unless (session, item) was already answered; returns false on conflict. */
    async insertReview(v: NewReview, tx: Db = db): Promise<boolean> {
      const r = await tx.query(
        `insert into recall.reviews (user_id, session_id, ${REVIEW_COLUMNS})
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb)
         on conflict (session_id, item_id) do nothing returning id`,
        [
          v.userId,
          v.sessionId,
          v.itemId,
          v.cardId,
          v.kind,
          v.form,
          v.correct,
          v.rating,
          v.elapsedMs,
          v.policyVersion,
          v.memoryUpdated,
          v.stageBefore,
          v.stageAfter,
          v.dueAt,
          v.answeredAt,
          JSON.stringify(v.result),
        ],
      );
      return r.rows.length > 0;
    },
  };
}

export type Store = ReturnType<typeof createStore>;
