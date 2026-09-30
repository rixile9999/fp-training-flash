# @fp/cli (`fp`)

Command-line client for learners who solve exercises in their own editor. Thin adapter over the HTTP API
(`createApiClient` from `@fp/api-contract`): no grading, rating or scheduling logic lives here.

## Invariants

- Only the API client is used; never import module roots or contracts for behaviour (types only).
- Human-readable Korean output by default; `--json` prints the API data (errors as `{ error: {...} }`).
- Exit codes: 0 ok, 1 expected failure (failing tests, API error, missing login/project), 2 usage error.
- The config file (`$FP_CONFIG_DIR` or `~/.config/fp`)/config.json holds a bearer token: written atomically,
  mode 0600. Env `FP_API_URL` / `FP_TOKEN` override the file. Default API URL `http://localhost:8787`.
- Local projects: `./fp-work/<family>-<variant>/`. Learner files (`src/<module>.gleam`, `answer.txt`) are
  never overwritten when edited unless `--force`; generated files (gleam.toml, test/, PROMPT.md, .fp.json)
  are always refreshed.
- `test/` contains ONLY the public tests from `exercise.publicTests`. PROMPT.md contains only revealed
  hints and never `predict.acceptedAnswers` (the API sends all hints and accepted answers in ExerciseDetail).
- Gleam package name == `snake(moduleName)` and the test file is `test/<package>_test.gleam`, because
  `gleam test` runs the module `<package>_test`.
- `submit` links the active session only when the exercise is still the session's current item.
- `explain` requires `--yes` (it makes the exercise unrated); `hint` 3+ prints the same warning.

## Layout

- `src/main.ts` process entry (bin `fp`); wires real stdout/stderr/env into `runCli`.
- `src/cli.ts` argument parsing (node:util parseArgs), command dispatch, error translation. `runCli(argv, deps)`
  takes injected env, cwd, output sinks, `createClient` and `newKey` so tests need no HTTP.
- `src/config.ts` config file load/save.
- `src/project.ts` local Gleam project generation (gleam.toml, starter, public test module, PROMPT.md, .fp.json)
  and reading the learner's code back.
- `src/format.ts` Korean text rendering of trial runs, submissions, feedback, hints, sessions, progress.

## Testing

`pnpm check:module @fp/cli`. Tests use a temp config dir + temp cwd and the recording fake in
`test/fixtures.ts` (implements `CliApi`); `test/project.test.ts` checks the generated layout,
`test/cli.test.ts` drives commands end to end through `runCli`.

## Gotchas

- Project lookup for run/submit/hint/explain: explicit dir > `--dir` > cwd (if it has `.fp.json`) >
  `lastWorkDir` from config.
- Starter file paths come from the server; `writeProject` refuses paths that escape the project dir.
- Public test code may be a bare body (wrapped in `pub fn <id>_test()`) or full functions (kept verbatim);
  top-level `import` lines are hoisted and de-duplicated.
- Language is fixed to `gleam` for sessions/progress until more languages exist.
