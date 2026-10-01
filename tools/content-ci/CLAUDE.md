# @fp/content-ci

Validates /content with the real grader. Composition-level tool: imports module roots of content and grading.

- `node tools/content-ci/src/main.ts [--family <id>] [--runner docker|local] [--jobs N] [--write-baselines]`
- Checks per exercise (src/verify.ts): reference passes all tests twice with identical results; each wrong
  answer compiles and fails its `mustFail` tests; starter compiles and fails (refactor: passes); each localized
  starter (`starter.<locale>/`, always checked when it differs from the Korean one) compiles and gives the same
  per-test results as the Korean starter; performance
  reference costs are measured and, with `--write-baselines`, written to `performance.referenceCost`.
- Validation of file structure and cross references happens in the content module loader (ContentIssue list).
- Docker runner is the default; use `--runner local` only for quick local iteration.
- `node tools/content-ci/src/i18n-check.ts [--family <id>]... [--locale en|zh]... [--notes]`: per-locale
  translation progress report. Uses `codeOnly` from `@fp/content`; the loader enforces the same rules as issues.
