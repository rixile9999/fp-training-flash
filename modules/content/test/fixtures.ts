/** Small content trees written to temp directories for loader and importer tests. */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_CONTENT_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../../content");

export type Files = Record<string, string>;

const HINTS = `hints:
  - { level: 1, kind: question, text: 질문 }
  - { level: 2, kind: concept, text: 개념 }
  - { level: 3, kind: approach, text: 접근 }
  - { level: 4, kind: partial_code, text: 부분 코드 }
  - { level: 5, kind: explanation, text: 해설 }
`;

const TEST_FILE = `import gleeunit/should
import sums.{total}

pub fn adds_numbers_test() {
  total([1, 2, 3])
  |> should.equal(6)
}

pub fn empty_is_zero_test() {
  // 빈 목록 { 괄호 } 는 무시된다
  total([])
  |> should.equal(0)
}

pub fn big_numbers_test() {
  total([1_000_000, 2_000_000])
  |> should.equal(3_000_000)
}
`;

/** A valid tree: two skills, one concept, one theory topic, one implement variant and one predict variant. */
export function baseFiles(): Files {
  return {
    "skills.yaml": `skills:
  - { id: data-transformation, name: 데이터 변환, track: core, order: 1, description: 변환, prerequisites: [] }
  - { id: recursive-algorithms, name: 재귀, track: algorithm, order: 2, description: 재귀, prerequisites: [data-transformation] }
`,
    "concepts/list-fold.md": `---
id: list-fold
title: 접기
language: gleam
source: { kind: original }
---
fold 설명.
`,
    "theory/folds.md": `---
id: folds
title: 접기의 이론
level: basic
relatedSkills: [data-transformation]
furtherReading:
  - text: 'Hutton, "A tutorial on fold"'
    url: https://example.org/fold
---
이론 본문.

## 이 개념이 쓰이는 곳

- 합계
`,
    "exercises/sum-list/family.yaml": `title: 목록 합계
primarySkill: data-transformation
contextTags: [numbers]
source: { kind: original }
conceptNotes: [list-fold]
theoryTopics: [folds]
rubric:
  - id: R-01
    title: 재귀 대신 fold
    description: fold를 쓴다.
    automatedCheck: { kind: forbid_pattern, pattern: "\\\\bpanic\\\\b", message: panic 금지 }
`,
    "exercises/sum-list/base/exercise.yaml": `kind: implement
format: drill
module: sums
difficulty: 1200
estimatedMinutes: 4
tests:
  - { fn: adds_numbers_test, name: 숫자를 더한다, visibility: public, requirements: [R1] }
  - { fn: empty_is_zero_test, name: 빈 목록은 0, visibility: public }
  - { fn: big_numbers_test, name: 큰 수, visibility: hidden, errorTag: overflow }
requirements:
  - { id: R1, description: 합계 }
${HINTS}wrong:
  - { key: always-zero, mustFail: [adds_numbers_test], errorTag: ignores_input }
performance:
  module: sums_perf
  sizes: [10, 1000]
  maxCostRatio: 3
  referenceCost: [120, 9000]
`,
    "exercises/sum-list/base/prompt.md": "정수 목록의 합을 구하세요.\n",
    "exercises/sum-list/base/explanation.md": "SECRET_EXPLANATION fold로 더합니다.\n",
    "exercises/sum-list/base/starter/sums.gleam": "pub fn total(xs: List(Int)) -> Int {\n  todo\n}\n",
    "exercises/sum-list/base/solution/sums.gleam":
      "import gleam/list\n\npub fn total(xs: List(Int)) -> Int {\n  list.fold(xs, 0, fn(acc, x) { acc + x }) // SECRET_SOLUTION\n}\n",
    "exercises/sum-list/base/support/num_types.gleam": "pub type Num =\n  Int\n",
    "exercises/sum-list/base/test/sums_test.gleam": TEST_FILE,
    "exercises/sum-list/base/test/sums_perf.gleam":
      "import sums\n\npub fn setup(size: Int) -> List(Int) {\n  [size]\n}\n\npub fn run(xs: List(Int)) -> Int {\n  sums.total(xs)\n}\n",
    "exercises/sum-list/base/wrong/always-zero/sums.gleam": "pub fn total(_xs: List(Int)) -> Int {\n  0\n}\n",
    "exercises/predict-map/family.yaml": `title: map 결과 예측
primarySkill: data-transformation
source: { kind: exercism, license: "MIT, Copyright (c) 2021 Exercism", upstream: "gleam/lists@abc123" }
`,
    "exercises/predict-map/base/exercise.yaml": `kind: predict
format: drill
difficulty: 1000
estimatedMinutes: 1
title: 두 배로 만들기
primarySkill: recursive-algorithms
${HINTS}predict:
  code: "list.map([1, 2], fn(x) { x * 2 })"
  acceptedAnswers: ["[2, 4]"]
`,
    "exercises/predict-map/base/prompt.md": "결과는 무엇일까요?\n",
    "exercises/predict-map/base/explanation.md": "각 원소를 두 배로 합니다.\n",
  };
}

