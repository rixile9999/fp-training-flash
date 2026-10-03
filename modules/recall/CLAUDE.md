# @fp/recall

Recall ("암기 / Recall / 记忆", docs/design/recall.md): spaced-repetition memorization of Gleam syntax and the
core library. Cards climb recognize -> cloze/predict -> produce; scheduling is FSRS with automatic ratings; every
answer is checked here (cloze fills and produce bodies in the grading sandbox via `grading.evaluateSnippet`).
Publishes and consumes no events; does not touch Elo ratings. Contract: `src/contract/index.ts` (fixed).

## Rules

- Policy `src/internal/policy/fsrs-v1.ts` (pure, versioned like elo-v1): FSRS-5 default weights, retention 0.9,
  intervals = round(stability) in whole days clamped to 1..365; after "again" the card is due in 10 minutes.
  Elapsed time for retrievability is counted in UTC calendar days. Short-term weights w17/w18 are unused.
- Same-day rule (`progress.ts applyAnswer`): only the first graded answer of a card per UTC day (or the first
  ever) updates the memory state (difficulty, stability, reps, lapses). Later same-day answers keep it and only
  move the stage; their due time is +10 min when wrong, else +interval(current stability).
- Ratings: wrong -> again; correct and slower than `slow` -> hard; correct, faster than `fast` and form stage >= 1
  -> easy; else good. Thresholds (slow/fast): recognize 15s/4s, cloze & predict 25s/8s, produce 150s/45s.
- Stages 0 recognize, 1 cloze|predict, 2 produce. Correct at form stage == current stage -> +1 (max 2); wrong at
  form stage >= current stage -> -1 (min 0); otherwise unchanged. Stage 1 alternates cloze/predict (via
  `last_stage1_form`) when the card has predict. Mastered = stage 2 and the latest produce answer correct.
- Session (`session-builder.ts`, pure). Costs: review recognize 20s, new 40s (+30s for its mix item), cloze/predict
  30s, produce 120s; budget = minutes x 60 (default 10, 1..60; the first item is always allowed). Order:
  1. reviews: due cards, most overdue first, chosen within budget, then interleaved so no more than two cards of
     the same topic follow each other (unless only one topic is left); form = current stage.
  2. new: unseen cards in deck order then card order, at most newCardsPerDay (default 10) minus cards first seen
     today (UTC). A card counts as introduced at its first answer, so unanswered sessions do not use the cap.
  3. mix: up to 2 recently introduced cards (first seen within 7 days, not already in the session) in their
     stage-1 form, then a cloze item for each of this session's new cards.
  4. finale: up to 2 produce items from stage-2 cards not in the session, earliest due first. 120s are reserved
     for it when some stage-2 card is not due.
  Nothing due and no new cards -> practice: seen cards weakest first (stage, lapses desc, stability) as stage-1
  forms ("mix") then produce ("finale"); no seen cards -> empty session. Item ids: `<kind>:<form>:<cardId>`.
- Sessions are stored (`recall.sessions.items` jsonb: itemId, kind, form, cardId); views carry cards in the
  request locale. Unknown/foreign session -> not_found; unknown item -> not_found; answering a finished session
  -> conflict (stored answers are still returned). `deckIds` with an unknown id -> invalid_input.
- `answer()`: idempotent per (session, item): an existing review row is returned (re-rendered in the request
  locale) before any validation or grading. Grading (`grade.ts`):
  - recognize: choice vs key.answer; feedback correctFeedback | choiceFeedback[choice] | generic; `expected` =
    the correct choice text.
  - cloze: trimmed fill in key.cloze.answers -> correct, no sandbox; empty -> wrong, no sandbox; otherwise the
    filled code is evaluated (card imports + definitions) and correct iff the value == key.cloze.expected.
    `expected` = the first accepted fill, `actual` = sandbox value.
  - predict: typed value vs key.predict.expected after removing whitespace outside string literals; no sandbox.
  - produce: definitions = (card.definitions ?? "") + "\n" + header + " {\n" + body + "\n}", expression =
    key.produce.checks; correct iff value == expected and every mustUse token occurs in the body (comments and
    string literals removed, token not glued to a longer identifier). Always returns expected and reference;
    actual, missing tokens and diagnostics when present. Compile-error lines are made relative to the body from
    the snippet module layout documented in the grading contract (`bodyLineOffset`); other lines are shown as
    "outside the body". Runtime error / timeout / "rejected" snippet results are wrong answers with diagnostics.
  - Sandbox Err (or a thrown/rejected promise) -> the AppError is returned (unavailable is re-worded in the
    request locale) and nothing is stored, so the learner can retry.
  A missing card/key at answer time -> conflict `error.cardMissing`.
- Review log `recall.reviews`: one row per (session, item) with card, kind, form, correct, rating, elapsed_ms,
  policy_version, memory_updated, stage before/after, due_at, answered_at and the locale-independent outcome.
  `card_states` is derived: `replayCard(log)` (progress.ts) rebuilds a card's state from its log rows.
- `finish()`: idempotent (sets finished_at once). answered/correct from the session's reviews, newLearned =
  distinct cards answered in "new" items, dueTomorrow = cards due before the end of tomorrow (UTC), deck progress.
- `overview()`: deck progress (seen, mastered, due), dueNow, newAvailableToday = min(unseen, cap left today).
- `cards()`: a deck's cards with the learner's state (stage, reps, lapses, dueAt, stabilityDays) or null; never
  answers (cards come from the learner-facing catalog API). Unknown deck -> not_found.

## Localization (ko/en/zh)

- All strings of this package are in `src/internal/messages.ts` (`t(locale, id, params)`); missing en/zh falls
  back to ko. Terms: 암기/recall/记忆, 카드/card/卡片, 덱/deck/卡组, 세션/session/训练回合.
- Card text and recognize feedback come from the catalog in the request locale; compiler messages stay as the
  compiler wrote them (wrapped in a localized "Line N:" prefix).

## Layout

- `src/index.ts` factory + `migrations`; `src/internal/service.ts` RecallService; `policy/fsrs-v1.ts` scheduler;
  `progress.ts` stages/ratings/same-day/replay; `session-builder.ts` composition; `grade.ts` grading + rendering;
  `store.ts` all SQL (schema `recall`: card_states, sessions, reviews); `migrations.ts` DDL; `messages.ts` catalog.

## Testing

- `pnpm check:module @fp/recall`. `test/fakes.ts`: fake catalog (decks stdlib order 1, syntax order 2; listed
  syntax-first on purpose; 4 gleam/list, 2 gleam/string, 2 gleam/dict, 3 syntax cards; recognize answer 1; l1 has
  predict; en/zh text prefixed `[en] `/`[zh] `), fake sandbox driven by markers in the code (COMPILE_ERROR at a
  line, CRASH, LOOP, FORBIDDEN, LITERAL; see the comment there), PGlite harness with `restart()` (new module
  instance on the same db). Clock starts 2026-09-30T09:00Z.
