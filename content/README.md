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
Body in Korean. Gleam code blocks must compile (content CI extracts ```gleam blocks marked `run`).
```

Theory notes explain *why*; each ends with a short "이 개념이 쓰이는 곳" section instead of exercise-specific
text, because one topic is shared by many exercises.

## Third-party content

Exercism content (MIT, Copyright (c) 2021 Exercism) may be adapted. Keep `source.kind: exercism`, the upstream
slug and commit in `source.upstream`, and the license text in `LICENSES/exercism-gleam-MIT.txt`. Do not copy
from LeetCode, Advent of Code, Project Euler or textbooks.
