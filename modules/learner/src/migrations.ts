import type { Migration } from "@fp/kernel";

/**
 * `observations` is the source of truth (append-only log). Every other table is derived state that
 * `replayAll()` truncates and rebuilds.
 */
export const learnerMigrations: readonly Migration[] = [
  {
    id: "0001_init",
    sql: `
create schema if not exists learner;

create table learner.observations (
  submission_id text primary key,
  seq bigserial not null unique,
  user_id text not null,
  exercise_id text not null,
  skill_id text not null,
  language text not null,
  difficulty double precision not null,
  success boolean not null,
  rated boolean not null,
  error_tags jsonb not null default '[]'::jsonb,
  probed_tags jsonb not null default '[]'::jsonb,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null
);
create index observations_order_idx on learner.observations (occurred_at, seq);

create table learner.skill_ratings (
  user_id text not null,
  language text not null,
  skill_id text not null,
  rating double precision not null,
  rated_observations integer not null,
  last_independent_success_at timestamptz,
  updated_at timestamptz not null,
  primary key (user_id, language, skill_id)
);

create table learner.rating_changes (
  submission_id text primary key,
  user_id text not null,
  language text not null,
  skill_id text not null,
  before_rating double precision not null,
  after_rating double precision not null,
  provisional boolean not null,
  policy_version text not null
);

create table learner.reviews (
  user_id text not null,
  language text not null,
  skill_id text not null,
  interval_days integer not null,
  due_at timestamptz not null,
  last_result text not null check (last_result in ('success', 'failure')),
  primary key (user_id, language, skill_id)
);
create index reviews_due_idx on learner.reviews (user_id, language, due_at);

create table learner.error_tags (
  user_id text not null,
  tag text not null,
  count integer not null,
  last_seen_at timestamptz not null,
  last_resolved_at timestamptz,
  primary key (user_id, tag)
);
`,
  },
];
