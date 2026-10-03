import type { Migration } from "@fp/kernel";

export const migrations: readonly Migration[] = [
  {
    id: "0001_init",
    sql: `
create schema if not exists recall;

-- Per (user, card) state: FSRS memory + stage. Derived from recall.reviews (replayable with the policy).
create table recall.card_states (
  user_id text not null,
  card_id text not null,
  stage smallint not null check (stage between 0 and 2),
  difficulty double precision not null,
  stability double precision not null,
  reps integer not null,
  lapses integer not null,
  due_at timestamptz not null,
  -- last memory update (first graded answer of its UTC day)
  last_review_at timestamptz not null,
  last_answer_at timestamptz not null,
  first_seen_at timestamptz not null,
  last_stage1_form text check (last_stage1_form in ('cloze', 'predict')),
  last_produce_correct boolean,
  policy_version text not null,
  primary key (user_id, card_id)
);
create index card_states_due on recall.card_states (user_id, due_at);
create index card_states_first_seen on recall.card_states (user_id, first_seen_at);

-- Sessions survive restarts. items = [{ itemId, kind, form, cardId }].
create table recall.sessions (
  id text primary key,
  user_id text not null,
  items jsonb not null,
  minutes double precision not null,
  deck_ids jsonb,
  started_at timestamptz not null,
  finished_at timestamptz
);
create index sessions_user on recall.sessions (user_id, started_at);

-- Review log: every graded answer, once per (session, item). result = locale-independent outcome.
create table recall.reviews (
  id bigserial primary key,
  user_id text not null,
  session_id text not null references recall.sessions (id),
  item_id text not null,
  card_id text not null,
  kind text not null,
  form text not null check (form in ('recognize', 'cloze', 'predict', 'produce')),
  correct boolean not null,
  rating text not null check (rating in ('again', 'hard', 'good', 'easy')),
  elapsed_ms integer not null,
  policy_version text not null,
  memory_updated boolean not null,
  stage_before smallint not null,
  stage_after smallint not null,
  due_at timestamptz not null,
  answered_at timestamptz not null,
  result jsonb not null,
  unique (session_id, item_id)
);
create index reviews_user_card on recall.reviews (user_id, card_id, id);
`,
  },
];
