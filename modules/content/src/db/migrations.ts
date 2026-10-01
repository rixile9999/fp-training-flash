import type { Migration } from "@fp/kernel";

/**
 * Schema "content". Exercise rows are immutable once written (one per exercise id / version);
 * `variants` points at the latest version of each (family, variant) and marks retirement.
 * Skills and notes are not versioned: they are replaced on import and retired when removed.
 * Every content table has `translations` (jsonb, { en?, zh? } text overlays applied by the catalog).
 */
export const migrations: readonly Migration[] = [
  {
    id: "0001_init",
    sql: `
create schema if not exists content;

create table content.skills (
  id text primary key,
  sort_order integer not null,
  data jsonb not null,
  retired boolean not null default false
);

create table content.concept_notes (
  id text primary key,
  data jsonb not null,
  retired boolean not null default false
);

create table content.theory_topics (
  id text primary key,
  data jsonb not null,
  retired boolean not null default false
);

create table content.exercise_versions (
  id text primary key,
  family_id text not null,
  variant_key text not null,
  version integer not null,
  content_hash text not null,
  language text not null,
  kind text not null,
  format text not null,
  primary_skill text not null,
  summary jsonb not null,
  detail jsonb not null,
  grading jsonb not null,
  reference jsonb not null,
  bundle_id text not null,
  created_at timestamptz not null,
  unique (family_id, variant_key, version)
);

create table content.variants (
  family_id text not null,
  variant_key text not null,
  latest_version integer not null,
  content_hash text not null,
  retired boolean not null default false,
  primary key (family_id, variant_key)
);

create table content.bundles (
  seq bigserial primary key,
  bundle_id text not null,
  content_hash text not null,
  imported_at timestamptz not null,
  exercise_count integer not null,
  exercise_ids jsonb not null
);
`,
  },
  {
    // en/zh overlays (src/i18n.ts) next to the Korean objects; '{}' means Korean only.
    id: "0002_translations",
    sql: `
alter table content.skills add column translations jsonb not null default '{}'::jsonb;
alter table content.concept_notes add column translations jsonb not null default '{}'::jsonb;
alter table content.theory_topics add column translations jsonb not null default '{}'::jsonb;
alter table content.exercise_versions add column translations jsonb not null default '{}'::jsonb;
`,
  },
];
