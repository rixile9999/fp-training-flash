/** SQL access to the `lessons` schema. Only this file writes SQL. */
import type { Db, UserId } from "@fp/kernel";
import type { PlacementBand } from "./contract/index.ts";

/** A quiz item as stored: where its answer lives. Never sent to clients. */
export interface StoredItemRef {
  readonly itemId: string;
  readonly unitId: string;
  readonly lessonId: string;
  readonly exerciseId: string;
  readonly type: "choice" | "predict";
  readonly level: number;
  readonly skillId: string;
}

export interface GradedItem {
  readonly itemId: string;
  readonly chosen: number | null;
  readonly correct: boolean;
  readonly correctIndex: number;
}

export interface CheckpointOutcome {
  readonly kind: "checkpoint";
  readonly items: readonly GradedItem[];
  readonly score: number;
  readonly total: number;
  readonly passed: boolean;
}

export interface PlacementOutcome {
  readonly kind: "placement";
  readonly items: readonly GradedItem[];
  readonly score: number;
  readonly total: number;
  readonly band: PlacementBand;
  readonly unitsPassed: readonly string[];
  readonly recommendation: "course" | "training";
}

export type QuizOutcome = CheckpointOutcome | PlacementOutcome;

export interface StoredQuiz {
  readonly id: string;
  readonly userId: string;
  readonly kind: "checkpoint" | "placement";
  readonly unitId: string | null;
  readonly items: readonly StoredItemRef[];
  readonly createdAt: string;
  readonly submittedAt: string | null;
  readonly outcome: QuizOutcome | null;
}

export interface UnitStatusRow {
  readonly unitId: string;
  readonly checkpointPassed: boolean;
  readonly checkpointBest: number | null;
  readonly placementPassed: boolean;
}

interface QuizRow {
  id: string;
  user_id: string;
  kind: string;
  unit_id: string | null;
  items: StoredItemRef[];
  created_at: unknown;
  submitted_at: unknown;
  outcome: QuizOutcome | null;
}

function toIso(v: unknown): string {
  return (v instanceof Date ? v : new Date(String(v))).toISOString();
}

function toQuiz(r: QuizRow): StoredQuiz {
  return {
    id: r.id,
    userId: r.user_id,
    kind: r.kind as StoredQuiz["kind"],
    unitId: r.unit_id,
    items: r.items,
    createdAt: toIso(r.created_at),
    submittedAt: r.submitted_at == null ? null : toIso(r.submitted_at),
    outcome: r.outcome,
  };
}

const QUIZ_COLUMNS = "id, user_id, kind, unit_id, items, created_at, submitted_at, outcome";

