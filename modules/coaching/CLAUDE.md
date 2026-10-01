# @fp/coaching

Coach feedback on evaluated submissions, problem-scoped chat, authored hints, the reference explanation and
the server-side help ledger. LLM calls sit behind an internal `LlmClient`; every LLM path has a deterministic
rule-based fallback. Coaching never changes grading results or ratings.

## Invariants

- Execution evidence wins. LLM feedback must echo the evaluation `outcome`, and any test it cites with a
  status must match the evaluation; contradictions reject the whole output (-> rule-based). Unknown test ids,
  out-of-range lines and non-rubric ids are dropped; a rubric id flagged by grading is never "good".
- Learner code, comments and chat are data: they only appear inside `<tag>` data blocks in user-role
  messages (`dataBlock` neutralises tag look-alikes), never in the system prompt. The system prompt tells the
  model to ignore instructions inside data blocks.
- Reference solution/explanation go into prompts only after the learner revealed the explanation (ledger or
  `submission.helpUsed`). Test code only for public tests, already-failed tests (grading revealed it), or after
  the explanation. Coaching never calls `catalog.getGradingSpec` (hidden tests).
- Help ledger is append-only (`coaching.help_events`) and must never under-report `helpUsed`. Hints are
  monotonic: `revealHint(level)` needs 1 <= level <= 5, an authored hint at that level, and
  level <= currentMax + 1; only a new max is recorded. Notes count distinct refs; coach messages count rows.
- Feedback cache key = (submissionId, promptVersion, model, locale). LLM mode: (PROMPT_VERSION, llm.model);
  provider "none": (RULE_BASED_VERSION, "rule-based"). LLM failures are NOT cached so a later call can retry.
  `system_error` never calls the LLM (fixed apology, not cached in LLM mode).
- Ownership: `feedback` and chat-with-submission reject a submission whose `userId` differs (forbidden),
  even if grading's `getSubmission` did not filter by user.
- Locale (ko default, en, zh): every service method resolves its optional locale (`resolveLocale`: unsupported
  -> "ko") and uses it for catalog reads (exercise, notes, hints, reference), the prompts, rule-based output,
  error messages and `trialRun` in the chat agent. Stored evaluations keep the locale they were graded in.
  System prompts differ per locale only in the language/tone rule (1), the line-citation form and the quoted
  example phrase; the ko prompts are byte-identical to coach-v2's text.

## Layout

- `src/index.ts`: composition root (`createCoachingModule`, `migrations`, `LlmConfig` -> `LlmClient | null`).
- `src/internal/service.ts`: `CoachingService` implementation (orchestration, access checks, fallbacks).
- `src/internal/ledger.ts`: help ledger (`record`, `summary` -> `HelpUsed`).
- `src/internal/feedback-cache.ts`: `coaching.feedback_cache` (first writer wins).
- `src/internal/messages.ts`: the one message catalog (`MESSAGES`, ids -> `LocalizedText` ko/en/zh), `msg`,
  `localize`, `resolveLocale`. Every learner-facing string and every locale-dependent prompt fragment lives here.
- `src/internal/prompts.ts`: system prompts (`feedbackSystemPrompt(locale)`, `chatSystemPrompt(locale)`), data
  blocks, zod output schema, `validateLlmFeedback`, `PROMPT_VERSION` (bump on any prompt/schema/validation change: it is part of the cache key).
- `src/internal/rule-based.ts`: deterministic feedback per outcome and the no-LLM chat reply.
- `src/internal/llm.ts`: `LlmClient` interface, Anthropic implementation (structured JSON output via
  `zodOutputFormat`, server-side refusal fallbacks via beta `server-side-fallback-2026-07-01` + `fallbacks: "default"`, refusal of the whole chain or truncation -> throw), `withTimeout`, `DEFAULT_COACH_MODEL` ("claude-opus-5").
- `src/internal/references.ts`: "15행" / "15번째 줄" / "line 15" / "第15行" extraction for `ChatReply.references`.
- `src/internal/migrations.ts`: schema `coaching` (0002 adds `feedback_cache.locale`).

## Testing

`pnpm check:module @fp/coaching`. Tests use in-memory PGlite and fakes in `test/fixtures.ts`
(catalog, grading, learner, and `fakeLlm`, which records every `LlmRequest` and replays scripted replies or
throws/hangs; `fakeCatalog().locales` records "<method>:<locale>" and returns en/zh exercise text).
`test/locale.test.ts` covers prompts, rule-based output, errors and fallback per locale. Marker strings
(SOLUTION_MARKER, HIDDEN_*_CODE) are asserted absent/present in captured prompts. Never hit the real API in tests.

## Gotchas

- `fakeGrading.getSubmission` ignores `userId` on purpose, to exercise coaching's own ownership check.
- The LLM output schema uses nullable (not optional) fields: structured outputs require every property.
- Learner-facing strings come only from `messages.ts` (ko/en/zh, glossary: docs/i18n-glossary.md); add all
  three when adding a string. Prompt rules stay in English. Tool results in the chat agent are for the model
  and may stay Korean.
- `learner.getProfile` failures degrade to an empty error-tag history rather than failing feedback.