const created: string[] = [];

/** Writes `files` into a fresh temp directory and returns its path. */
export async function writeTree(files: Files, dir?: string): Promise<string> {
  const root = dir ?? (await mkdtemp(join(tmpdir(), "fp-content-")));
  if (!dir) created.push(root);
  await rm(root, { recursive: true, force: true });
  await mkdir(root, { recursive: true });
  for (const [path, text] of Object.entries(files)) {
    const full = join(root, path);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, text);
  }
  return root;
}

export async function cleanupTrees(): Promise<void> {
  while (created.length > 0) await rm(created.pop() ?? "", { recursive: true, force: true });
}

/** Returns a copy of `files` without every path starting with `prefix`. */
export function without(files: Files, prefix: string): Files {
  return Object.fromEntries(Object.entries(files).filter(([p]) => !p.startsWith(prefix)));
}

/**
 * Translations for `baseFiles()`: a complete English translation of sum-list/base and of predict-map/base,
 * a partial Chinese one (family title, prompt, skill name, theory note), and en/zh skill and note overlays.
 */
export function translationFiles(): Files {
  return {
    "skills.en.yaml": `skills:
  data-transformation: { name: Data transformation, description: Transforming data }
  recursive-algorithms: { name: Recursion }
`,
    "skills.zh.yaml": "skills:\n  data-transformation: { name: 数据转换 }\n",
    "concepts/list-fold.en.md": "---\nid: list-fold\ntitle: Fold\n---\nAbout fold.\n",
    "theory/folds.zh.md": "---\nid: folds\ntitle: 折叠的理论\n---\n理论正文。\n",
    "exercises/sum-list/family.en.yaml": `title: Sum a list
rubric:
  R-01: { title: Fold instead of recursion, message: Do not use panic }
`,
    "exercises/sum-list/family.zh.yaml": "title: 列表求和\n",
    "exercises/sum-list/base/exercise.en.yaml": `tests:
  adds_numbers_test: Adds the numbers
  empty_is_zero_test: An empty list sums to 0
  big_numbers_test: Big numbers
requirements:
  R1: The total
hints:
  1: Question
  2: Concept
  3: Approach
  4: Partial code
  5: Explanation
`,
    "exercises/sum-list/base/prompt.en.md": "Sum a list of integers.\n",
    "exercises/sum-list/base/explanation.en.md": "Add them up with fold.\n",
    "exercises/sum-list/base/prompt.zh.md": "求整数列表的和。\n",
    "exercises/predict-map/family.en.yaml": "title: Predict the result of map\n",
    "exercises/predict-map/base/exercise.en.yaml": `title: Double it
hints: { 1: q, 2: c, 3: a, 4: p, 5: e }
`,
    "exercises/predict-map/base/prompt.en.md": "What is the result?\n",
    "exercises/predict-map/base/explanation.en.md": "Each element is doubled.\n",
  };
}

export const U1 = "lessons/u01-values/";
export const U2 = "lessons/u02-failure/";

/**
 * Lessons for `baseFiles()` (spread after it: replaces skills.yaml to add a basics skill and explicit-failure).
 * u01-values (gleam-basics, 2 lessons) has a complete English translation (incl. localized code) and a partial
 * Chinese one; u02-failure (explicit-failure, prerequisite u01-values) is Korean only.
 */
