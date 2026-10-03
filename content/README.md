# Content format (problem DB source)

Everything learners see is authored here as plain files, validated by content CI, and imported by the
content module as an immutable, versioned bundle. Code changes and content changes ship independently.

```text
content/
  skills.yaml                       skill graph (ids, names, track, order, prerequisites)
  concepts/<id>.md                  coding concept notes ("what to write")
  theory/<id>.md                    theory notes ("why it works"), topic-level, shared by many exercises
  exercises/<family-id>/
    family.yaml                     defaults shared by all variants of the family
    <variant-key>/
      exercise.yaml                 variant metadata (overrides family.yaml keys)
      prompt.md                     learner-facing statement (Korean)
      starter/<module>.gleam        starting code (implement/fix/refactor)
      solution/<module>.gleam       reference solution (never shown before the explanation is requested)
      explanation.md                reference explanation
      test/<module>_test.gleam      tests (gleeunit style); more test/ files allowed (e.g. perf module)
      support/*.gleam               optional exercise-owned src modules (e.g. shared types)
      wrong/<key>/<module>.gleam    representative wrong answers; each must fail its `mustFail` tests
  lessons/<unit>/                   Gleam basics lessons (docs/design/lessons.md)
  recall/                           recall cards (see "Recall cards" below)
  LICENSES/                         third-party license texts (e.g. Exercism MIT)
```

Ids: lowercase kebab-case (`[a-z0-9]+(-[a-z0-9]+)*`). Gleam module names: snake_case. The exercise id is
`<family-id>/<variant-key>@<version>`; the version is assigned by the importer and increases whenever the
variant's files change. Never reuse a family id for different content.

## family.yaml

| key | required | meaning |
|---|---|---|
| title | yes | Korean title |
| primarySkill | yes | skill id from skills.yaml |
| secondarySkills | no | skill ids |
| contextTags | no | business context tags, e.g. `[orders]` |
| source | yes | `{kind: original}` or `{kind: exercism, license, url, upstream}` |
| conceptNotes | no | ids under concepts/ |
| theoryTopics | no | ids under theory/ |
| rubric | no | list of `{id, title, description, automatedCheck?}`; ids like `R-02` |

Rubric ids are scoped to their family: coaching only cites the rubric of the exercise at hand, so `R-07` may mean
different things in different families. Reuse the sample's meanings for R-02 (pipeline shows intent), R-05 (extract
calculations) and R-09 (no `let assert`/`panic`) when the same idea applies.

`automatedCheck` is one of `{kind: forbid_pattern, pattern, message}`, `{kind: require_pattern, pattern, message}`,
`{kind: max_function_lines, max}`. Patterns are JavaScript regular expressions applied to the learner's source.

## exercise.yaml

| key | required | meaning |
|---|---|---|
| kind | yes | `implement`, `fix`, `refactor`, `predict` |
| format | yes | `drill` (3-7 min, fits a 15-min session) or `challenge` (long, optional) |
| module | yes (not predict) | learner module name; file is `src/<module>.gleam` |
| title | no | overrides family title |
| difficulty | yes | initial Elo difficulty: 1000 very easy, 1200 entry, 1400 solid, 1600 hard, 1800+ expert |
| estimatedMinutes | yes | integer |
| limits | no | `{timeMs, memoryMb}`, default `{timeMs: 10000, memoryMb: 256}` |
| tests | yes (not predict) | list of `{fn, name, visibility: public or hidden, errorTag?, requirements?}` |
| requirements | no | list of `{id, description}` evidenced by tests |
| hints | yes | exactly levels 1..5 with kinds question, concept, approach, partial_code, explanation |
| wrong | yes (implement/fix) | list of `{key, mustFail: [test fn...], errorTag?}` matching `wrong/<key>/` |
| performance | no | `{module, sizes: [..], maxCostRatio}`; `referenceCost` is written by content CI |
| predict | predict only | `{code, acceptedAnswers: [..]}` |
| primarySkill, secondarySkills, contextTags, conceptNotes, theoryTopics, rubric, source | no | override family |

Rules checked by content CI:

