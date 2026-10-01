# @fp/api — composition root and HTTP server

Wires every module together (db, migrations, event bus, content import, runner) and maps the HTTP contract
in `@fp/api-contract` (ROUTES, DTOs, `{ error: { code, message, details } }`) onto module services.
No business rules live here: grading, rating, coaching and session logic belong to the modules.

## Layout

- `src/config.ts` — `loadConfig(env, cwd)`: pure env parsing into `ApiConfig` (returns `Result`, collects all
  problems). Env: `PORT` (8787), `DATABASE_URL` or `FP_DATA_DIR` (`.data/pglite`, `memory` = in-memory),
  `FP_CONTENT_DIR` (repo `/content`), `FP_RUNNER` docker|local, `FP_RUNNER_IMAGE`, `FP_RUNNER_TEMPLATE_DIR`
  (required for local), `ANTHROPIC_API_KEY` + `FP_COACH_MODEL` (LLM only with a key), `FP_WEB_ORIGIN` (CORS).
- `src/app.ts` — `createApp(services, options)`: Hono app. Middleware order: cors -> body limit -> auth.
  Routes in ROUTES order; `redactExercise` hides unrevealed hint text and predict answers.
- `src/http.ts` — `STATUS_BY_CODE`, `fail`/`respond`/`json`, `requestLocale`, `apiError(c, code, messageId)`,
  zod `parseBody`/`parseQuery` (-> `invalid_input`; zod issue messages via `zodErrorMap(locale)`).
- `src/messages.ts` — the API's own messages (`API_MESSAGES`, ko/en/zh `LocalizedText`, `apiMessage`) and
  `localeFromAcceptLanguage`. Every API-owned user-facing string lives here.
- `src/schemas.ts` — zod schemas mirroring the request DTOs (size limits live here). Custom checks carry
  `params: { messageId }` so the error map renders them from the catalog in the request locale.
- `src/rate-limit.ts` — in-memory sliding window per `(userId, action)` using the injected `Clock`.
- `src/bootstrap.ts` — `bootstrap(config, opts)`: open db, `migrateAll` (accounts, content, grading, learner,
  sessions, coaching), create modules with one `InMemoryEventBus`, load + import `/content` (throws
  `ContentInvalidError` after logging every issue), choose runner, `serve()`. `Runtime.close()` is idempotent.
- `src/main.ts` — process entry (`pnpm start` / `pnpm dev`): config -> bootstrap -> SIGINT/SIGTERM shutdown
  (10 s force-exit). Exits 1 on invalid config or invalid content.
- `src/index.ts` — public exports (createApp, bootstrap, loadConfig, ...).

## Invariants

- Every `/v1/*` route requires `Authorization: Bearer <token>` (via `AccountsService.authenticate`) except
  `GET /v1/health` and `POST /v1/auth/dev-login`. CORS preflight is answered before auth.
- AppError -> status: not_found 404, invalid_input 400, unauthorized 401, forbidden 403, conflict 409,
  rate_limited 429 (+ `retry-after`), unavailable 503, internal 500. Thrown errors -> 500 `internal`, logged,
  message never leaks. Unknown routes -> 404 in the same error shape.
- Submit: `coaching.helpUsed` (server-side; any client-sent helpUsed is ignored) -> `grading.submit` ->
  `learner.ratingChangeFor` -> `SubmissionView`. Grading errors skip the rating lookup.
- ExerciseView = exercise (redacted) + concept notes + theory topics + hints with level <= helpUsed.maxHintLevel.
- `notes-opened` records `concept_note` / `theory_note` help via `coaching.recordHelp` (404 if the exercise is unknown).
- Rate limit (default 30/min per user and action) applies to submit, run, chat, feedback. Validation runs
  first, so invalid requests do not consume quota.
- Locale (ko/en/zh): the auth middleware sets the `locale` context variable from `user.locale`; `requestLocale`
  falls back to `Accept-Language` (primary subtag, q-values; default ko). Every module call that takes a locale
  receives it (exercise view + notes/topics, exercises, theory, skills, progress skills, run, submit, feedback,
  chat, hints, explanation, session start, recommend). API error messages (auth, validation, rate limit,
  not found) use the same locale. `PATCH /v1/me {locale}` -> `accounts.setLocale`; dev-login passes `locale`
  to `accounts.devLogin` only when given (never derived from Accept-Language, so logins do not overwrite it).

## Testing

`pnpm check:module @fp/api`. `test/locale.test.ts` covers locale threading (fake users `EN_TOKEN`/`ZH_TOKEN`,
fake `listSkills` names per locale), PATCH /v1/me, Accept-Language fallback and the catalog. Tests use hand-written fakes of every contract (`test/fakes.ts`, which records
calls in `fakes.calls`) and call `app.request()` directly or through `createApiClient` with a fetch shim, so
the tests exercise the real contract client. Bootstrap is not unit-tested (module factories are stubs until
merged); `MODULE_MIGRATIONS` order is asserted in `test/config.test.ts`.

## Gotchas

- Exercise ids contain `/` and `@` (`family/variant@1`); clients `encodeURIComponent` them. Hono matches
  `:exerciseId` on the still-encoded segment and `c.req.param()` decodes it — never read ids from `c.req.path`.
- `/v1/sessions/active` must be registered before `/v1/sessions/:sessionId`.
- Responses go through `json()` (JSON.stringify) instead of `c.json()` so branded ids / readonly arrays type-check.
- Empty request bodies parse as `{}` so POST routes without a body (explanation, feedback, skip) work.
- The rate limiter is per process; multiple API instances would each allow the full quota.
