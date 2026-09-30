import { afterEach, describe, expect, it } from "vitest";
import { loadDirectory, parsedContentOf } from "../src/bundle.ts";
import { declaresPubFn, extractPubFnBody } from "../src/loader/gleam.ts";
import type { ContentIssue, ParsedContent } from "../src/loader/parse.ts";
import { baseFiles, cleanupTrees, REPO_CONTENT_DIR, without, writeTree, type Files } from "./fixtures.ts";

afterEach(cleanupTrees);

async function loadOk(files: Files): Promise<ParsedContent> {
  const r = await loadDirectory(await writeTree(files));
  if (!r.ok) throw new Error(`unexpected issues: ${JSON.stringify(r.error, null, 2)}`);
  const parsed = parsedContentOf(r.value);
  if (!parsed) throw new Error("bundle not registered");
  return parsed;
}

async function loadIssues(files: Files): Promise<readonly ContentIssue[]> {
  const r = await loadDirectory(await writeTree(files));
  if (r.ok) throw new Error("expected issues");
  return r.error;
}

function hasIssue(issues: readonly ContentIssue[], path: string, fragment: string): boolean {
  return issues.some((i) => i.path === path && i.message.includes(fragment));
}

describe("loading the repository /content", () => {
  it("loads without issues and with a stable hash", async () => {
    const a = await loadDirectory(REPO_CONTENT_DIR);
    if (!a.ok) throw new Error(JSON.stringify(a.error, null, 2));
    const b = await loadDirectory(REPO_CONTENT_DIR);
    expect(b.ok && b.value.contentHash).toBe(a.value.contentHash);
    expect(a.value.bundleId).toBe(`bundle-${a.value.contentHash.slice(0, 16)}`);

    const parsed = parsedContentOf(a.value);
    expect(parsed?.skills.map((s) => s.id)).toContain("data-transformation");
    const coupon = parsed?.variants.find((v) => v.familyId === "orders-apply-coupon" && v.variantKey === "base");
    expect(coupon).toBeDefined();
    expect(coupon?.summary.title).toBe("배송 대기 주문에만 쿠폰 적용하기");
    expect(coupon?.detail.rubric.map((r) => r.id)).toEqual(["R-02", "R-05", "R-09"]);
    expect(coupon?.detail.publicTests.map((t) => t.id)).toEqual([
      "empty_list_test",
      "discounts_pending_test",
      "keeps_other_orders_test",
    ]);
    expect(coupon?.grading.tests).toHaveLength(5);
    expect(coupon?.reference.wrongSolutions[0]?.files[0]?.path).toBe("src/coupon.gleam");
  });
});