export function lessonFiles(): Files {
  return {
    "skills.yaml": `skills:
  - { id: gleam-basics, name: Gleam 기초, track: basics, order: 0, description: 기초, prerequisites: [] }
  - { id: data-transformation, name: 데이터 변환, track: core, order: 1, description: 변환, prerequisites: [] }
  - { id: explicit-failure, name: 실패 처리, track: core, order: 2, description: 실패, prerequisites: [] }
  - { id: recursive-algorithms, name: 재귀, track: algorithm, order: 3, description: 재귀, prerequisites: [data-transformation] }
`,
    [`${U1}unit.yaml`]: `title: 값
order: 1
level: 1
skill: gleam-basics
prerequisites: []
lessons: [l01-let, l02-math]
source: { kind: original }
`,
    [`${U1}l01-let.yaml`]: `title: 값과 let
tags: [concept:basics]
blocks:
  - prose: intro
    markdown: let으로 이름을 붙여요.
  - exercise: bind
    type: choice
    prompt: 올바른 바인딩은?
    choices: ["\`x = 5\`", "\`let x = 5\`", "\`var x = 5\`"]
    answer: 1
    feedback:
      correct: 맞아요 SECRET_CORRECT
      choices: { 0: let이 필요해요, 2: var는 없어요 }
  - exercise: total
    type: predict
    prompt: total의 값은?
    code: |-
      let total = 100 * 3
      // 결과는?
    choices: ["\`3\`", "\`300\`", "\`103\`"]
    answer: 1
    feedback:
      correct: 300이에요
      choices: { 0: 곱셈이에요, 2: 더하기가 아니에요 }
`,
    [`${U1}l02-math.yaml`]: `title: 정수
blocks:
  - prose: ints
    markdown: 정수 이야기.
  - exercise: div
    type: predict
    prompt: 결과는?
    code: 7 / 2
    choices: ["\`3\`", "\`3.5\`"]
    answer: 0
    feedback: { correct: 정수 나눗셈, choices: { 1: Float이 아니에요 } }
`,
    [`${U1}unit.en.yaml`]: "title: Values\n",
    [`${U1}l01-let.en.yaml`]: `title: Values and let
blocks:
  intro: { markdown: Name values with let. }
  bind:
    prompt: Which binding is correct?
    choices: ["\`x = 5\`", "\`let x = 5\`", "\`var x = 5\`"]
    feedback: { correct: Right, choices: { 0: You need let, 2: There is no var } }
  total:
    prompt: What is total?
    code: |-
      let total = 100 * 3
      // The result?
    choices: ["\`3\`", "\`300\`", "\`103\`"]
    feedback: { correct: It is 300, choices: { 0: Multiplication, 2: Not addition } }
`,
    [`${U1}l02-math.en.yaml`]: `title: Integers
blocks:
  ints: { markdown: About integers. }
  div:
    prompt: Result?
    choices: ["\`3\`", "\`3.5\`"]
    feedback: { correct: Integer division, choices: { 1: Not a Float } }
`,
    [`${U1}unit.zh.yaml`]: "title: 值\n",
    [`${U1}l01-let.zh.yaml`]: `title: 值与 let
blocks:
  intro: { markdown: 用 let 命名。 }
  bind: { feedback: { choices: { 2: 没有 var } } }
`,
    [`${U2}unit.yaml`]: `title: 실패
order: 2
level: 3
skill: explicit-failure
prerequisites: [u01-values]
lessons: [l01-result]
source: { kind: original }
`,
    [`${U2}l01-result.yaml`]: `title: Result
tags: [concept:results]
blocks:
  - exercise: ok
    type: choice
    prompt: 성공은?
    choices: [Ok, Error]
    answer: 0
    feedback: { correct: 맞아요, choices: { 1: 실패예요 } }
`,
  };
}

export const RS = "recall/stdlib/";
export const RX = "recall/syntax/";

/**
 * Recall cards for `baseFiles()`. Decks syntax (order 1) and stdlib (order 2); decks.en.yaml complete, decks.zh.yaml
 * partial. stdlib: list-map (order 1, no predict/hint, no overlays) and list-fold (order 2, en complete, zh partial).
 * syntax: shape-area (definitions with a Korean comment; en overlay translates it). SECRET_* marks answer-key texts.
 */
