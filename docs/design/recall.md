# Recall: memorizing Gleam syntax and core library

Status: in progress (2026-10-03). Decisions: separate "암기 / Recall / 记忆" tab; production (writing code) is the core;
first scope is syntax (~60 cards), the 50 most used gleam_stdlib functions (docs/design/recall-targets.md) and
pitfalls (~30 cards).

## Cards and stages

Each card is one fact. A card climbs three stages; a correct answer at the current stage can promote it on a
later review, a wrong answer drops it one stage.

| stage | form | graded by |
|---|---|---|
| 0 recognize | multiple choice with per-choice feedback | index |
| 1 cloze | one blank in code (`list.____(...)`) or a typed value for "predict" | accepted fills, or the typed value evaluated in the sandbox |
| 2 produce | write a function body under a given header | sandbox: the body is wrapped in the header, `checks` (several calls) is evaluated and compared with `expected`; `mustUse` tokens must appear |

Writing a body checked on several inputs means a literal answer cannot pass, and `mustUse` makes a function card
actually exercise that function.

A card is mastered when it is at stage 2, its latest produce answer was correct and its FSRS stability is at least
21 days.

## Scheduling

Per (user, card): FSRS state (difficulty, stability, due, reps, lapses) plus the stage. The policy is a pure,
versioned module like elo-v1 so it can be replaced. Ratings are derived automatically: wrong -> again; correct and
slow -> hard; correct -> good; correct and fast at stage >= 1 -> easy. New cards: at most 10 per day (setting).

## Session (about 10 minutes)

1. Due reviews, interleaved across decks (no more than two cards of the same module in a row).
2. New cards: a one-line summary and an example, then the recognize question immediately.
3. Mix: cloze items for today's new cards and a few older ones.
4. Finale: one produce item from 4 minutes, two from 10 minutes. Their time is reserved first, so even a new
   learner's first session ends with writing code (today's new cards fill the finale when no card is at stage 2).
5. Summary: answered, accuracy, cards learned, due tomorrow, mastery per deck.

Recall does not change Elo ratings in this version (to avoid inflating skills by memorization); this may be added
later with a low weight.

## Content format

```text
content/recall/decks.yaml                 decks: [{ id, title, description, order }]
content/recall/decks.<l>.yaml             { decks: { <id>: { title, description } } }
content/recall/<deck>/<card-id>.yaml      a card (Korean source)
content/recall/<deck>/<card-id>.<l>.yaml  overlay: { title?, summary, example?, recognize: { prompt, choices, feedback },
                                            cloze: { prompt }, produce: { prompt, hint? }, predict?: { prompt } }
```

Card fields (Korean source):

```yaml
title: list.fold                    # short label
topic: gleam/list                   # module, or a syntax topic id
order: 2                            # position in the deck (unique per deck; stdlib = rank in recall-targets.md)
summary: 리스트를 왼쪽부터 접어 하나의 값으로 만듭니다.
example: |                          # one expression, with `// -> value`; verified in the sandbox
  list.fold([1, 2, 3], 0, fn(acc, x) { acc + x })  // -> 6
imports: [gleam/list]               # for example, cloze, predict and produce
definitions: |                      # optional top-level types/functions (syntax cards: records, custom types)
  pub type Shape { Circle(r: Float) Square(side: Float) }
signature: "list.fold(over: List(a), from: b, with: fn(b, a) -> b) -> b"   # optional, from stdlib.json
frequency: 39                       # optional
recognize:
  prompt: ...
  choices: [...]                    # 3-4
  answer: 1
  feedback: { correct: ..., choices: { 0: ..., 2: ... } }
cloze:                              # `code` is one expression with exactly one ____
  prompt: 빈칸을 채우세요.
  code: "list.____([1, 2, 3], 0, fn(acc, x) { acc + x })"
  answers: [fold]                   # accepted fills, compared after trimming
  expected: "6"                     # string.inspect of the filled code
predict:                            # optional second stage-1 form: type the value
  prompt: 이 식의 값은?
  code: "list.fold([1, 2, 3], 0, fn(acc, x) { acc - x })"
  expected: "-6"
produce:
  prompt: 정수 리스트의 합을 돌려주는 함수 본문을 쓰세요.
  header: "pub fn total(xs: List(Int)) -> Int"
  checks: "#(total([1, 2, 3]), total([]), total([5]))"
  expected: "#(6, 0, 5)"
  mustUse: [list.fold]              # optional literal tokens required in the body
  reference: "list.fold(xs, 0, fn(acc, x) { acc + x })"
  hint: ...                         # optional
```

The example is one expression (it may span lines, e.g. a block `{ let x = 1  x + 1 }`); the text after its last
`// ->` is the expected `string.inspect` value. Every snippet is evaluated with the card's `imports` and
`definitions`. Produce wraps the body as `<header> {\n<body>\n}` after the definitions, then evaluates `checks`.

Rules (checked by content CI with the sandbox): the example's value matches its `// ->` comment; every accepted
cloze fill produces `expected`; predict code produces `expected`; the produce reference compiles, uses every
`mustUse` token and produces `expected`; recognize answer index in range and every wrong choice has feedback.
Overlays translate prose only (titles, prompts, choices that are prose, feedback, hints, comments in examples);
code, answers, expected values and checks never change. Use docs/i18n-glossary.md.
