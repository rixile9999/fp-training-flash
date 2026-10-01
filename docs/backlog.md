# Backlog: open issues and next steps

Collected on 2026-10-01 from implementation reports, reviews and evaluations. Priorities: P1 = fix before real
learners use it, P2 = quality or maintainability, P3 = product extensions. Each item names where it lives.

## P1: correctness and integrity

| # | area | issue | proposed fix |
|---|---|---|---|
| 1 | lessons | A learner can open the lesson exercise, press "정답 보기" (giveUp) and then answer the same item in an open checkpoint or placement. Quiz items are lesson exercises. | Give checkpoints and placement their own item pool (new choice/predict items per unit, or basics drills), or hide giveUp for items of an open quiz. |
| 2 | lessons, learner | One checkpoint records 10 rated observations at once, so a single attempt moves the rating a lot (1200 → 1030 in a test) and ends "provisional" immediately. | Weight quiz items (e.g. K/n per quiz), or record one aggregated observation per quiz; revisit provisional rules for quiz evidence. |
| 3 | platform | The in-process event bus has no outbox: a crash between commit and publish loses the event (learner/sessions/lessons updates). Recovery exists only for running submissions. | Add an outbox table and a dispatcher; replay on startup. |
| 4 | accounts | Login is a development login by display name. | Real identity provider (e.g. Google OAuth) before any public deployment. |
| 5 | content | 19 theory notes and several exercise explanations cite literature with `verified: false`. | Human check of every citation; set `verified: true`. |
| 6 | platform | `./fpctl up` (stable mode) runs the last commit against the shared `.data/pglite`. A database migrated by a newer `--dev` run may not match older code. | Separate data dirs per mode, or refuse to start when the DB has migrations unknown to the code. |

## P2: quality and maintainability

| # | area | issue | proposed fix |
|---|---|---|---|
| 7 | web | `@fp/web` is at ~119.9k of the 120k context budget; some UI extras were dropped to fit. | Split web into packages (shell, training, course, progress) or raise the budget deliberately. |
| 8 | web | `src/api/generated/fake-lessons.ts` was produced by a one-off script outside the repo. | Add a tool (in tools/) that regenerates it from content/lessons. |
| 9 | web, sessions, coaching | After a language switch, text already rendered stays in the old language: session item reasons (stored at session start), feedback on screen, quizzes in progress, stored evaluations (rendered at submit). | Store message keys + params instead of rendered text, or re-fetch on switch. |
| 10 | content CI | Gleam code blocks in concept/theory notes and lesson prose are not compiled automatically (reviewers compiled them by hand). | Extract ```gleam blocks and compile them in content CI with the grader template. |
| 11 | content | Some en/zh explanations name theory notes by provisional titles that differ from the final note titles. | Scripted cross-check of note references per locale, then fix. |
| 12 | content | Some graded exercises compare Korean string literals, which en/zh learners must type verbatim. | New content uses language-neutral literals; consider rewriting the worst cases. |
| 13 | content | Some hidden-test errorTags have no wrong answer that triggers them; rubric ids are family-scoped and reused with different meanings. | Add wrong answers per tag; keep a rubric/errorTag registry if aggregation across families is needed. |
| 14 | content | The DP drills (change, knapsack, edit-distance base: 7 min, 1550) sit at the top of the drill range. | Watch real completion times; move to challenge format if they run long. |
| 15 | i18n | Korean UI strings mix 합니다체 and 해요체 (glossary asks for 해요체). New course terms and translator choices (多选模式, 函数捕获, 课/单元测验/分级测试) are not in the glossary. | One pass over all ko catalogs; extend docs/i18n-glossary.md. |
| 16 | grading | Per-test timeout is the remaining budget of the whole test phase; compile errors in test files are attributed to the learner by a name heuristic; runner system errors show two rejection reasons (localized + English diagnostic). | Fixed per-test budget; structured attribution from the compiler; show only the localized reason in UIs. |
| 17 | api | Rate limiting is in memory per process; lesson routes are not rate-limited. | Shared limiter (DB or Redis) when running more than one instance; add limits to quiz routes. |
| 18 | clients | MCP caches the learner's locale for the server's lifetime; CLI falls back to the system LANG (often en_US on macOS) when not logged in; interactive `fp placement` was not tested in a real terminal. | Re-read /v1/me per tool call or on a TTL; prefer account locale; manual terminal test. |
| 19 | coaching | Anthropic provider path is only tested with fakes (no live call). | One live smoke test when a key is available. |
| 20 | docs | proposal.md predates the decisions in plan.md and this session (stack, Elo, lessons, i18n, DashScope). | Update or mark as historical; keep plan.md and docs/adr as the source of truth. |

## P3: product extensions

| # | area | item |
|---|---|---|
| 21 | coaching | Chat agent prototype (`FP_COACH_CHAT_AGENT=on`): better on fact questions (5.88 vs 4.50) but longer and slower. Next: route only library/syntax/code questions to the agent; guard that tool results never relax the no-solution rule; filter stray non-target-language tokens. See docs/adr/0002. |
| 22 | coaching | All tested models tend to hand over the fix before the learner passes; keep measuring with tools/coach-eval after prompt changes. |
| 23 | basics | Practice drills for the three basics skills (implement/fix, plus a "make it compile" fix_error type whose starter does not compile; content CI currently requires starters to compile). |
| 24 | basics | Import the fpdojo theory track design (12 units: purity, equational reasoning, ADT algebra, monoids, functors, monads, lambda calculus; ~/workspace/fp-training/docs/design/fp-theory-curriculum.md). Only one lesson exists there. |
| 25 | learner | Replace elo-v1 with Glicko-2 (fpdojo has a pure implementation) and consider an 8-level SRS per family with variant rotation; replay the observation log to compare. |
| 26 | web | Recent sessions come from localStorage because the API has no session list endpoint. |
| 27 | platform | In-browser compile (Gleam WASM) for instant "run" without the server; see ~/workspace/fp-training/docs/research/gleam-in-browser.md. |
| 28 | ops | Production deployment: PostgreSQL, container for the API, sandbox capacity planning, DashScope/LLM cost monitoring, backups, data retention policy for submitted code. |
