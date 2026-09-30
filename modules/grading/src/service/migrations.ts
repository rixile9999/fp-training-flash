import type { Migration } from "@fp/kernel";

export const migrations: readonly Migration[] = [
  {
    id: "0001_submissions",
    sql: `
create schema if not exists grading;
create table grading.submissions (
  id text primary key,
  user_id text not null,
  exercise_id text not null,
  session_id text,
  idempotency_key text not null,
  attempt_no integer not null,
  code text not null,
  help_used jsonb not null,
  status text not null check (status in ('running', 'completed')),
  outcome text,
  -- Infrastructure failure: stored for audit, never a learning failure.
  system_error boolean not null default false,
  evaluation jsonb,
  created_at timestamptz not null,
  evaluated_at timestamptz,
  constraint submissions_idempotency unique (user_id, idempotency_key)
);
create index submissions_user_exercise on grading.submissions (user_id, exercise_id, created_at);
`,
  },
];
