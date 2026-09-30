/**
 * Server-side help ledger: an append-only log of help events per (user, exercise).
 * `summary()` is what grading receives as `HelpUsed` on submit, so it must never under-report.
 */
import { newId, type Clock, type Db, type ExerciseId, type UserId } from "@fp/kernel";
import type { HelpUsed } from "@fp/grading/contract";
import type { HelpKind } from "../contract/index.ts";

export interface HelpLedger {
  record(userId: UserId, exerciseId: ExerciseId, kind: HelpKind, ref?: string, hintLevel?: number): Promise<void>;
  summary(userId: UserId, exerciseId: ExerciseId): Promise<HelpUsed>;
}

interface SummaryRow {
  max_hint: number;
  concept: number;
  theory: number;
  explanation: boolean;
  coach: number;
}

export function createHelpLedger(db: Db, clock: Clock): HelpLedger {
  return {
    async record(userId, exerciseId, kind, ref, hintLevel) {
      const level = kind === "hint" && hintLevel !== undefined && isHintLevel(hintLevel) ? hintLevel : null;
      await db.query(
        `insert into coaching.help_events (id, user_id, exercise_id, kind, ref, hint_level, created_at)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [newId(), userId, exerciseId, kind, ref ?? null, level, clock.now().toISOString()],
      );
    },

    async summary(userId, exerciseId) {
      const { rows } = await db.query<SummaryRow>(
        `select
           coalesce(max(hint_level) filter (where kind = 'hint'), 0)::int as max_hint,
           (count(distinct coalesce(ref, id)) filter (where kind = 'concept_note'))::int as concept,
           (count(distinct coalesce(ref, id)) filter (where kind = 'theory_note'))::int as theory,
           coalesce(bool_or(kind = 'explanation'), false) as explanation,
           (count(*) filter (where kind = 'coach_message'))::int as coach
         from coaching.help_events
         where user_id = $1 and exercise_id = $2`,
        [userId, exerciseId],
      );
      const r = rows[0];
      return {
        maxHintLevel: Number(r?.max_hint ?? 0),
        conceptNotesOpened: Number(r?.concept ?? 0),
        theoryNotesOpened: Number(r?.theory ?? 0),
        explanationViewed: r?.explanation === true,
        coachMessages: Number(r?.coach ?? 0),
      };
    },
  };
}

export function isHintLevel(n: number): n is 1 | 2 | 3 | 4 | 5 {
  return Number.isInteger(n) && n >= 1 && n <= 5;
}

/** Parses a hint level from a ledger ref such as "3"; undefined when it is not a level. */
export function parseHintLevel(ref: string | undefined): number | undefined {
  if (ref === undefined || !/^\s*\d+\s*$/.test(ref)) return undefined;
  const n = Number(ref);
  return isHintLevel(n) ? n : undefined;
}
