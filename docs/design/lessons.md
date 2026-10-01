# Gleam basics lessons and placement (import of fpdojo)

Status: in progress (2026-10-01). Source: the earlier fpdojo project (~/workspace/fp-training, same author), 15 units,
64 lessons, 150 prose segments, 228 micro exercises (79 multiple choice, 149 predict-with-choices), Korean and English,
each wrong choice with its own explanation. Written for gleam 1.17 on the JavaScript target; re-verified on gleam 1.18.1
Erlang before import.

## Content format

```text
content/lessons/<unit-id>/unit.yaml            title, order, level (1-4), skill, prerequisites, lessons, source
content/lessons/<unit-id>/unit.<locale>.yaml   { title }
content/lessons/<unit-id>/<lesson-id>.yaml     title, tags, blocks (see below)
content/lessons/<unit-id>/<lesson-id>.<locale>.yaml
                                               { title?, blocks: { <block-id>: { markdown? | prompt?, code?, choices?,
                                                 feedback?: { correct?, choices?: { <index>: text } } } } }
```

A lesson alternates short prose segments and micro exercises:

```yaml
title: 값과 let
tags: [concept:basics]
blocks:
  - prose: intro
    markdown: |
      ...
  - exercise: bind-syntax
    type: choice            # choice = multiple choice about a fact; predict = "what does this evaluate to"
    prompt: Gleam에서 값을 이름에 묶는 올바른 문법은?
    code: |                 # optional
      ...
    choices: ["`x = 5`", "`let x = 5`", "`var x = 5`", "`const x = 5`"]
    answer: 1
    feedback:
      correct: 맞아요! ...
      choices: { 0: ..., 2: ..., 3: ... }
```

Overlay rules are the same as for exercises (content/README.md, Localization): ids and answers never change. Unlike
graded exercises, a lesson's localized `code` may translate comments and string literals (e.g. `"안녕"` → `"Hello"`),
because lesson items are answered by choice and each locale's choices are verified against its own code.

## Skills

Three new skills of a new track `basics`, ordered before the core track:

| skill | units |
|---|---|
| gleam-basics (값, 함수, case, Gleam에 없는 것, 의도적 크래시) | u01, u02, u03, u13, u14, u15 |
| gleam-types (커스텀 타입, 제네릭, opaque) | u04, u11, u12 |
| gleam-lists-recursion (리스트, 재귀, 꼬리 재귀, 함수를 값으로, list 모듈) | u05, u06, u07, u08 |

u09 (Option/Result) and u10 (use) are introductory lessons for the existing `explicit-failure` skill.
Lesson exercises are learning steps and unrated. Rated evidence comes from checkpoints and practice exercises.

## Checkpoints and placement

- Unit checkpoint: 6-10 items drawn from the unit's lesson exercises plus basics practice exercises, pass threshold
  80%. Passing records rated observations for the unit's skill (difficulty by level: L1 900, L2 1000, L3 1100, L4 1200).
- Placement (first visit, about 5 minutes, optional): 12-15 items on a difficulty ladder across units. The score band
  seeds the basics skills' ratings and marks units whose checkpoints are implied as passed, so learners who know Gleam
  go straight to the core track.

## Platform changes (after the localization work lands)

1. content: lessons loader + overlays + catalog API (`listLessonUnits`, `getLesson`, `getCheckpoint`), skill track `basics`.
2. grading: none (choice answers are checked without running code).
3. learner: accept checkpoint/placement observations.
4. sessions: lesson path (next lesson / checkpoint), placement flow, basics skills in recommendations.
5. api + web: lesson screen (prose ↔ exercise, per-choice feedback, retry without penalty), checkpoint, placement.
6. cli/mcp: lessons in text form.
