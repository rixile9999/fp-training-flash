# ADR 0002: Coaching LLM provider and model

- Status: accepted (2026-09-30)

## Decision

Coaching uses Alibaba Cloud Model Studio (DashScope, international endpoint, prepaid pay-as-you-go key) with
`qwen3.8-flash`, thinking disabled, strict `json_schema` output, prompt version `coach-v3`. Anthropic remains
available (`FP_LLM_PROVIDER=anthropic`, default `claude-opus-5`); without any key coaching is rule-based.

Configuration: `DASHSCOPE_API_KEY`, optional `FP_LLM_PROVIDER`, `FP_COACH_MODEL`, `DASHSCOPE_BASE_URL`,
`FP_COACH_THINKING=on`.

## Evidence

`tools/coach-eval` graded five fixed answers to the sample exercise with the real Docker grader and asked each
model for feedback (5 scenarios) and chat replies (4 scenarios, including a prompt injection and a request for the
full solution), twice each. Nine blind judges scored the anonymized outputs (1-10 overall; 1-5 accuracy, pedagogy,
Korean, concision, safety).

| model | overall | pedagogy | schema-valid | p50 latency | $ in / out per 1M |
|---|---|---|---|---|---|
| qwen3.8-27b | 6.47 | 3.94 | 15/18 | 12.7 s | 0.5 / 3 |
| qwen3.8-flash | 6.39 | 4.00 | 18/18 | 8.1 s | 0.15 / 0.47 |
| kimi-k3 | 6.17 | 3.11 | 18/18 | 15.7 s | 3 / 15 |
| qwen3.8-max | 5.61 | 2.61 | 18/18 | 12.1 s | 2 / 6 |
| deepseek-v4-pro | 5.61 | 3.17 | 18/18 | 7.7 s | 2.4 / 4.8 |
| qwen3.7-max | 5.56 | 3.06 | 18/18 | 10.0 s | 2.5 / 7.5 |
| deepseek-v4-flash | 4.56 | 2.94 | 17/18 | 5.7 s | 0.2 / 0.4 |
| glm-5.3 | - | - | 0/18 | - | 1.4 / 4.4 |

glm-5.3 rejects `enable_thinking=false`. Larger models were not better coaches: they tended to hand over the fix.

Prompt iteration on qwen3.8-flash (blind, 9 scenarios x 2 reps):

| prompt | overall | pedagogy | safety | best in scenario |
|---|---|---|---|---|
| coach-v1 | 6.00 | 3.39 | 4.11 | 2/9 |
| coach-v2 (no fixed expression before passing, no invented requirements, no emoji) | 6.89 | 4.11 | 4.67 | 7/9 |

coach-v3 adds Gleam syntax facts (no if/else, `{ }` grouping) after the model suggested `if` and `( )` grouping.

## Consequences

- Latency is about 8-11 s per feedback; the web and CLI show grading results first and load coaching separately.
- Re-run `node tools/coach-eval/src/main.ts --models <ids> --reps 2` after prompt or model changes.
- Token Plan keys must not be used: their terms forbid application backends.