1. The reference solution passes every test; each wrong answer fails every test in its `mustFail`.
2. Two consecutive runs give identical results (no dependence on dict ordering, time or randomness without a fixed seed).
3. The starter compiles (warnings for `todo` are fine) and fails at least one test (not for `refactor`).
4. Every referenced skill, concept note and theory topic exists; every test `fn` exists in a test file.
5. No `@external` in learner-facing files. Tests use `gleeunit/should` (or Gleam `assert`).
6. Test names, prompts, hints and notes are Korean. Test names state the observable behaviour.
7. Public tests must be enough to understand the task; hidden tests cover edge cases and are revealed when they fail.

## Tests

Test modules are ordinary gleeunit tests: `pub fn <name>_test() { ... |> should.equal(...) }`.
The grader runs each listed function in isolation with a per-test timeout, so tests must not depend on each
other. Allowed dependencies in the grading project: `gleam_stdlib`, `gleeunit`, `qcheck`. Property tests use
`qcheck` with a fixed seed.

### Performance (algorithm exercises)

`performance.module` names a test-side module exposing

```gleam
pub fn setup(size: Int) -> Input   // deterministic input of the given size
pub fn run(input: Input) -> Output // calls the learner's function once
```

The grader measures BEAM reductions of `run` at each size. Content CI records the reference solution's costs as
`referenceCost`; a submission is `too_slow` when its cost at the largest size exceeds `maxCostRatio` times the
reference. Choose sizes where a naive complexity class differs by at least 10x from the intended one.

## Notes

Concept and theory notes are Markdown with YAML front matter.

```markdown
---
id: functor-structure-preservation
title: 구조를 보존하는 변환, 함자
level: basic            # theory only: basic | advanced
relatedSkills: [data-transformation]   # theory only
language: gleam         # concept only
source: { kind: original }             # concept only
furtherReading:         # theory only
  - text: 'Graham Hutton, "A tutorial on the universality and expressiveness of fold", JFP, 1999'
    url: https://...
    verified: false     # true only after a human checked the bibliographic data
---
Body in Korean. Gleam code blocks must compile on the grader's pinned versions. Content CI does not compile note
code yet, so authors and reviewers compile them by hand in a copy of the grader template.
```

Theory notes explain *why*; each ends with a short "이 개념이 쓰이는 곳" section instead of exercise-specific
text, because one topic is shared by many exercises.

## Recall cards

The "암기 / Recall / 记忆" tab (design: docs/design/recall.md; stdlib targets: docs/design/recall-targets.md).
Each card is one fact, practised in three stages: recognize (multiple choice), cloze (fill the blank, or type the
value for `predict`), produce (write a function body).

```text
recall/decks.yaml                 decks: [{ id, title, description, order }]       ids and orders unique
recall/decks.<l>.yaml             decks: { <id>: { title, description } }
recall/<deck>/<card-id>.yaml      one card (Korean source); <deck> must be a deck id; card id = file name,
                                  kebab-case, unique across all decks
recall/<deck>/<card-id>.<l>.yaml  overlay (prose only, see below)
```

Card keys (unknown keys are errors):

| key | |
|---|---|
| `title`, `topic`, `summary` | label, module (`gleam/list`) or syntax topic id, one-line summary |
| `order` | integer, unique within the deck; cards are served by order, then id (stdlib = rank in recall-targets.md) |
| `example` | one expression ending with `// -> <value>`; the text after the last `// ->` is its `string.inspect` |
| `imports` | e.g. `[gleam/list]` or `["gleam/list.{map}"]` (no aliases); used by every snippet |
| `definitions` | optional top-level Gleam code (types, helper functions) available to every snippet and the produce body |
| `signature`, `frequency` | optional (signature from stdlib.json) |
| `recognize` | `prompt`, `choices` (3-4, distinct), `answer` (index), `feedback: { correct, choices: { <i>: ... } }` with one explanation per wrong choice |
| `cloze` | `prompt`, `code` (one expression with exactly one `____`), `answers` (accepted fills, trimmed), `expected` |
| `predict` | optional: `prompt`, `code`, `expected` |
| `produce` | `prompt`, `header` (`pub fn name(...) -> T`, no body), `checks` (an expression calling it), `expected`, `mustUse` (optional tokens the body must contain), `reference` (a body), `hint` (optional) |

