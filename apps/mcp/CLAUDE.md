# @fp/mcp (`fp-mcp`)

MCP server that lets an AI host (Claude Desktop, Claude Code, ...) coach a learner through FP Training Flash.
Thin adapter over the HTTP API (`createApiClient` from `@fp/api-contract`); no business logic.

## Invariants

- The server `instructions` (src/instructions.ts) make the host act as a coach: never write the solution
  unless the learner revealed the explanation, prefer hints, relay test evidence. Exercise-presenting tool
  results end with `COACH_NOTE` for hosts that ignore instructions.
- Tool results always contain the essential problem content (prompt, starter code, public tests, hint
  count), because many clients ignore resources. Resources (`fp://exercise/{id}/concepts`,
  `fp://exercise/{id}/theory`, `fp://theory/{id}`) are extras; reading an exercise's notes records
  `noteOpened`.
- Never render unrevealed hints, hidden tests or predict accepted answers.
- Every tool handler is wrapped in `safe()`: API errors become localized `isError` results, never throws.
- `submit_solution` links the active session only when the exercise is its current item (best effort).
- Output text is in the learner's locale: `user.locale` from `/v1/me`, fetched once and cached per server
  instance (deps.locale / `FP_LANG` fixes it; Korean while `/v1/me` fails, retried next call). Strings live in
  `src/messages.ts` (ko/en/zh, missing -> ko). `structuredContent` carries ids/outcomes plus `locale`.
- Tool titles/descriptions, input schema descriptions and the server instructions stay English; the
  instructions tell the host to talk to the learner in `user.locale`, and the coach note names it.
- Gleam basics course: lesson exercises are unrated (retry freely); `answer_lesson_exercise` with `choice: "show"`
  is giveUp and the only way a wrong attempt reveals the answer. Checkpoint/placement quizzes return every item
  (never answers); the instructions and `quizNote` tell the host to present one item at a time and reveal or
  judge nothing until `submit_*` is called once with all answers. `get_lesson` ends with `lessonNote`.
  Choice indexes are 0-based everywhere and rendered as `[0]`, `[1]`, ...

## Tools

start_session, current_exercise, get_exercise, run_code, submit_solution, get_feedback, request_hint,
get_explanation, get_progress, recommend_exercise, skip_item; course: get_course, get_lesson {unit_id, lesson_id},
answer_lesson_exercise {unit_id, lesson_id, exercise_id, choice: index | "show"}, complete_lesson {unit_id,
lesson_id}, start_checkpoint {unit_id}, submit_checkpoint {quiz_id, answers}, start_placement,
submit_placement {quiz_id, answers} (answers: itemId -> index | null).

## Layout

- `src/main.ts` stdio entry; reads `FP_TOKEN` / `FP_API_URL` (default http://localhost:8787) / optional `FP_LANG`.
- `src/server.ts` `createFpMcpServer({ api, language?, locale?, newKey?, version? })`: tool and resource registration.
  `api` may be a factory, called per request.
- `src/api.ts` `FpApi` (subset of ApiClient), `apiFromEnv`, localized error descriptions.
- `src/format.ts` Markdown/text rendering (locale param) of exercises, runs, submissions, feedback, progress.
- `src/lessons.ts` Markdown rendering (locale param) of the course, lessons, answers, quizzes and quiz results.
- `src/messages.ts` message catalog; mirrors kernel's `pickLocale`/`formatMessage` (no kernel dependency).
- `src/instructions.ts` server instructions, `coachNote(locale)`, `lessonNote(locale)`, `quizNote(locale)`.

## Testing

`pnpm check:module @fp/mcp`. `test/server.test.ts` connects an SDK `Client` over `InMemoryTransport` to a
server built with the recording fake API in `test/fixtures.ts`; no HTTP. `test/locale.test.ts` covers the
catalog, en/zh output, the `/v1/me` cache and the Korean fallback. `test/course.test.ts` covers the course tools
with fakes whose content follows the learner locale (ko/en/zh).

## Gotchas

- stdout is the protocol channel in stdio mode: diagnostics go to stderr only.
- Use the current `McpServer.registerTool/registerResource` API with zod v4 raw shapes as input schemas.
