# @fp/learner

Learner model: per-(user, skill, language) Elo, spaced review schedule, per-user error tags. Fed by
`grading.submission_evaluated`; publishes `learner.rating_updated` for rated observations.
Contract: `src/contract/index.ts` (do not change it in module work).

## Invariants

- `learner.observations` is the source of truth (append-only, one row per submissionId). Every other
  table (`skill_ratings`, `rating_changes`, `reviews`, `error_tags`) is derived and rebuilt by `replayAll()`.
- All derived-state changes go through `store.applyObservation`, used by both the live path and replay, so
  replay reproduces live state exactly. Derived timestamps come from `occurredAt` (never the clock).
- Idempotent per submissionId (`on conflict do nothing` on the log; only a fresh insert applies/publishes).
- `outcome === "system_error"` is ignored entirely (no log row).
- rated = attemptNo 1, explanation not viewed, maxHintLevel <= 2. success = correctness, plus
  efficiency !== "too_slow" for track "algorithm". Only rated observations touch ratings and reviews.
  Error tags count every (non-system-error) observation.
- Error-tag resolution: a rated success on an exercise whose GradingSpec has a test with that errorTag sets
  `lastResolvedAt` if the tag was last seen strictly earlier. The probed tags are looked up at record time
  and stored in the log (`probed_tags`), so replay needs no catalog access.
- Review: created by the first rated success (1 day); success advances 1/3/7/14/30 (stays at 30); rated
  failure resets to 1 day; failures before any success create nothing. dueAt = occurredAt + interval.
- Overall = observation-weighted mean over skills with rated observations; provisional if total < 5.
- The `rating_updated` event is published after the transaction commits; replay publishes nothing.

## Layout

- `src/policy/elo-v1.ts`: pure `RatingPolicy` (version "elo-v1"): expected, K(n), deviation(n),
  provisional, update. Swap `activePolicy` to change the policy, then run `replayAll()`.
- `src/review.ts`: pure review scheduling.
- `src/observation.ts`: pure payload -> Observation (rated/success rules).
- `src/store.ts`: SQL for the `learner` schema, `applyObservation`, read queries.
- `src/model.ts`: `LearnerModel` implementation + event handler (catalog lookups, publishing).
- `src/migrations.ts`, `src/index.ts`: migrations and composition-root factory (subscribes to grading).

## Testing

`pnpm check:module @fp/learner`. Tests use in-memory PGlite (`@fp/kernel/testing`), a fake
`ContentCatalog` and a recording event bus (`test/fakes.ts`).
- `test/pure.test.ts`: Elo math, review intervals, rated/success rules.
- `test/learner.test.ts`: event flow, idempotency, unrated rules, algorithm efficiency, reviews,
  error-tag resolution, profile for a new user, overall rating, replay identity/order/rollback.

## Gotchas

- Ratings are stored unrounded (double precision); round only for display.
- Replay orders by `(occurred_at, seq)`; live processing applies in arrival order, so out-of-order events
  can make live state differ from replayed state until `replayAll()` runs.
- `getProfile` lists catalog skills by `order`; observed skills missing from the catalog are appended.
  Unobserved skills report `updatedAt` = clock now.
- Timestamps come back from PGlite/pg as `Date`; convert with `toIso` in `store.ts`.
- If the exercise is unknown the event is logged and skipped; an unknown skill is treated as track "core".
