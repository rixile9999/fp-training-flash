# Architecture

Modular monolith with two isolated execution concerns (untrusted code execution, LLM calls). Modules are
packages whose only public surface is a contract file; the dependency graph is a DAG checked in CI.

```text
apps/web ─┐
apps/cli ─┼─ HTTP ─> apps/api (composition root: wiring, migrations, HTTP mapping, auth)
apps/mcp ─┘                │
                           ├─ accounts
                           ├─ content ────────────┐  (problem DB, loaded from /content bundles)
                           ├─ grading ─> CodeRunner ─> Docker sandbox (gleam + Erlang/OTP, no network)
                           ├─ learner  (Elo, reviews, error tags; replayable observation log)
                           ├─ sessions (session builder, recommender)
                           └─ coaching (feedback, chat, hints, help ledger; LLM gateway + rule-based fallback)
tools/content-ci: /content -> validate -> run reference + wrong answers on the real runner -> perf baselines
```

Declared module dependencies (contracts only):

| module | depends on | publishes | consumes |
|---|---|---|---|
| accounts | kernel | - | - |
| content | kernel | content.bundle_imported | - |
| grading | kernel, content | grading.submission_evaluated | - |
| learner | kernel, content, grading | learner.rating_updated | grading.submission_evaluated |
| sessions | kernel, content, grading, learner | sessions.session_completed | grading.submission_evaluated |
| coaching | kernel, content, grading, learner | - | - |

## Key flows

**Submit.** api authenticates, asks coaching for the server-side `helpUsed`, calls `grading.submit`. Grading
runs static checks, builds a `RunJob` from the exercise's `GradingSpec`, runs it on the `CodeRunner`, interprets
the output into an `Evaluation`, stores it, publishes `grading.submission_evaluated`. Learner turns the event
into an `Observation` and updates Elo/reviews/error tags; sessions advances the session item. api returns the
submission plus the rating change. Coaching feedback is requested separately so an LLM delay never blocks
results.

**Ratings.** Elo per (user, skill, language). Rated observations are first attempts without the explanation and
with hint level <= 2. Algorithm-track skills require correctness and acceptable performance. The observation log
is the source of truth; `replayAll()` recomputes everything with the active policy version, so the Elo policy
can be replaced safely.

**Content.** Authored under /content, validated by content CI with the real runner, imported as an immutable
bundle. Exercise ids pin a version; old submissions stay reproducible.

## Security

Learner code is untrusted. Production runs it only in the Docker runner: `--network none`, read-only root,
tmpfs work dir, non-root user, memory/cpu/pids limits, wall-clock timeout, output size cap. Static checks reject
`@external` and imports of grader-internal modules. The local runner is for development only.
Learner code and chat messages are data for the coach, never instructions; hidden tests and reference solutions
are not included in hint/chat context unless the learner has revealed the explanation.
