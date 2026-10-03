# @fp/content-ci

Validates /content with the real grader. Composition-level tool: imports module roots of content and grading.

- `node tools/content-ci/src/main.ts [--family <id>] [--runner docker|local] [--jobs N] [--write-baselines] [--lessons-only]
  [--recall-only] [--card <id>]...`
- Lessons (src/lessons.ts, default run only; a `--family` run copies no content/lessons): after import, walks
  `listLessonUnits`/`getLesson`/`getLessonAnswer` in ko/en/zh; fails when a listed lesson is not served, a learner
  view leaks answers/feedback, or an answer key is out of range or lacks feedback. Prints counts (units, lessons,
  prose, choice/predict exercises, fully translated units per locale) and translation gaps
  (`lessonTranslationGaps` from `@fp/content`; reported, not failed). `--lessons-only` skips the grader.
- Recall (src/recall.ts, default run only): every listed card is evaluated through `GradingService.evaluateSnippet`
  (a grading module over the same PGlite db and runner, concurrency = `--jobs`) with the card's imports and
  definitions: example (= text after its last `// ->`), each cloze fill (= cloze.expected), predict code
  (= predict.expected), produce `checks` after `<header> {\n<reference>\n}` (= produce.expected); values compared as
  `string.inspect` text. Fast path: one job per card, expression `#(0, fp_recall_check_0(), ...)` with each snippet in a
  helper fn (the leading 0 keeps Erlang from printing `#(Lt, ..)` as a record `Lt(..)`); on a mismatch or failure
  each snippet runs alone to attribute it (a card passes when every snippet passes alone). Also fails on catalog
  problems (a card without key, a learner view with answer-key fields). Prints per-card lines, recall translation
  gaps (`recallTranslationGaps`; reported, not failed) and a summary. `--recall-only` skips the exercises (lessons
  are still walked); `--card` limits the recall check (unknown ids fail).
- Checks per exercise (src/verify.ts): reference passes all tests twice with identical results; each wrong
  answer compiles and fails its `mustFail` tests; starter compiles and fails (refactor: passes); each localized
  starter (`starter.<locale>/`, always checked when it differs from the Korean one) compiles and gives the same
  per-test results as the Korean starter; performance
  reference costs are measured and, with `--write-baselines`, written to `performance.referenceCost`.
- Validation of file structure and cross references happens in the content module loader (ContentIssue list).
- Docker runner is the default; use `--runner local` only for quick local iteration.
- `node tools/content-ci/src/i18n-check.ts [--family <id>]... [--locale en|zh]... [--notes]`: per-locale
  translation progress report. Uses `codeOnly` from `@fp/content`; the loader enforces the same rules as issues.
  Without `--family` it also loads the tree and lists `recallTranslationGaps` (or the recall issues when the tree
  does not load) and counts complete recall card-locale pairs.
