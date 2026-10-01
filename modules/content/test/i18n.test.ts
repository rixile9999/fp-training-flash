import { asId, runMigrations, silentLogger, type ConceptNoteId, type Db, type ExerciseId } from "@fp/kernel";
import { createFixedClock, createTestDb } from "@fp/kernel/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadDirectory, parsedContentOf } from "../src/bundle.ts";
import { createContentModule, migrations, type ContentModule } from "../src/index.ts";
import { codeOnly } from "../src/loader/gleam.ts";
import type { ContentIssue, ParsedContent } from "../src/loader/parse.ts";
import { baseFiles, cleanupTrees, REPO_CONTENT_DIR, translationFiles, writeTree, type Files } from "./fixtures.ts";

const SUM = "exercises/sum-list/base/";
const KO_STARTER = "// 여기에 구현하세요\npub fn total(xs: List(Int)) -> Int {\n  todo // 아직\n}\n";
const EN_STARTER = "// Implement this\npub fn total(xs: List(Int)) -> Int {\n  todo // not yet\n}\n";

const files = (extra: Files = {}): Files => ({ ...baseFiles(), ...translationFiles(), ...extra });

async function loadOk(f: Files): Promise<ParsedContent> {
  const r = await loadDirectory(await writeTree(f));
  if (!r.ok) throw new Error(`unexpected issues: ${JSON.stringify(r.error, null, 2)}`);
  const parsed = parsedContentOf(r.value);
  if (!parsed) throw new Error("bundle not registered");
  return parsed;
}

async function loadIssues(f: Files): Promise<readonly ContentIssue[]> {
  const r = await loadDirectory(await writeTree(f));
  if (r.ok) throw new Error("expected issues");
  return r.error;
}

const has = (issues: readonly ContentIssue[], path: string, fragment: string) =>
  issues.some((i) => i.path === path && i.message.includes(fragment));
const variant = (p: ParsedContent, fam: string) => p.variants.find((v) => v.familyId === fam);

afterEach(cleanupTrees);

