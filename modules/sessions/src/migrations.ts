import type { Migration } from "@fp/kernel";

export const migrations: readonly Migration[] = [
  {
    id: "0001_init",
    sql: `
create schema if not exists sessions;

create table sessions.sessions (
  id text primary key,
  seq bigserial not null,
  user_id text not null,
  language text not null,
  status text not null check (status in ('active', 'completed', 'abandoned')),
  target_minutes integer not null,
  started_at timestamptz not null,
  completed_at timestamptz,
  current_index integer,
  summary jsonb
);
-- At most one active session per (user, language).
create unique index sessions_one_active on sessions.sessions (user_id, language) where status = 'active';
create index sessions_user_recent on sessions.sessions (user_id, language, started_at desc, seq desc);

create table sessions.session_items (
  session_id text not null references sessions.sessions (id) on delete cascade,
  idx integer not null,
  kind text not null,
  exercise_id text not null,
  skill_id text not null,
  family_id text not null,
  variant_key text not null,
  reason text not null,
  expected_success double precision not null,
  status text not null,
  submission_ids jsonb not null default '[]'::jsonb,
  had_failure boolean not null default false,
  primary key (session_id, idx)
);

-- One row per evaluated submission (idempotency key = submission_id). Feeds recommendation history.
create table sessions.attempts (
  submission_id text primary key,
  user_id text not null,
  exercise_id text not null,
  family_id text not null,
  variant_key text not null,
  skill_id text,
  context_tags jsonb not null default '[]'::jsonb,
  session_id text,
  passed boolean not null,
  evaluated_at timestamptz not null
);
create index attempts_user_recent on sessions.attempts (user_id, evaluated_at desc);
`,
  },
  {
    id: "0002_session_locale",
    sql: `
-- Locale the session's reasons were written in; later messages for the session reuse it.
alter table sessions.sessions add column locale text not null default 'ko';
`,
  },
];
