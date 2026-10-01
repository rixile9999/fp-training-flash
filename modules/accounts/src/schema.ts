import type { Migration } from "@fp/kernel";

/**
 * Schema "accounts". Never edit an applied migration; add a new one.
 * - users.name_key is the normalized, lower-cased display name (case-insensitive uniqueness is
 *   computed in JS so it does not depend on the database collation).
 * - tokens.token_hash is the hex sha256 of the plaintext token; the plaintext is never stored.
 * - users.locale is the preferred UI/content language; existing rows get the default "ko".
 */
export const migrations: readonly Migration[] = [
  {
    id: "0001_init",
    sql: `
      create schema if not exists accounts;
      create table accounts.users (
        id text primary key,
        display_name text not null,
        name_key text not null unique,
        created_at timestamptz not null
      );
      create table accounts.tokens (
        id text primary key,
        user_id text not null references accounts.users (id),
        token_hash text not null unique,
        label text not null,
        created_at timestamptz not null,
        last_used_at timestamptz,
        revoked_at timestamptz
      );
      create index tokens_user_id_idx on accounts.tokens (user_id);
    `,
  },
  {
    id: "0002_user_locale",
    sql: `
      alter table accounts.users
        add column locale text not null default 'ko'
        constraint users_locale_check check (locale in ('ko', 'en', 'zh'));
    `,
  },
];
