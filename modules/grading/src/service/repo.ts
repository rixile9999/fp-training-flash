/** SQL for the grading schema. Only this module touches grading.*. */
import type { Db, ExerciseId, SessionId, SubmissionId, UserId } from "@fp/kernel";
import type { Evaluation, HelpUsed, Submission } from "../contract/index.ts";

interface Row {
  id: string;
  user_id: string;
  exercise_id: string;
  session_id: string | null;
  attempt_no: number;
  code: string;
  help_used: HelpUsed | string;
  status: "running" | "completed";
  evaluation: Evaluation | string | null;
  created_at: Date | string;
}

const json = <T>(v: T | string): T => (typeof v === "string" ? (JSON.parse(v) as T) : v);
const iso = (v: Date | string): string => (v instanceof Date ? v.toISOString() : new Date(v).toISOString());

function toSubmission(r: Row): Submission {
  const evaluation = r.evaluation === null ? undefined : json<Evaluation>(r.evaluation);
  return {
    id: r.id as SubmissionId,
    userId: r.user_id as UserId,
    exerciseId: r.exercise_id as ExerciseId,
    ...(r.session_id !== null ? { sessionId: r.session_id as SessionId } : {}),
    attemptNo: Number(r.attempt_no),
    code: r.code,
    helpUsed: json<HelpUsed>(r.help_used),
    status: r.status,
    ...(evaluation ? { evaluation } : {}),
    createdAt: iso(r.created_at),
  };
}

const COLUMNS = "id, user_id, exercise_id, session_id, attempt_no, code, help_used, status, evaluation, created_at";

export interface NewSubmission {
  readonly id: SubmissionId;
  readonly userId: UserId;
  readonly exerciseId: ExerciseId;
  readonly sessionId?: SessionId;
  readonly idempotencyKey: string;
  readonly code: string;
  readonly helpUsed: HelpUsed;
  readonly createdAt: string;
}

export function createSubmissionRepo(db: Db) {
  return {
    async findByKey(userId: UserId, idempotencyKey: string): Promise<Submission | null> {
      const r = await db.query<Row>(
        `select ${COLUMNS} from grading.submissions where user_id = $1 and idempotency_key = $2`,
        [userId, idempotencyKey],
      );
      return r.rows[0] ? toSubmission(r.rows[0]) : null;
    },

    /**
     * Inserts a running submission with the next attemptNo, or returns null when (userId, idempotencyKey)
     * already exists. attemptNo counts earlier submissions on the same exercise id, except system errors.
     */
    async insertRunning(s: NewSubmission): Promise<Submission | null> {
      return db.transaction(async (tx) => {
        // Serialises attempt numbering per (user, exercise) across processes.
        await tx.query("select pg_advisory_xact_lock(hashtext($1))", [`grading:${s.userId}:${s.exerciseId}`]);
        const r = await tx.query<Row>(
          `insert into grading.submissions
             (id, user_id, exercise_id, session_id, idempotency_key, attempt_no, code, help_used, status, created_at)
           select $1, $2, $3, $4, $5,
                  1 + (select count(*) from grading.submissions
                        where user_id = $2 and exercise_id = $3 and not system_error)::int,
                  $6, $7::jsonb, 'running', $8
           on conflict (user_id, idempotency_key) do nothing
           returning ${COLUMNS}`,
          [s.id, s.userId, s.exerciseId, s.sessionId ?? null, s.idempotencyKey, s.code, JSON.stringify(s.helpUsed), s.createdAt],
        );
        return r.rows[0] ? toSubmission(r.rows[0]) : null;
      });
    },

    async complete(id: SubmissionId, evaluation: Evaluation): Promise<Submission> {
      const r = await db.query<Row>(
        `update grading.submissions
            set status = 'completed', evaluation = $2::jsonb, outcome = $3, system_error = $4, evaluated_at = $5
          where id = $1
          returning ${COLUMNS}`,
        [id, JSON.stringify(evaluation), evaluation.outcome, evaluation.outcome === "system_error", evaluation.evaluatedAt],
      );
      if (!r.rows[0]) throw new Error(`submission ${id} disappeared`);
      return toSubmission(r.rows[0]);
    },

    async get(id: SubmissionId, userId: UserId): Promise<Submission | null> {
      const r = await db.query<Row>(`select ${COLUMNS} from grading.submissions where id = $1 and user_id = $2`, [id, userId]);
      return r.rows[0] ? toSubmission(r.rows[0]) : null;
    },

    /** Newest first. */
    async list(userId: UserId, exerciseId?: ExerciseId): Promise<Submission[]> {
      const r = exerciseId
        ? await db.query<Row>(
            `select ${COLUMNS} from grading.submissions where user_id = $1 and exercise_id = $2
              order by created_at desc, attempt_no desc, id`,
            [userId, exerciseId],
          )
        : await db.query<Row>(
            `select ${COLUMNS} from grading.submissions where user_id = $1 order by created_at desc, attempt_no desc, id`,
            [userId],
          );
      return r.rows.map(toSubmission);
    },
  };
}

export type SubmissionRepo = ReturnType<typeof createSubmissionRepo>;
