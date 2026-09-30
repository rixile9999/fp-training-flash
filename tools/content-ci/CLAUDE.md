# @fp/content-ci

Validates /content with the real grader. Composition-level tool: imports module roots of content and grading.

- `node tools/content-ci/src/main.ts [--family <id>] [--runner docker|local] [--jobs N] [--write-baselines]`
- Checks per exercise (src/verify.ts): reference passes all tests twice with identical results; each wrong
  answer compiles and fails its `mustFail` tests; starter compiles and fails (refactor: passes); performance
  reference costs are measured and, with `--write-baselines`, written to `performance.referenceCost`.
- Validation of file structure and cross references happens in the content module loader (ContentIssue list).
- Docker runner is the default; use `--runner local` only for quick local iteration.