describe("loader on a valid temp tree", () => {
  it("merges family defaults into variants and lets variants override them", async () => {
    const parsed = await loadOk(baseFiles());
    const sum = parsed.variants.find((v) => v.familyId === "sum-list");
    const predict = parsed.variants.find((v) => v.familyId === "predict-map");
    expect(sum?.summary).toMatchObject({
      title: "목록 합계",
      primarySkill: "data-transformation",
      contextTags: ["numbers"],
      source: { kind: "original" },
    });
    expect(sum?.detail.conceptNoteIds).toEqual(["list-fold"]);
    expect(predict?.summary).toMatchObject({ title: "두 배로 만들기", primarySkill: "recursive-algorithms", contextTags: [] });
    expect(predict?.summary.source.kind).toBe("exercism");
  });

  it("maps files to project paths and extracts public test bodies", async () => {
    const parsed = await loadOk(baseFiles());
    const sum = parsed.variants.find((v) => v.familyId === "sum-list");
    expect(sum?.detail.starterFiles.map((f) => f.path)).toEqual(["src/sums.gleam", "src/num_types.gleam"]);
    expect(sum?.grading.supportFiles.map((f) => f.path)).toEqual(["src/num_types.gleam"]);
    expect(sum?.grading.testFiles.map((f) => f.path)).toEqual(["test/sums_perf.gleam", "test/sums_test.gleam"]);
    expect(sum?.detail.publicTests).toEqual([
      { id: "adds_numbers_test", name: "숫자를 더한다", code: "total([1, 2, 3])\n|> should.equal(6)" },
      {
        id: "empty_is_zero_test",
        name: "빈 목록은 0",
        code: "// 빈 목록 { 괄호 } 는 무시된다\ntotal([])\n|> should.equal(0)",
      },
    ]);
    expect(sum?.grading.tests[0]).toEqual({
      id: "adds_numbers_test",
      functionName: "adds_numbers_test",
      name: "숫자를 더한다",
      visibility: "public",
      requirementIds: ["R1"],
    });
    expect(sum?.grading.limits).toEqual({ timeMs: 10000, memoryMb: 256 });
    expect(sum?.grading.performance).toEqual({ sizes: [10, 1000], perfModule: "sums_perf", maxCostRatio: 3, referenceCost: [120, 9000] });
    expect(sum?.detail.hints.map((h) => h.level)).toEqual([1, 2, 3, 4, 5]);
    expect(sum?.detail.hints[0]).toEqual({ level: 1, kind: "question", markdown: "질문" });
  });

  it("defaults referenceCost to [] and accepts partial limits", async () => {
    const files = baseFiles();
    files["exercises/sum-list/base/exercise.yaml"] = (files["exercises/sum-list/base/exercise.yaml"] ?? "")
      .replace("  referenceCost: [120, 9000]\n", "")
      .replace("estimatedMinutes: 4\n", "estimatedMinutes: 4\nlimits: { timeMs: 3000 }\n");
    const sum = (await loadOk(files)).variants.find((v) => v.familyId === "sum-list");
    expect(sum?.grading.performance?.referenceCost).toEqual([]);
    expect(sum?.grading.limits).toEqual({ timeMs: 3000, memoryMb: 256 });
  });

  it("loads predict exercises without module, tests or wrong answers", async () => {
    const predict = (await loadOk(baseFiles())).variants.find((v) => v.familyId === "predict-map");
    expect(predict?.detail.predict).toEqual({ code: "list.map([1, 2], fn(x) { x * 2 })", acceptedAnswers: ["[2, 4]"] });
    expect(predict?.grading).toMatchObject({ kind: "predict", moduleName: "", tests: [], testFiles: [] });
    expect(predict?.detail.starterFiles).toEqual([]);
  });

  it("computes a per-variant hash that ignores other variants and the content root location", async () => {
    const files = baseFiles();
    const a = await loadOk(files);
    const b = await loadOk({ ...files, "exercises/predict-map/base/prompt.md": "바뀐 질문\n" });
    const hash = (p: ParsedContent, fam: string) => p.variants.find((v) => v.familyId === fam)?.contentHash;
    expect(hash(b, "sum-list")).toBe(hash(a, "sum-list"));
    expect(hash(b, "predict-map")).not.toBe(hash(a, "predict-map"));
    expect(b.contentHash).not.toBe(a.contentHash);
    // Changing family defaults changes every variant of the family.
    const c = await loadOk({ ...files, "exercises/sum-list/family.yaml": `${files["exercises/sum-list/family.yaml"]}\n` });
    expect(hash(c, "sum-list")).not.toBe(hash(a, "sum-list"));
  });
});

