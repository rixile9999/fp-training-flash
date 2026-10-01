# @fp/lessons

The Gleam basics course (docs/design/lessons.md): lesson progress, per-choice feedback, unit checkpoints and the
placement test. Lesson exercises are unrated; checkpoint and placement items are rated observations in the learner
model. Publishes `lessons.checkpoint_passed` and `lessons.placement_completed`; consumes nothing.

## Rules

- Answers are checked only here, with `catalog.getLessonAnswer` (never sent to clients before a reveal).
- `answer()`: correct -> `correctFeedback` + `correctIndex`, exercise stored as solved; wrong -> the chosen choice's
  feedback (fallback `feedback.wrong`), no `correctIndex`; `giveUp` -> `correct: false` + `correctIndex` +
  `correctFeedback`, not solved. `choice` must be an integer in range unless `giveUp` (else invalid_input).
- `completeLesson()` is allowed with unsolved exercises; idempotent. Returns the unit's `UnitProgress`.
- A unit is *passed* when its own checkpoint was passed or the placement implied it. `UnitProgress.checkpointPassed`
  is true in both cases; `passedByPlacement` is true only when the pass came from placement alone.
  `unlocked` = every prerequisite (that exists in the catalog) is passed. Locked units stay openable and their
  checkpoints can be taken. Pass flags never go back to false (retaking placement cannot remove passes).
- Next step: first unit by `order` that is not passed -> its first incomplete lesson, else its checkpoint; else done.
- Checkpoint: clamp(2 x lessons, 6, 10) items (capped by available), seeded by
  `<user>|checkpoint|<unit>|<attempt#>` (attempt# = earlier checkpoint quizzes for that unit), round-robin over lessons
  in shuffled order, balancing choice/predict; shown in lesson order. Pass at >= 0.8 (inclusive).
- Placement: levels ascending; per level clamp(#units with items, 3, 4) items, one per unit (by order) before any
  second; seed `<user>|placement|<attempt#>`. Real content gives 3+4+4+4 = 15 items. Bands: advanced >= 80% and
  >= 2/3 of L3-L4 items (vacuous if none); intermediate >= 50%; else beginner. unitsPassed: advanced -> all level 1-3
  units; intermediate -> level 1-2 units with more than half of their items correct; beginner -> none.
  recommendation: advanced -> "training", else "course".
- Observations (both quiz kinds, one per item): submissionId `lesson-quiz:<quizId>:<itemId>`, exerciseId
  `lesson:<unit>/<lesson>#<exercise>`, skill = the unit's skill, language gleam, difficulty L1 900 .. L4 1200
  (+50 for predict), success = correct, rated, no error tags, occurredAt = first submit time.
- Submit is idempotent per quizId: the first submit stores the outcome (conditional update in a transaction that
  also applies unit effects) and publishes the event; later submits return the stored outcome regardless of answers.
  Observations are re-recorded on every submit (learner dedupes per submissionId), which heals a crash between the
  outcome write and recording. `ratingChanges` come from `learner.ratingChangeFor`, merged to one per skill.
- Quizzes expire 24 h after start (`QUIZ_TTL_MS`) unless already submitted (conflict). Unknown, foreign or wrong-kind
  quiz ids give the same not_found. A missing answer key at grading time -> conflict `error.quizContentChanged`.
- Item ids are opaque (`i1`..`iN`); refs live only in `lessons.quizzes.items` and in review backlinks.

## Localization (ko/en/zh)

- All strings of this package are in `src/messages.ts` (`t(locale, id, params)`); missing en/zh falls back to ko.
  Terms: 단원/unit/单元, 레슨/lesson/课, 체크포인트/checkpoint/单元测验, 배치 고사/placement test/分级测试.
- Lesson text, prompts and feedback come from the catalog in the request locale. Quiz reviews are stored as raw
  outcomes and rendered per request, so `course(locale)` shows the latest placement review in that locale.
- `completeLesson` has no locale parameter in the contract, so its errors are Korean.

## Layout

- `src/index.ts` factory + `migrations`; `src/service.ts` LessonService; `src/sampling.ts` pure sampling/scoring;
  `src/store.ts` all SQL (schema `lessons`: solved_exercises, lesson_completions, unit_status, quizzes);
  `src/migrations.ts` DDL; `src/messages.ts` catalog.

## Testing

- `pnpm check:module @fp/lessons`. `test/fakes.ts`: fake catalog of 4 units (ua L1 2 lessons x 3, ub/uc/ud 1 x 4;
  prompts `Q <unit>/<lesson>#<ex>` so tests can look up answers; en/zh text prefixed `[en] `/`[zh] `; no choice
  feedback for index 3), fake learner (dedupes, +/-10 per observation), PGlite harness capturing events.
