# @fp/sessions

Builds short training sessions (review -> focus -> variation [-> challenge]), tracks progress from
`grading.submission_evaluated`, and gives single recommendations. Publishes `sessions.session_completed`.

## Invariants

- At most one `active` session per (user, language); `start` abandons the previous one in the same
  transaction (partial unique index `sessions_one_active` enforces it).
- Event consumption is idempotent per `submissionId` (`sessions.attempts` primary key). `system_error`
  outcomes are ignored entirely (no attempt row, no item change).
- Only events whose `userId` owns an `active` session touch items. Passed = `outcome === "passed"`.
- A failed item stays current; only a pass of the current item (or `skip`) moves `currentIndex` to the
  next pending item (forward first, then wrapping). A passed item never goes back to failed.
- `complete` is repeatable: the stored summary is returned again and the event is published once.
- Session reads/writes are owner-checked (`get`/`skip`/`complete` return null / not_found for others).

## Localization (ko/en/zh)

- All learner-facing strings (item reasons, AppError messages) live in `src/messages.ts` (`MESSAGES`,
  `LocalizedText` keyed by stable ids); render with `t(locale, id, params)`. Missing en/zh falls back to ko.
  Follow `docs/i18n-glossary.md`. Never inline Korean text elsewhere.
- `StartSessionRequest.locale` / `recommend(..., locale)` default to "ko"; unknown values are normalised by
  `resolveLocale`. Skill names and exercise titles in reasons come from the catalog in that locale.
- The session stores its locale (`sessions.sessions.locale`, migration 0002, not exposed in `Session`);
  reasons are persisted already rendered, and skip/complete errors use the stored locale.
  "Session not found" is always ko (no trusted session to read a locale from).

## Selection rules (src/planner.ts)

- Skills considered: those with at least one drill in the language (catalog skills sorted by `order`;
  unknown skill ids from exercises are appended as prerequisite-free).
- Eligible: every prerequisite has `lastIndependentSuccessAt` or rating >= 1250; the lowest-order core
  skill is always eligible. Weakest = lowest rating (missing estimate = 1200), ties by order.
- Focus: weakest eligible skill that still has unpassed drills (else allow passed). Ranking key:
  not passed > family not in the last 3 sessions > difficulty fit > id. Difficulty fit: skills with rated
  observations prefer expectedSuccess in 0.6..0.9 then closest to 0.8; skills without rating evidence
  prefer difficulty closest to 1200. `focusSkill` forces the skill (not_found if it has no drills).
- Reviews: `learner.dueReviews(now)` (sorted by dueAt, deduped, focus skill skipped). Key: not submitted
  in the last 14 days > no context tag shared with the last submission of that skill > not passed > fit.
- Variation: same family, different variantKey; else same skill, other family, disjoint context tags.
- Budget: focus is always included (first review if there is no focus); then reviews and variation while
  `estimatedMinutes` fit `targetMinutes`. The challenge (format "challenge", focus skill first, eligible
  skills only) is appended outside the budget.
- History (passed/submitted variants, last context tags per skill) is keyed by family/variantKey so new
  exercise versions count as the same exercise.

## Layout

- `src/contract/index.ts` public contract (do not edit here).
- `src/index.ts` factory: wires service + event subscription; exports `migrations`.
- `src/service.ts` SessionService + `onSubmissionEvaluated` consumer.
- `src/planner.ts` selection logic (reads ContentCatalog / LearnerModel contracts).
- `src/progress.ts` pure state transitions (evaluation, skip, summary) and the stored item shape.
- `src/store.ts` all SQL for schema `sessions` (tables: sessions, session_items, attempts).
- `src/migrations.ts` schema DDL.
- `src/messages.ts` message catalog (ko/en/zh) and `t`/`render`/`resolveLocale`.

## Testing

- `pnpm check:module @fp/sessions`. Tests in `test/`: `fakes.ts` has a fake catalog, a fake learner
  (logistic expected success or an explicit `esByDifficulty` table; fake en/zh names "Skill-a"/"能力-a",
  titles prefixed "[en] "/"[zh] ", `untranslatedSkills` to test fallback) and a harness with PGlite, a fixed
  clock and an in-memory bus (`evaluate()` publishes submission events).
- Harness records event-handler errors (the bus swallows them); tests assert the list is empty.

## Gotchas

- The event carries no language; attempts are stored per user and matched by family/variant.
- The consumer calls `catalog.getExercise` to learn skill/context tags; unknown ids fall back to parsing
  `<familyId>/<variantKey>@<version>`.
- `expectedSuccess` calls are cached per (skill, difficulty) within one planning pass only.
- Timestamps are `timestamptz`; the store normalises them to ISO strings.
