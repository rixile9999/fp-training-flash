import type { Migration } from "@fp/kernel";

/** Schema "coaching": help ledger (append-only event log) and the feedback cache. */
export const coachingMigrations: readonly Migration[] = [
  {
    id: "0001_init",
    sql: `
      create schema if not exists coaching;

      create table coaching.help_events (
        id text primary key,
        user_id text not null,
        exercise_id text not null,
        kind text not null check (kind in ('hint', 'concept_note', 'theory_note', 'explanation', 'coach_message')),
        ref text,
        hint_level int check (hint_level between 1 and 5),
        created_at timestamptz not null
      );
      create index help_events_user_exercise on coaching.help_events (user_id, exercise_id);

      create table coaching.feedback_cache (
        submission_id text not null,
        prompt_version text not null,
        model text not null,
        user_id text not null,
        feedback jsonb not null,
        created_at timestamptz not null,
        primary key (submission_id, prompt_version, model)
      );
    `,
  },
];
