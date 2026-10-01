# @fp/content-ci

Validates /content with the real grader. Composition-level tool: imports module roots of content and grading.

- `node tools/content-ci/src/main.ts [--family <id>] [--runner docker|local] [--jobs N] [--write-baselines] [--lessons-only]`
- Lessons (src/lessons.ts, default run only; a `--family` run copies no content/lessons): after import, walks
  `listLessonUnits`/`getLesson`/`getLessonAnswer` in ko/en/zh; fails when a listed lesson is not served, a learner
  view leaks answers/feedback, or an answer key is out of range or lacks feedback. Prints counts (units, lessons,
  prose, choice/predict exercises, fully translated units per locale) and translation gaps
  (`lessonTranslationGaps` from `@fp/content`; reported, not failed). `--lessons-only` skips the grader.
- Checks per exercise (src/verify.ts): reference passes all tests twice with identical results; each wrong
  answer compiles and fails its `mustFail` tests; starter compiles and fails (refactor: passes); each localized
  starter (`starter.<locale>/`, always checked when it differs from the Korean one) compiles and gives the same
  per-test results as the Korean starter; performance
  reference costs are measured and, with `--write-baselines`, written to `performance.referenceCost`.
- Validation of file structure and cross references happens in the content module loader (ContentIssue list).
- Docker runner is the default; use `--runner local` only for quick local iteration.
- `node tools/content-ci/src/i18n-check.ts [--family <id>]... [--locale en|zh]... [--notes]`: per-locale
  translation progress report. Uses `codeOnly` from `@fp/content`; the loader enforces the same rules as issues.
