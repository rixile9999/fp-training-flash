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