describe("loader validation", () => {
  it("reports a missing directory", async () => {
    const r = await loadDirectory("/definitely/not/here");
    expect(r.ok).toBe(false);
  });

  it("collects every issue with file paths instead of stopping at the first", async () => {
    const files = baseFiles();
    const ex = "exercises/sum-list/base/exercise.yaml";
    files[ex] = (files[ex] ?? "")
      .replace("{ fn: big_numbers_test,", "{ fn: missing_fn_test,")
      .replace("{ level: 5, kind: explanation, text: 해설 }", "{ level: 4, kind: explanation, text: 해설 }")
      .replace("key: always-zero", "key: returns-one");
    files["exercises/sum-list/family.yaml"] = (files["exercises/sum-list/family.yaml"] ?? "")
      .replace("primarySkill: data-transformation", "primarySkill: no-such-skill")
      .replace("conceptNotes: [list-fold]", "conceptNotes: [list-fold, ghost-note]")
      .replace("theoryTopics: [folds]", "theoryTopics: [ghost-topic]");
    files["exercises/Bad_Family/family.yaml"] = "title: [unclosed\n";
    files["exercises/Bad_Family/base/exercise.yaml"] = "kind: implement\n";
    files["theory/folds.md"] = (files["theory/folds.md"] ?? "").replace("relatedSkills: [data-transformation]", "relatedSkills: [nope]");
    files["exercises/sum-list/base/starter/other.gleam"] = "pub fn x() { 1 }\n";

    const issues = await loadIssues(files);
    const fam = "exercises/sum-list/family.yaml";
    expect(hasIssue(issues, fam, 'primarySkill: unknown skill "no-such-skill"')).toBe(true);
    expect(hasIssue(issues, fam, 'unknown concept note "ghost-note"')).toBe(true);
    expect(hasIssue(issues, fam, 'unknown theory topic "ghost-topic"')).toBe(true);
    expect(hasIssue(issues, ex, 'fn "missing_fn_test" is not declared')).toBe(true);
    expect(hasIssue(issues, ex, "exactly levels 1..5")).toBe(true);
    expect(hasIssue(issues, "exercises/sum-list/base/wrong/returns-one", "missing directory")).toBe(true);
    expect(hasIssue(issues, "exercises/sum-list/base/wrong/always-zero", 'no matching "wrong" entry')).toBe(true);
    expect(hasIssue(issues, "exercises/sum-list/base/starter/other.gleam", "must contain only sums.gleam")).toBe(true);
    expect(hasIssue(issues, "exercises/Bad_Family", "not kebab-case")).toBe(true);
    expect(hasIssue(issues, "exercises/Bad_Family/family.yaml", "invalid YAML")).toBe(true);
    expect(hasIssue(issues, "exercises/Bad_Family/base/exercise.yaml", "format")).toBe(true);
    expect(hasIssue(issues, "theory/folds.md", 'unknown skill "nope"')).toBe(true);
  });

  it("rejects unknown keys and still reports wrong hint kinds", async () => {
    const files = baseFiles();
    const ex = "exercises/sum-list/base/exercise.yaml";
    files[ex] = (files[ex] ?? "")
      .replace("format: drill", "format: drill\ntset: 1")
      .replace("kind: concept, text: 개념", "kind: approach, text: 개념")
      .replace("kind: approach, text: 접근", "kind: concept, text: 접근");
    const issues = await loadIssues(files);
    expect(hasIssue(issues, ex, 'Unrecognized key: "tset"')).toBe(true);
    // Unknown keys do not hide the remaining checks of the same file.
    expect(hasIssue(issues, ex, 'level 2 must have kind "concept"')).toBe(true);
  });

  it("checks module file names, the main test file and the performance module", async () => {
    const files = without(
      without(baseFiles(), "exercises/sum-list/base/solution/"),
      "exercises/sum-list/base/test/sums_perf.gleam",
    );
    files["exercises/sum-list/base/solution/summing.gleam"] = "pub fn total(xs) { 0 }\n";
    const issues = await loadIssues(files);
    expect(hasIssue(issues, "exercises/sum-list/base/solution/sums.gleam", "missing solution/sums.gleam")).toBe(true);
    expect(hasIssue(issues, "exercises/sum-list/base/exercise.yaml", "performance.module: missing test/sums_perf.gleam")).toBe(true);

    const renamed = without(baseFiles(), "exercises/sum-list/base/test/sums_test.gleam");
    renamed["exercises/sum-list/base/test/other_test.gleam"] = baseFiles()["exercises/sum-list/base/test/sums_test.gleam"] ?? "";
    const issues2 = await loadIssues(renamed);
    expect(hasIssue(issues2, "exercises/sum-list/base/test/sums_test.gleam", "missing test/sums_test.gleam")).toBe(true);
  });

  it("requires module, tests and wrong answers for implement exercises but not for predict", async () => {
    const files = baseFiles();
    const ex = "exercises/sum-list/base/exercise.yaml";
    files[ex] = `kind: implement
format: drill
difficulty: 1200
estimatedMinutes: 4
hints:
  - { level: 1, kind: question, text: a }
  - { level: 2, kind: concept, text: b }
  - { level: 3, kind: approach, text: c }
  - { level: 4, kind: partial_code, text: d }
  - { level: 5, kind: explanation, text: e }
`;
    const issues = await loadIssues(files);
    expect(hasIssue(issues, ex, "module: required")).toBe(true);
    // The predict variant in the same tree reports nothing.
    expect(issues.some((i) => i.path.startsWith("exercises/predict-map/"))).toBe(false);

    const noPredict = baseFiles();
    const pex = "exercises/predict-map/base/exercise.yaml";
    noPredict[pex] = (noPredict[pex] ?? "").replace(/predict:\n[\s\S]*$/, "");
    expect(hasIssue(await loadIssues(noPredict), pex, "predict: required")).toBe(true);
  });

  it("validates skills.yaml, note front matter and exercism sources", async () => {
    const files = baseFiles();
    files["skills.yaml"] = `skills:
  - { id: a, name: A, track: core, order: 1, description: a, prerequisites: [b] }
  - { id: b, name: B, track: core, order: 2, description: b, prerequisites: [a, zzz] }
`;
    files["concepts/Bad.md"] = "no front matter";
    files["concepts/other.md"] = "---\nid: something-else\ntitle: t\nlanguage: gleam\nsource: { kind: original }\n---\nbody\n";
    files["exercises/predict-map/family.yaml"] = (files["exercises/predict-map/family.yaml"] ?? "").replace(', upstream: "gleam/lists@abc123"', "");
    const issues = await loadIssues(files);
    expect(hasIssue(issues, "skills.yaml", "prerequisite cycle")).toBe(true);
    expect(hasIssue(issues, "skills.yaml", 'unknown prerequisite "zzz"')).toBe(true);
    expect(hasIssue(issues, "concepts/Bad.md", "not a kebab-case id")).toBe(true);
    expect(hasIssue(issues, "concepts/Bad.md", "missing YAML front matter")).toBe(true);
    expect(hasIssue(issues, "concepts/other.md", "must equal the file name")).toBe(true);
    expect(hasIssue(issues, "exercises/predict-map/family.yaml", "source.upstream")).toBe(true);
  });

  it("rejects mustFail entries that are not listed tests and invalid rubric patterns", async () => {
    const files = baseFiles();
    const ex = "exercises/sum-list/base/exercise.yaml";
    files[ex] = (files[ex] ?? "").replace("mustFail: [adds_numbers_test]", "mustFail: [nonexistent_test]");
    files["exercises/sum-list/family.yaml"] = (files["exercises/sum-list/family.yaml"] ?? "").replace(
      'pattern: "\\\\bpanic\\\\b"',
      'pattern: "(unclosed"',
    );
    const issues = await loadIssues(files);
    expect(hasIssue(issues, ex, 'mustFail references unknown test "nonexistent_test"')).toBe(true);
    expect(hasIssue(issues, "exercises/sum-list/family.yaml", "rubric R-01: invalid pattern")).toBe(true);
  });
});

describe("gleam source scanning", () => {
  const src = `import gleeunit/should

pub fn tricky_test() {
  let s = "a } \\" { b"
  // }
  case 1 {
    _ -> Nil
  }
}

fn private_test() { Nil }

pub fn typed_test(x: #(Int, Int)) -> Nil {
  Nil
}
`;
  it("finds only public functions", () => {
    expect(declaresPubFn(src, "tricky_test")).toBe(true);
    expect(declaresPubFn(src, "private_test")).toBe(false);
    expect(declaresPubFn(src, "tricky")).toBe(false);
  });

  it("extracts bodies while skipping strings, comments and nested braces", () => {
    expect(extractPubFnBody(src, "tricky_test")).toBe('let s = "a } \\" { b"\n// }\ncase 1 {\n  _ -> Nil\n}');
    expect(extractPubFnBody(src, "typed_test")).toBe("Nil");
    expect(extractPubFnBody("pub fn broken_test() {\n  1\n", "broken_test")).toBeNull();
  });
});
