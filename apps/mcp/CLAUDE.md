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

## Tools

start_session, current_exercise, get_exercise, run_code, submit_solution, get_feedback, request_hint,
get_explanation, get_progress, recommend_exercise, skip_item.

## Layout

- `src/main.ts` stdio entry; reads `FP_TOKEN` / `FP_API_URL` (default http://localhost:8787) / optional `FP_LANG`.
- `src/server.ts` `createFpMcpServer({ api, language?, locale?, newKey?, version? })`: tool and resource registration.
  `api` may be a factory, called per request.
- `src/api.ts` `FpApi` (subset of ApiClient), `apiFromEnv`, localized error descriptions.
- `src/format.ts` Markdown/text rendering (locale param) of exercises, runs, submissions, feedback, progress.
- `src/messages.ts` message catalog; mirrors kernel's `pickLocale`/`formatMessage` (no kernel dependency).
- `src/instructions.ts` server instructions and `coachNote(locale)`.

## Testing

`pnpm check:module @fp/mcp`. `test/server.test.ts` connects an SDK `Client` over `InMemoryTransport` to a
server built with the recording fake API in `test/fixtures.ts`; no HTTP. `test/locale.test.ts` covers the
catalog, en/zh output, the `/v1/me` cache and the Korean fallback.

## Gotchas

- stdout is the protocol channel in stdio mode: diagnostics go to stderr only.
- Use the current `McpServer.registerTool/registerResource` API with zod v4 raw shapes as input schemas.
