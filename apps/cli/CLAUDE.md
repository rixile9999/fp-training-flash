# @fp/cli (`fp`)

Command-line client for learners who solve exercises in their own editor. Thin adapter over the HTTP API
(`createApiClient` from `@fp/api-contract`): no grading, rating or scheduling logic lives here.

## Invariants

- Only the API client is used; never import module roots or contracts for behaviour (types only).
- Human-readable output in ko/en/zh (Korean default); `--json` prints the API data (errors as `{ error: {...} }`).
- Display locale: `--lang` > `FP_LANG` > account `user.locale` (live `/v1/me` for API commands, else the
  `locale` cached in config) > system `LC_ALL`/`LC_MESSAGES`/`LANG` prefix > ko. `fp lang <ko|en|zh>` calls
  `updateMe` and stores `locale` in config (logged out: stored only, sent with the next `fp login`).
  The server renders content (problems, hints, feedback, PROMPT.md body) in the account locale; the CLI
  only localizes its own chrome. Every CLI string lives in `src/messages.ts` (missing en/zh -> ko).
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
- Gleam basics course (docs/design/lessons.md): `course`, `lesson [<unit>/<lesson>|<unit>|next]` (default next;
  a bare unit opens its first unfinished lesson), `answer <unit>/<lesson> <exercise id|number> <choice|show>`,
  `lesson-done <unit>/<lesson>`, `checkpoint <unit>`, `placement`. Human output uses 1-based choice numbers;
  the API (and `--answers`) uses 0-based indexes. Lesson prose/prompts/feedback are printed as plain text
  (`plainText` strips Markdown, fenced code is indented). `answer` exits 1 on a wrong choice; `show` = giveUp.
- Checkpoint/placement: answers are never shown or judged before the whole quiz is submitted. Interactive only
  when `deps.stdinIsTTY` and `deps.prompter` exist and `--json` is off: one item at a time, invalid input is
  re-asked, Enter skips (null), EOF/Ctrl-C aborts without submitting (exit 1). Otherwise the quiz is printed
  (text or `--json`) and remembered as `lastQuiz` in config; `--answers id=index,...` (empty or `-` = skip)
  submits `--quiz <id>` or the remembered quiz of the same kind/unit. A failed checkpoint exits 1.

## Layout

- `src/main.ts` process entry (bin `fp`); wires real stdout/stderr/env, `stdin.isTTY` and the readline
  prompter into `runCli`.
- `src/cli.ts` argument parsing (node:util parseArgs), command dispatch, error translation. `runCli(argv, deps)`
  takes injected env, cwd, output sinks, `createClient`, `newKey`, `stdinIsTTY` and `prompter` so tests need no
  HTTP or terminal.
- `src/config.ts` config file load/save.
- `src/course.ts` text rendering (locale param) of the course, lessons, lesson answers, quizzes and their results;
  Markdown -> plain text helpers.
- `src/prompt.ts` `Prompter` and `readlinePrompter` (node:readline; queued lines for piped input, null on EOF).
- `src/project.ts` local Gleam project generation (gleam.toml, starter, public test module, PROMPT.md, .fp.json)
  and reading the learner's code back.
- `src/format.ts` text rendering (locale param) of trial runs, submissions, feedback, hints, sessions, progress.
- `src/messages.ts` message catalog (ko/en/zh), `LocalizedError`, locale normalization and resolution. Mirrors
  kernel's `pickLocale`/`formatMessage` because the CLI depends only on `@fp/api-contract`.

## Testing

`pnpm check:module @fp/cli`. Tests use a temp config dir + temp cwd and the recording fake in
`test/fixtures.ts` (implements `CliApi`); `test/project.test.ts` checks the generated layout,
`test/cli.test.ts` drives commands end to end through `runCli`; `test/locale.test.ts` covers the catalog
(every key has en/zh with the same placeholders), locale resolution, `fp lang` and per-locale output;
`test/course.test.ts` covers the course commands (scripted prompter for the interactive quiz, ko/en/zh
fakes whose content follows the account locale) and `readlinePrompter` over a PassThrough stream.

## Gotchas

- Project lookup for run/submit/hint/explain: explicit dir > `--dir` > cwd (if it has `.fp.json`) >
  `lastWorkDir` from config.
- Starter file paths come from the server; `writeProject` refuses paths that escape the project dir.
- Public test code may be a bare body (wrapped in `pub fn <id>_test()`) or full functions (kept verbatim);
  top-level `import` lines are hoisted and de-duplicated.
- Language is fixed to `gleam` for sessions/progress until more languages exist.
