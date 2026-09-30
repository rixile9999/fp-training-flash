# @fp/grading

Submissions, evaluations and the Gleam language adapter (`CodeRunner`). Publishes
`grading.submission_evaluated`; knows nothing about ratings or LLMs. Schema: `grading`.

## Invariants

- Learner code is untrusted. Production uses only the Docker runner; the local runner is dev-only and
  logs an UNSANDBOXED warning on first use.
- Outcome precedence: rejected > compile_error > timeout > failed_tests > too_slow > passed.
  `system_error` = infrastructure failure: stored with `system_error = true`, event still published
  (consumers ignore it), and it does not consume an attempt number.
- `attemptNo` = 1 + earlier non-system-error submissions of (user, exercise id).
- `submit` is idempotent per (userId, idempotencyKey): unique constraint + in-process in-flight map.
  A key inserted by another process returns that stored (possibly still running) submission.
- The event is published after the evaluation is committed. Trial runs: public tests only, no perf, no
  storage, no events; a runner system error becomes `unavailable`.
- Hidden test code is revealed (`TestResult.code`) only for tests that did not pass.
- Rubric `automatedCheck`s only produce `rubricChecks`; they never change correctness/outcome.
- Performance verdict: `not_measured` when referenceCost is empty or tests failed; `too_slow` when a
  size timed out or learner/reference cost at the largest common size > maxCostRatio.
- Predict exercises never touch a runner: answer normalised (trim, collapse whitespace) vs acceptedAnswers.

## Static checks (src/grading/static-checks.ts), on learner files only

`@external` (outside comments/strings); imports of `fp_internal*`, `fp_runner*`, `gleeunit` /
`gleeunit/internal/*` (gleeunit.main halts the VM; `gleeunit/should` is fine), `*_test` or exercise test
modules; non-.gleam files, > 64 KB, NUL bytes. Without FFI, Gleam's stdlib has no file/net/os access.

## Layout

- `src/index.ts` composition root: `createGradingModule`, `migrations`, runner factories, pure helpers.
- `src/service/` service (submit/trialRun), repo (SQL), queue (bounded FIFO concurrency), migrations.
- `src/grading/` pure logic: static checks, rubric, buildRunJob, interpretRunOutput, predict.
- `src/gleam/source.ts` tiny lexer helpers (blank comments/strings, top-level fns, imports, names).
- `src/runner/` adapters: `project.ts` (job -> files + `.fp/job.json` + nonce), `protocol.ts` (stdout
  parsing, gleam diagnostics, compile-error attribution), `process.ts` (spawn with timeout/output cap),
  `tar.ts`, `docker.ts`, `local.ts`.
- `runners/gleam/`: `Dockerfile`, `build-image.sh` (tag `fp-gleam-runner:1.18.1`, base
  `ghcr.io/gleam-lang/gleam:v1.18.1-erlang-alpine` pinned by digest), `run-job.sh` (container entry: tar
  on stdin, `--info`), `entry.sh` (shared: `gleam build` then `erl -eval 'fp_internal@harness':main()`),
  `template/` (gleam.toml + manifest.toml with exact pins, harness `src/fp_internal/harness.gleam` +
  `src/fp_internal_harness_ffi.erl`).

## Runner protocol

Learner files -> `src/`, support files -> `src/`, test files -> `test/` (`gleam build` compiles test/ in
dev, so the harness can call `<module>.<fn>` directly). Stdout lines `@@FP:<nonce>@@{json}` are the only
trusted output; the nonce is random per job, stored in `.fp/nonce` and deleted (with job.json) before any
learner code runs, and the harness swaps the group leader so learner output is captured into failure
messages, never printed. Each test runs in a fresh process with `max_heap_size` (memoryMb) and a timeout
(remaining share of `timeMs` for the whole test phase). Perf: `setup(size)` then reductions of
`run(input)` in a fresh process, `timeMs` per size, only when all tests passed.
Compile errors: errors in learner files, or in test files mentioning a learner module/public name (e.g.
changed signature) -> `compile_error`; any other test/support error -> `system_error` (content bug).

## Docker sandbox flags

`--network none --read-only --tmpfs /work (noexec) --tmpfs /tmp --user 10001:10001 --memory/--memory-swap
(memoryMb + 512) --pids-limit 128 --cpus 1 --security-opt no-new-privileges --cap-drop ALL`, ulimits,
label `fp.grading=job`. Wall-clock limit -> `docker rm -f` (kills) + client SIGKILL; `docker rm -f` always
runs afterwards. stdout capped at 1 MB. /etc/passwd is chmod 600 in the image.

## Testing

`pnpm check:module @fp/grading`. Unit tests use a fake `CodeRunner` (test/helpers.ts) and PGlite.
`local-runner.test.ts` needs `gleam` on PATH; `docker-runner.test.ts` rebuilds the image (cached) and
needs Docker; set `FP_SKIP_DOCKER_TESTS=1` to skip it. `FP_GLEAM_IMAGE` overrides the tag.
Fixtures in test/fixtures come from content/exercises/orders-apply-coupon/base (+ runner probes).

## Gotchas

- The local runner compiles deps once into `runners/gleam/template/build` (gitignored) and copies it per
  job with preserved timestamps; do not commit build/.
- `ERL_INETRC` (file lookup only) avoids a ~5 s DNS wait per BEAM start under `--network none`.
- Changing the harness or template requires rebuilding the image (the docker test does this).