export function recallFiles(): Files {
  return {
    "recall/decks.yaml": `decks:
  - { id: stdlib, title: 핵심 라이브러리, description: 자주 쓰는 함수, order: 2 }
  - { id: syntax, title: 문법, description: 핵심 문법, order: 1 }
`,
    "recall/decks.en.yaml": `decks:
  stdlib: { title: Core library, description: Functions used most }
  syntax: { title: Syntax, description: Core syntax }
`,
    "recall/decks.zh.yaml": `decks:
  stdlib: { title: 核心库 }
`,
    [`${RS}list-fold.yaml`]: `title: list.fold
topic: gleam/list
order: 2
summary: 리스트를 접어 값 하나로 만듭니다.
example: |
  list.fold([1, 2, 3], 0, fn(acc, x) { acc + x })  // -> 6
imports: [gleam/list]
signature: "list.fold(List(a), from: b, with: fn(b, a) -> b) -> b"
frequency: 39
recognize:
  prompt: 콜백의 인자 순서는?
  choices: ["\`fn(원소, 누적값)\`", "\`fn(누적값, 원소)\`", "\`fn(x)\`"]
  answer: 1
  feedback:
    correct: 맞아요 SECRET_CORRECT
    choices:
      0: 반대예요 SECRET_WRONG
      2: 인자가 두 개예요
cloze:
  prompt: 빈칸을 채우세요.
  code: "list.____([1, 2, 3], 0, fn(acc, x) { acc + x })"
  answers: [fold, " fold_left "]
  expected: "6"
predict:
  prompt: 이 식의 값은?
  code: "list.fold([1, 2, 3], 0, fn(acc, x) { acc - x })"
  expected: "-6"
produce:
  prompt: 합을 돌려주는 본문을 쓰세요.
  header: "pub fn total(xs: List(Int)) -> Int"
  checks: "#(total([1, 2]), total([]))"
  expected: "#(3, 0)"
  mustUse: [list.fold]
  reference: "list.fold(xs, 0, fn(secret_acc, x) { secret_acc + x })"
  hint: 시작값은 0입니다.
`,
    [`${RS}list-fold.en.yaml`]: `summary: Folds a list into one value.
recognize:
  prompt: In which order does the callback take its arguments?
  choices: ["\`fn(element, acc)\`", "\`fn(acc, element)\`", "\`fn(x)\`"]
  feedback:
    correct: Right
    choices: { 0: Other way round, 2: It takes two }
cloze: { prompt: Fill in the blank. }
predict: { prompt: What is the value? }
produce: { prompt: Write the body that returns the sum., hint: Start from 0. }
`,
    [`${RS}list-fold.zh.yaml`]: `summary: 把列表折叠成一个值。
recognize:
  feedback:
    choices: { 2: 有两个参数 }
`,
    [`${RS}list-map.yaml`]: `title: list.map
topic: gleam/list
order: 1
summary: 각 원소를 바꿉니다.
example: "list.map([1, 2], fn(x) { x * 2 })  // -> [2, 4]"
imports: [gleam/list]
recognize:
  prompt: list.map이 돌려주는 것은?
  choices: [새 리스트, 원래 리스트, 원소 하나]
  answer: 0
  feedback: { correct: 맞아요, choices: { 1: 불변이에요, 2: 리스트예요 } }
cloze:
  prompt: 빈칸을 채우세요.
  code: "list.____([1, 2], fn(x) { x * 2 })"
  answers: [map]
  expected: "[2, 4]"
produce:
  prompt: 두 배로 만드세요.
  header: "pub fn double(xs: List(Int)) -> List(Int)"
  checks: "double([1, 2])"
  expected: "[2, 4]"
  mustUse: [list.map]
  reference: "list.map(xs, fn(x) { x * 2 })"
`,
    [`${RX}shape-area.yaml`]: `title: 사용자 정의 타입
topic: custom-types
order: 1
summary: 생성자마다 case로 나눕니다.
example: |
  area(Square(2.0))  // -> 4.0
definitions: |
  // 도형
  pub type Shape {
    Square(side: Float)
  }

  pub fn area(s: Shape) -> Float {
    case s { Square(side) -> side *. side }
  }
recognize:
  prompt: 생성자를 나누는 식은?
  choices: [case, if, match]
  answer: 0
  feedback: { correct: 맞아요, choices: { 1: if는 없어요, 2: match는 없어요 } }
cloze:
  prompt: 빈칸을 채우세요.
  code: "____(Square(3.0))"
  answers: [area]
  expected: "9.0"
produce:
  prompt: 변의 길이를 돌려주세요.
  header: "pub fn side(s: Shape) -> Float"
  checks: "side(Square(5.0))"
  expected: "5.0"
  reference: "case s { Square(side) -> side }"
`,
    [`${RX}shape-area.en.yaml`]: `title: Custom types
summary: Split on each constructor with case.
definitions: |
  // Shape
  pub type Shape {
    Square(side: Float)
  }

  pub fn area(s: Shape) -> Float {
    case s { Square(side) -> side *. side }
  }
recognize:
  prompt: Which expression splits on constructors?
  choices: [case, if, match]
  feedback: { correct: Right, choices: { 1: There is no if, 2: There is no match } }
cloze: { prompt: Fill in the blank. }
produce: { prompt: Return the side length. }
`,
  };
}
