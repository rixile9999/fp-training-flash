import type { Migration } from "@fp/kernel";

export const migrations: readonly Migration[] = [
  {
    id: "0001_init",
    sql: `
create schema if not exists lessons;

-- Lesson exercises answered correctly (unrated; giveUp never inserts).
create table lessons.solved_exercises (
  user_id text not null,
  unit_id text not null,
  lesson_id text not null,
  exercise_id text not null,
  solved_at timestamptz not null,
  primary key (user_id, unit_id, lesson_id, exercise_id)
);

create table lessons.lesson_completions (
  user_id text not null,
  unit_id text not null,
  lesson_id text not null,
  completed_at timestamptz not null,
  primary key (user_id, unit_id, lesson_id)
);

-- Per-unit pass state. Both flags only ever go from false to true.
create table lessons.unit_status (
  user_id text not null,
  unit_id text not null,
  checkpoint_passed boolean not null default false,
  checkpoint_best double precision,
  placement_passed boolean not null default false,
  updated_at timestamptz not null,
  primary key (user_id, unit_id)
);

-- Checkpoint and placement attempts. items = stored item refs (with answers' locations, never sent to clients);
-- outcome is set exactly once on the first submit (idempotency per quiz id).
create table lessons.quizzes (
  id text primary key,
  seq bigserial not null,
  user_id text not null,
  kind text not null check (kind in ('checkpoint', 'placement')),
  unit_id text,
  items jsonb not null,
  created_at timestamptz not null,
  submitted_at timestamptz,
  outcome jsonb
);
create index quizzes_user_kind on lessons.quizzes (user_id, kind, unit_id);
`,
  },
];