describe("translation overlays in the loader", () => {
  it("parses overlays and computes complete locales", async () => {
    const parsed = await loadOk(files());
    const sum = variant(parsed, "sum-list");
    expect(sum?.summary.title).toBe("목록 합계");
    expect(sum?.summary.locales).toEqual(["ko", "en"]);
    expect(sum?.translations.en).toMatchObject({
      title: "Sum a list",
      promptMarkdown: "Sum a list of integers.\n",
      explanationMarkdown: "Add them up with fold.\n",
      requirements: { R1: "The total" },
      rubric: { "R-01": { title: "Fold instead of recursion", message: "Do not use panic" } },
    });
    expect(sum?.translations.zh).toEqual({ title: "列表求和", promptMarkdown: "求整数列表的和。\n" });
    expect(variant(parsed, "predict-map")?.summary.locales).toEqual(["ko", "en"]);
    expect(parsed.translations.skills.get("data-transformation")?.zh).toEqual({ name: "数据转换" });
    expect(parsed.translations.conceptNotes.get("list-fold")?.en).toEqual({ title: "Fold", markdown: "About fold.\n" });
    expect(parsed.translations.theoryTopics.get("folds")?.zh?.title).toBe("折叠的理论");
  });

  it("lists only Korean when nothing is translated", async () => {
    const parsed = await loadOk(baseFiles());
    expect(parsed.variants.map((v) => v.summary.locales)).toEqual([["ko"], ["ko"]]);
    expect(variant(parsed, "sum-list")?.translations).toEqual({});
  });

  it("requires every test name, all five hints, both texts and the family title for a complete locale", async () => {
    const t = translationFiles();
    const missingHint = files({ [`${SUM}exercise.en.yaml`]: (t[`${SUM}exercise.en.yaml`] ?? "").replace("  5: Explanation\n", "") });
    expect(variant(await loadOk(missingHint), "sum-list")?.summary.locales).toEqual(["ko"]);
    const missingTest = files({ [`${SUM}exercise.en.yaml`]: (t[`${SUM}exercise.en.yaml`] ?? "").replace("  big_numbers_test: Big numbers\n", "") });
    expect(variant(await loadOk(missingTest), "sum-list")?.summary.locales).toEqual(["ko"]);
    const noTitle = files({ "exercises/sum-list/family.en.yaml": "rubric:\n  R-01: { title: Fold }\n" });
    expect(variant(await loadOk(noTitle), "sum-list")?.summary.locales).toEqual(["ko"]);
    const noExplanation = files();
    delete noExplanation[`${SUM}explanation.en.md`];
    expect(variant(await loadOk(noExplanation), "sum-list")?.summary.locales).toEqual(["ko"]);
    // A variant with its own Korean title needs that title translated too.
    const noVariantTitle = files({ "exercises/predict-map/base/exercise.en.yaml": "hints: { 1: q, 2: c, 3: a, 4: p, 5: e }\n" });
    expect(variant(await loadOk(noVariantTitle), "predict-map")?.summary.locales).toEqual(["ko"]);
  });

  it("requires a localized starter only when the Korean starter contains Hangul", async () => {
    const korean = files({ [`${SUM}starter/sums.gleam`]: KO_STARTER });
    expect(variant(await loadOk(korean), "sum-list")?.summary.locales).toEqual(["ko"]);
    const withStarter = await loadOk({ ...korean, [`${SUM}starter.en/sums.gleam`]: EN_STARTER });
    const sum = variant(withStarter, "sum-list");
    expect(sum?.summary.locales).toEqual(["ko", "en"]);
    expect(sum?.translations.en?.starter).toBe(EN_STARTER);
  });

  it("rejects localized starters whose code differs from the Korean starter", async () => {
    const issues = await loadIssues(
      files({
        [`${SUM}starter/sums.gleam`]: KO_STARTER,
        [`${SUM}starter.en/sums.gleam`]: EN_STARTER.replace("todo", "0"),
        [`${SUM}starter.zh/extra.gleam`]: "pub fn x() { 1 }\n",
      }),
    );
    expect(has(issues, `${SUM}starter.en/sums.gleam`, "a localized starter may change only comments")).toBe(true);
    expect(has(issues, `${SUM}starter.zh/extra.gleam`, "must contain only sums.gleam")).toBe(true);
  });

  it("reports overlay keys that do not exist in the Korean source", async () => {
    const issues = await loadIssues(
      files({
        [`${SUM}exercise.en.yaml`]: `tests: { ghost_test: x }
requirements: { R9: x }
hints: { 6: x }
rubric: { R-99: { title: x } }
difficulty: 1500
`,
        "exercises/sum-list/family.en.yaml": "title: t\nrubric: { R-01: { summary: x } }\n",
        "exercises/predict-map/family.en.yaml": "title: t\nrubric: { R-01: { title: x } }\n",
        "skills.en.yaml": "skills: { no-such-skill: { name: x } }\n",
        "concepts/list-fold.en.md": "---\nid: list-fold\ntitle: Fold\nlanguage: gleam\n---\nbody\n",
        "concepts/ghost.en.md": "---\nid: ghost\n---\nbody\n",
        "theory/folds.zh.md": "---\nid: other\n---\nbody\n",
      }),
    );
    const ov = `${SUM}exercise.en.yaml`;
    expect(has(issues, ov, 'unknown test fn "ghost_test"')).toBe(true);
    expect(has(issues, ov, 'unknown requirement "R9"')).toBe(true);
    expect(has(issues, ov, 'unknown hint level "6"')).toBe(true);
    expect(has(issues, ov, 'unknown rubric id "R-99"')).toBe(true);
    expect(has(issues, ov, 'Unrecognized key: "difficulty"')).toBe(true);
    expect(has(issues, "exercises/sum-list/family.en.yaml", '"summary"')).toBe(true);
    expect(has(issues, "exercises/predict-map/family.en.yaml", 'unknown rubric id "R-01"')).toBe(true);
    expect(has(issues, "skills.en.yaml", 'unknown skill "no-such-skill"')).toBe(true);
    expect(has(issues, "concepts/list-fold.en.md", 'Unrecognized key: "language"')).toBe(true);
    expect(has(issues, "concepts/ghost.en.md", 'unknown note "ghost"')).toBe(true);
    expect(has(issues, "theory/folds.zh.md", 'must equal the note id "folds"')).toBe(true);
  });

  it("rejects unsupported locales and a message for a rubric item without an automated check", async () => {
    const issues = await loadIssues(
      files({
        [`${SUM}prompt.ja.md`]: "x\n",
        [`${SUM}prompt.ko.md`]: "x\n",
        "exercises/sum-list/family.fr.yaml": "title: x\n",
        "skills.de.yaml": "skills: {}\n",
        "concepts/list-fold.ja.md": "---\nid: list-fold\n---\nx\n",
        "exercises/predict-map/base/exercise.en.yaml": "title: Double it\nrubric: { R-01: { message: x } }\n",
        "exercises/predict-map/base/starter.en/x.gleam": "pub fn x() { 1 }\n",
      }),
    );
    expect(has(issues, `${SUM}prompt.ja.md`, 'unsupported locale "ja"')).toBe(true);
    expect(has(issues, `${SUM}prompt.ko.md`, 'unsupported locale "ko"')).toBe(true);
    expect(has(issues, "exercises/sum-list/family.fr.yaml", 'unsupported locale "fr"')).toBe(true);
    expect(has(issues, "skills.de.yaml", 'unsupported locale "de"')).toBe(true);
    expect(has(issues, "concepts/list-fold.ja.md", 'unsupported locale "ja"')).toBe(true);
    expect(has(issues, "exercises/predict-map/base/exercise.en.yaml", 'unknown rubric id "R-01"')).toBe(true);
    expect(has(issues, "exercises/predict-map/base/starter.en/x.gleam", 'unexpected directory "starter.en"')).toBe(true);
  });

  it("includes translations in the variant hash", async () => {
    const a = await loadOk(files());
    const hash = (p: ParsedContent, fam: string) => variant(p, fam)?.contentHash;
    const b = await loadOk(files({ [`${SUM}prompt.en.md`]: "Add up a list of integers.\n" }));
    expect(hash(b, "sum-list")).not.toBe(hash(a, "sum-list"));
    expect(hash(b, "predict-map")).toBe(hash(a, "predict-map"));
    const c = await loadOk(files({ "exercises/sum-list/family.zh.yaml": "title: 求列表之和\n" }));
    expect(hash(c, "sum-list")).not.toBe(hash(a, "sum-list"));
    // Skill and note translations do not version exercises.
    const d = await loadOk(files({ "skills.zh.yaml": "skills: {}\n" }));
    expect(hash(d, "sum-list")).toBe(hash(a, "sum-list"));
    expect(d.contentHash).not.toBe(a.contentHash);
  });
});

