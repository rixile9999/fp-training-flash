# @fp/accounts

Users and bearer API tokens shared by web, MCP and CLI. MVP login is a dev login by display name
(no password). Owns PostgreSQL schema `accounts`. Publishes and consumes no events.

## Public surface

- `src/contract/index.ts` (`@fp/accounts/contract`): `AccountsService`, `User`, `IssuedToken`, `TokenInfo`.
  Do not change it here; contract changes are their own task.
- `src/index.ts` (`@fp/accounts`, apps/tools only): `createAccountsModule({ db, clock, logger })` and
  `migrations`. The composition root must run `runMigrations(db, "accounts", migrations)` first.

## Invariants

- Display names: NFC-normalized, trimmed, 1..40 Unicode code points, no control chars or U+2028/2029.
  Uniqueness is case-insensitive via `users.name_key = displayName.toLowerCase()` computed in JS
  (not `lower()` in SQL, which is collation dependent). The first spelling wins and is kept.
- `devLogin` is insert-if-absent (`on conflict (name_key) do nothing`) + select, inside one transaction,
  and always issues a new token labelled `"web"`. Concurrent logins converge on one user.
- Tokens are `"fpt_" + base64url(32 random bytes)` (4 + 43 chars). Only the hex sha256 is stored
  (`tokens.token_hash`, unique). The plaintext exists only in the `IssuedToken` returned once.
- Never log a token or its hash. Logs carry `userId`, `tokenId`, `label` only.
- Token labels: trimmed, 1..40 code points (`invalid_input` otherwise). `issueToken` on an unknown user
  returns `not_found`.
- `revokeToken(userId, tokenId)` is scoped by `user_id`: another user's token looks exactly like a missing
  one (`not_found`). Revoking an already revoked own token is `ok` and keeps the first `revoked_at`.
- `listTokens` returns only unrevoked tokens, oldest first, without secrets.
- `authenticate` rejects malformed tokens without a DB query, looks up by hash (so no constant-time
  compare is needed), ignores revoked tokens, and writes `last_used_at` only if it is null or at least
  60 s old (`LAST_USED_WRITE_INTERVAL_MS`). The SQL `where` repeats that guard for concurrent requests.
- All timestamps come from the injected `Clock`; contract timestamps are ISO strings.

## Layout

- `src/schema.ts`: migrations (`0001_init`: `accounts.users`, `accounts.tokens`). Never edit an applied
  migration; add `0002_...`.
- `src/tokens.ts`: generate / hash / well-formedness check.
- `src/validation.ts`: display name and label normalization (Korean error messages).
- `src/service.ts`: `createAccountsService` (all SQL lives here).
- `test/tokens.test.ts`: pure unit tests. `test/accounts.test.ts`: service against in-memory PGlite.

## Testing

`pnpm check:module @fp/accounts`. DB tests use `createTestDb()` + `createFixedClock()` from
`@fp/kernel/testing`; advance the clock to test the lastUsedAt throttle. A recording logger asserts that
plaintext tokens never reach the logs.

## Gotchas

- timestamptz comes back as `Date` from both pg and PGlite; `toIso` in service.ts normalizes it.
- Do not write U+2028/2029 literally in a regex literal: the vitest (oxc) parser treats them as line
  terminators. `validation.ts` builds that regex from an escaped string.
- Adding a revoked/expired field to `TokenInfo` would need a contract change; today revoked tokens are
  simply hidden.