`expected` values are YAML strings holding `string.inspect` output: `expected: "6"`, `expected: '"abc"'`,
`expected: "Ok(1)"`. On Erlang a tuple whose first element is a constructor without fields prints like a record
(`#(Lt, 1)` -> `Lt(1)`); write what `string.inspect` actually prints.

Content CI (`node tools/content-ci/src/main.ts --recall-only [--card <id>]...`) evaluates, in the grading sandbox and
with the card's imports and definitions: the example (= its `// ->` value), every accepted cloze fill
(= `cloze.expected`), the predict code (= `predict.expected`), and `checks` after `<header> {\n<reference>\n}`
(= `produce.expected`). The loader checks the rest (choices, answer range, feedback keys, one blank, header shape,
`mustUse` tokens in the reference, the `// ->` comment).

Overlays translate prose only: `title`, `summary`, `example` and `definitions` (only comments may differ from the
Korean code), `recognize: { prompt, choices (same count and order), feedback: { correct, choices } }`,
`cloze: { prompt }`, `predict: { prompt }`, `produce: { prompt, hint }`. `answer`, `answers`, `expected`, `checks`,
`mustUse`, `reference`, `header`, `code` and `imports` are never allowed in an overlay. A card is complete in a
locale (listed in `RecallCard.locales`) when the overlay has the summary, every recognize field and feedback, every
prompt, the hint when the Korean card has one, the title when the Korean title has Hangul, a translated example /
definitions when the Korean code has Korean comments, and no Korean left. Incomplete overlays are served field by
field with Korean fallback; `node tools/content-ci/src/i18n-check.ts` lists what is missing.

## Third-party content

Exercism content (MIT, Copyright (c) 2021 Exercism) may be adapted. Keep `source.kind: exercism`, the upstream
slug and commit in `source.upstream`, and the license text in `LICENSES/exercism-gleam-MIT.txt`. Do not copy
from LeetCode, Advent of Code, Project Euler or textbooks.

## Localization (en, zh)

Korean files are the source of truth. Supported locales: `ko` (source), `en` (English), `zh` (Simplified Chinese).
Each translatable file may have a sibling per locale; anything missing falls back to Korean field by field.

```text
content/skills.<locale>.yaml                         skills: { <skill-id>: { name, description } }
content/concepts/<id>.<locale>.md                    front matter: id, title only; translated body
content/theory/<id>.<locale>.md                      front matter: id, title only; translated body
exercises/<family>/family.<locale>.yaml              { title?, rubric?: { <R-id>: { title?, description?, message? } } }
exercises/<family>/<variant>/exercise.<locale>.yaml  { title?, tests?: { <fn>: name }, requirements?: { <id>: description },
                                                       hints?: { 1: text, ... 5: text }, rubric?: { <R-id>: {...} } }
exercises/<family>/<variant>/prompt.<locale>.md
exercises/<family>/<variant>/explanation.<locale>.md
exercises/<family>/<variant>/starter.<locale>/<module>.gleam   only when the Korean starter contains Korean comments
```

`rubric.<id>.message` translates `automatedCheck.message`. Non-text fields (kind, difficulty, tests' visibility, error tags,
patterns, predict answers, performance) are never overlaid: they come from the Korean files only.

Rules:

1. Never change ids, code, identifiers, test function names, file names or numbers. Translate prose only, including
   comments inside ```gleam code blocks; the code itself must stay byte-identical apart from comments.
2. A localized starter is the Korean starter with only the comments translated. Content CI compiles it and requires it
   to fail like the Korean starter.
3. Every overlay key must exist in the Korean source (unknown test fn, requirement id, rubric id or hint level is an error).
4. A variant is fully translated into a locale (listed in `ExerciseSummary.locales`) when it has the prompt, the
   explanation, an exercise overlay with every test name and all five hints, the family title (in family.<locale>.yaml),
   and a localized starter whenever the Korean starter contains Hangul.
5. Use docs/i18n-glossary.md for terminology and tone. Chinese is Simplified Chinese (zh-Hans).
6. Korean inside Gleam string literals of graded code is test data and stays as is in localized starters and in code
   blocks of translated prompts. New exercises should prefer language-neutral literals (English words, numbers).