export function createStore(db: Db) {
  return {
    async solvedExercises(userId: UserId, unitId: string, lessonId: string): Promise<Set<string>> {
      const r = await db.query<{ exercise_id: string }>(
        "select exercise_id from lessons.solved_exercises where user_id = $1 and unit_id = $2 and lesson_id = $3",
        [userId, unitId, lessonId],
      );
      return new Set(r.rows.map((x) => x.exercise_id));
    },

    async markSolved(userId: UserId, unitId: string, lessonId: string, exerciseId: string, at: string): Promise<void> {
      await db.query(
        `insert into lessons.solved_exercises (user_id, unit_id, lesson_id, exercise_id, solved_at)
         values ($1, $2, $3, $4, $5) on conflict do nothing`,
        [userId, unitId, lessonId, exerciseId, at],
      );
    },

    async isCompleted(userId: UserId, unitId: string, lessonId: string): Promise<boolean> {
      const r = await db.query(
        "select 1 from lessons.lesson_completions where user_id = $1 and unit_id = $2 and lesson_id = $3",
        [userId, unitId, lessonId],
      );
      return r.rows.length > 0;
    },

    async markCompleted(userId: UserId, unitId: string, lessonId: string, at: string): Promise<void> {
      await db.query(
        `insert into lessons.lesson_completions (user_id, unit_id, lesson_id, completed_at)
         values ($1, $2, $3, $4) on conflict do nothing`,
        [userId, unitId, lessonId, at],
      );
    },

    /** unitId -> completed lesson ids. */
    async completions(userId: UserId): Promise<Map<string, Set<string>>> {
      const r = await db.query<{ unit_id: string; lesson_id: string }>(
        "select unit_id, lesson_id from lessons.lesson_completions where user_id = $1",
        [userId],
      );
      const out = new Map<string, Set<string>>();
      for (const row of r.rows) {
        const set = out.get(row.unit_id) ?? new Set<string>();
        set.add(row.lesson_id);
        out.set(row.unit_id, set);
      }
      return out;
    },

    async unitStatuses(userId: UserId): Promise<Map<string, UnitStatusRow>> {
      const r = await db.query<{
        unit_id: string;
        checkpoint_passed: boolean;
        checkpoint_best: number | null;
        placement_passed: boolean;
      }>(
        "select unit_id, checkpoint_passed, checkpoint_best, placement_passed from lessons.unit_status where user_id = $1",
        [userId],
      );
      return new Map(
        r.rows.map((x) => [
          x.unit_id,
          {
            unitId: x.unit_id,
            checkpointPassed: x.checkpoint_passed,
            checkpointBest: x.checkpoint_best == null ? null : Number(x.checkpoint_best),
            placementPassed: x.placement_passed,
          },
        ]),
      );
    },

    async countQuizzes(userId: UserId, kind: "checkpoint" | "placement", unitId: string | null): Promise<number> {
      const r = await db.query<{ n: number | string }>(
        "select count(*) as n from lessons.quizzes where user_id = $1 and kind = $2 and unit_id is not distinct from $3",
        [userId, kind, unitId],
      );
      return Number(r.rows[0]?.n ?? 0);
    },

    async insertQuiz(q: {
      id: string;
      userId: UserId;
      kind: "checkpoint" | "placement";
      unitId: string | null;
      items: readonly StoredItemRef[];
      createdAt: string;
    }): Promise<void> {
      await db.query(
        `insert into lessons.quizzes (id, user_id, kind, unit_id, items, created_at) values ($1, $2, $3, $4, $5::jsonb, $6)`,
        [q.id, q.userId, q.kind, q.unitId, JSON.stringify(q.items), q.createdAt],
      );
    },

    async getQuiz(id: string): Promise<StoredQuiz | null> {
      const r = await db.query<QuizRow>(`select ${QUIZ_COLUMNS} from lessons.quizzes where id = $1`, [id]);
      const row = r.rows[0];
      return row ? toQuiz(row) : null;
    },

    async latestPlacement(userId: UserId): Promise<StoredQuiz | null> {
      const r = await db.query<QuizRow>(
        `select ${QUIZ_COLUMNS} from lessons.quizzes
          where user_id = $1 and kind = 'placement' and outcome is not null
          order by submitted_at desc, seq desc limit 1`,
        [userId],
      );
      const row = r.rows[0];
      return row ? toQuiz(row) : null;
    },

    /**
     * Stores the outcome if the quiz has none yet and applies its unit effects in the same transaction.
     * Returns true when this call stored it (first submit), false when another submit got there first.
     */
    async claimOutcome(quiz: StoredQuiz, outcome: QuizOutcome, at: string): Promise<boolean> {
      return db.transaction(async (tx) => {
        const r = await tx.query(
          `update lessons.quizzes set outcome = $2::jsonb, submitted_at = $3 where id = $1 and outcome is null returning id`,
          [quiz.id, JSON.stringify(outcome), at],
        );
        if (r.rows.length === 0) return false;
        if (outcome.kind === "checkpoint" && quiz.unitId !== null) {
          const best = outcome.total > 0 ? outcome.score / outcome.total : 0;
          await tx.query(
            `insert into lessons.unit_status (user_id, unit_id, checkpoint_passed, checkpoint_best, updated_at)
             values ($1, $2, $3, $4, $5)
             on conflict (user_id, unit_id) do update set
               checkpoint_passed = lessons.unit_status.checkpoint_passed or excluded.checkpoint_passed,
               checkpoint_best = greatest(coalesce(lessons.unit_status.checkpoint_best, 0), excluded.checkpoint_best),
               updated_at = excluded.updated_at`,
            [quiz.userId, quiz.unitId, outcome.passed, best, at],
          );
        }
        if (outcome.kind === "placement") {
          for (const unitId of outcome.unitsPassed) {
            await tx.query(
              `insert into lessons.unit_status (user_id, unit_id, placement_passed, updated_at) values ($1, $2, true, $3)
               on conflict (user_id, unit_id) do update set placement_passed = true, updated_at = excluded.updated_at`,
              [quiz.userId, unitId, at],
            );
          }
        }
        return true;
      });
    },
  };
}

export type Store = ReturnType<typeof createStore>;