describe("codeOnly", () => {
  it("drops comments and blank lines but keeps strings verbatim", () => {
    expect(codeOnly('// 주석\n\npub fn a() {\n  "// 문자열 \\" 안"  // 꼬리\n}\n')).toBe('pub fn a() {\n  "// 문자열 \\" 안"\n}');
    expect(codeOnly('let s = "a\n// b"\n')).toBe('let s = "a\n// b"');
    expect(codeOnly(KO_STARTER)).toBe(codeOnly(EN_STARTER));
  });
});

describe("localized catalog", () => {
  let db: Db;
  let content: ContentModule;
  const id = (s: string) => asId<ExerciseId>(s);

  beforeEach(async () => {
    db = await createTestDb();
    await runMigrations(db, "content", migrations);
    content = createContentModule({ db, clock: createFixedClock("2026-10-01T00:00:00.000Z"), events: { publish: async () => {}, subscribe: () => () => {} }, logger: silentLogger });
  });
  afterEach(async () => {
    await db.close();
  });

  async function importFiles(f: Files, dir?: string) {
    const loaded = await content.admin.loadDirectory(await writeTree(f, dir));
    if (!loaded.ok) throw new Error(JSON.stringify(loaded.error, null, 2));
    const r = await content.admin.importBundle(loaded.value);
    if (!r.ok) throw new Error(r.error.message);
  }

  it("returns en and zh texts that differ from Korean and falls back to Korean field by field", async () => {
    await importFiles(files({ [`${SUM}starter/sums.gleam`]: KO_STARTER, [`${SUM}starter.en/sums.gleam`]: EN_STARTER }));
    const sumId = id("sum-list/base@1");
    const ko = await content.catalog.getExercise(sumId);
    const en = await content.catalog.getExercise(sumId, "en");
    const zh = await content.catalog.getExercise(sumId, "zh");
    expect(await content.catalog.getExercise(sumId, "ko")).toEqual(ko);
    expect(ko?.title).toBe("목록 합계");
    expect(en?.title).toBe("Sum a list");
    expect(zh?.title).toBe("列表求和");
    expect(en?.promptMarkdown).toBe("Sum a list of integers.\n");
    expect(zh?.promptMarkdown).toBe("求整数列表的和。\n");
    expect(en?.publicTests.map((t) => t.name)).toEqual(["Adds the numbers", "An empty list sums to 0"]);
    expect(en?.publicTests.map((t) => t.code)).toEqual(ko?.publicTests.map((t) => t.code));
    expect(zh?.publicTests).toEqual(ko?.publicTests); // no zh overlay: Korean
    expect(en?.hints.map((h) => h.markdown)).toEqual(["Question", "Concept", "Approach", "Partial code", "Explanation"]);
    expect(zh?.hints).toEqual(ko?.hints);
    expect(en?.rubric[0]).toMatchObject({ title: "Fold instead of recursion", description: "fold를 쓴다." });
    expect(en?.rubric[0]?.automatedCheck).toMatchObject({ kind: "forbid_pattern", pattern: "\\bpanic\\b", message: "Do not use panic" });
    expect(en?.starterFiles[0]?.content).toBe(EN_STARTER);
    expect(zh?.starterFiles[0]?.content).toBe(KO_STARTER);
    expect(en?.starterFiles[1]).toEqual(ko?.starterFiles[1]);
    expect(en?.locales).toEqual(["ko", "en"]);

    const list = await content.catalog.listExercises({}, "zh");
    expect(list.map((e) => e.title)).toEqual(["두 배로 만들기", "列表求和"]);
    expect((await content.catalog.listExercises({ familyId: asId("predict-map") }, "en"))[0]?.title).toBe("Double it");

    const specEn = await content.catalog.getGradingSpec(sumId, "en");
    const specKo = await content.catalog.getGradingSpec(sumId);
    expect(specEn?.tests.map((t) => t.name)).toEqual(["Adds the numbers", "An empty list sums to 0", "Big numbers"]);
    expect(specEn?.requirements).toEqual([{ id: "R1", description: "The total" }]);
    expect(specEn?.testFiles).toEqual(specKo?.testFiles);
    expect(specEn?.rubric[0]?.automatedCheck).toMatchObject({ message: "Do not use panic" });
    expect((await content.catalog.getGradingSpec(sumId, "zh"))?.tests).toEqual(specKo?.tests);

    expect((await content.catalog.getReferenceMaterial(sumId, "en"))?.explanationMarkdown).toBe("Add them up with fold.\n");
    expect((await content.catalog.getReferenceMaterial(sumId, "zh"))?.explanationMarkdown).toContain("SECRET_EXPLANATION");
  });

  it("localizes skills, concept notes and theory topics with fallback to Korean", async () => {
    await importFiles(files());
    const skillsEn = await content.catalog.listSkills("en");
    expect(skillsEn.map((s) => s.name)).toEqual(["Data transformation", "Recursion"]);
    expect(skillsEn[1]?.description).toBe("재귀");
    const zh = await content.catalog.getSkill(asId("data-transformation"), "zh");
    expect(zh).toMatchObject({ name: "数据转换", description: "변환", track: "core" });
    expect((await content.catalog.getSkill(asId("data-transformation")))?.name).toBe("데이터 변환");

    const fold = asId<ConceptNoteId>("list-fold");
    expect((await content.catalog.getConceptNotes([fold], "en"))[0]).toMatchObject({ title: "Fold", markdown: "About fold.\n" });
    expect((await content.catalog.getConceptNotes([fold], "zh"))[0]).toMatchObject({ title: "접기", markdown: "fold 설명.\n" });
    const topicsZh = await content.catalog.listTheoryTopics("zh");
    expect(topicsZh[0]).toMatchObject({ title: "折叠的理论", markdown: "理论正文。\n", level: "basic" });
    expect((await content.catalog.getTheoryTopics([asId("folds")], "en"))[0]?.title).toBe("접기의 이론");
  });

  it("bumps the exercise version when a translation changes", async () => {
    const dir = await writeTree(files());
    await importFiles(files(), dir);
    await importFiles(files({ [`${SUM}prompt.en.md`]: "Add up a list of integers.\n" }), dir);
    expect((await content.catalog.listExercises()).map((e) => e.id)).toEqual(["predict-map/base@1", "sum-list/base@2"]);
    expect((await content.catalog.getExercise(id("sum-list/base@1"), "en"))?.promptMarkdown).toBe("Sum a list of integers.\n");
    expect((await content.catalog.getExercise(id("sum-list/base@2"), "en"))?.promptMarkdown).toBe("Add up a list of integers.\n");
  });

  it("serves rows stored before localization as Korean only", async () => {
    await importFiles(baseFiles());
    await db.query("update content.exercise_versions set summary = summary - 'locales', detail = detail - 'locales'");
    expect((await content.catalog.listExercises({}, "en")).map((e) => e.locales)).toEqual([["ko"], ["ko"]]);
    expect((await content.catalog.getExercise(id("sum-list/base@1"), "zh"))?.locales).toEqual(["ko"]);
  });

  it("imports the real /content and serves every locale", async () => {
    const loaded = await content.admin.loadDirectory(REPO_CONTENT_DIR);
    if (!loaded.ok) throw new Error(JSON.stringify(loaded.error, null, 2));
    expect((await content.admin.importBundle(loaded.value)).ok).toBe(true);
    for (const locale of ["ko", "en", "zh"] as const) {
      const list = await content.catalog.listExercises({}, locale);
      expect(list.length).toBeGreaterThan(0);
      for (const e of list) expect(e.locales[0]).toBe("ko");
      const detail = await content.catalog.getExercise(list[0]?.id ?? id(""), locale);
      expect(detail?.hints).toHaveLength(5);
    }
  });
});
