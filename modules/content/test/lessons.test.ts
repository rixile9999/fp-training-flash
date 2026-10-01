import { runMigrations, silentLogger, type Db } from "@fp/kernel";
import { createFixedClock, createTestDb } from "@fp/kernel/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadDirectory, parsedContentOf } from "../src/bundle.ts";
import type { LessonUnitSummary } from "../src/contract/index.ts";
import { createContentModule, lessonTranslationGaps, migrations, type ContentModule } from "../src/index.ts";
import { hashFiles } from "../src/loader/hash.ts";
import type { ContentIssue, ParsedContent } from "../src/loader/parse.ts";
import { readContentTree } from "../src/loader/tree.ts";
import { baseFiles, cleanupTrees, lessonFiles, REPO_CONTENT_DIR, U1, U2, without, writeTree, type Files } from "./fixtures.ts";

const files = (extra: Files = {}): Files => ({ ...baseFiles(), ...lessonFiles(), ...extra });

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

/** Asserts an issue at `path` whose message contains `fragment` (with the full list on failure). */
function expectIssue(issues: readonly ContentIssue[], path: string, fragment: string): void {
  expect(issues.some((i) => i.path === path && i.message.includes(fragment)), JSON.stringify(issues, null, 2)).toBe(true);
}

const edit = (path: string, from: string, to: string): Files => {
  const text = files()[path];
  if (text === undefined || !text.includes(from)) throw new Error(`fixture ${path} has no ${JSON.stringify(from)}`);
  return { [path]: text.replace(from, to) };
};

afterEach(cleanupTrees);

describe("lesson loader", () => {
  it("parses units, lessons, answers and complete locales", async () => {
    const parsed = await loadOk(files());
    expect(parsed.lessonUnits.map((u) => u.unit.id)).toEqual(["u01-values", "u02-failure"]);
    const [u1, u2] = parsed.lessonUnits;
    expect(u1?.unit).toMatchObject({ title: "값", order: 1, level: 1, skill: "gleam-basics", lessonIds: ["l01-let", "l02-math"] });
    expect(u1?.unit.locales).toEqual(["ko", "en"]);
    expect(u2?.unit).toMatchObject({ skill: "explicit-failure", prerequisites: ["u01-values"], locales: ["ko"] });
    const l1 = u1?.lessons[0];
    expect(l1?.lesson.tags).toEqual(["concept:basics"]);
    expect(l1?.lesson.blocks.map((b) => `${b.kind}:${b.id}`)).toEqual(["prose:intro", "exercise:bind", "exercise:total"]);
    expect(JSON.stringify(l1?.lesson)).not.toMatch(/answer|feedback|SECRET_CORRECT/);
    expect(l1?.answers["bind"]).toEqual({ answer: 1, correctFeedback: "맞아요 SECRET_CORRECT", choiceFeedback: { "0": "let이 필요해요", "2": "var는 없어요" } });
    expect(u1?.lessons[1]?.lesson.tags).toEqual([]);
    expect(l1?.translations.zh).toEqual({ title: "值与 let", blocks: { intro: { markdown: "用 let 命名。" }, bind: { choiceFeedback: { "2": "没有 var" } } } });
    expect(l1?.translations.en?.blocks?.["total"]?.code).toBe("let total = 100 * 3\n// The result?");
  });

  it("accepts a tree without content/lessons", async () => {
    const parsed = await loadOk(baseFiles());
    expect(parsed.lessonUnits).toEqual([]);
  });

  it("validates unit.yaml", async () => {
    const unit = `${U1}unit.yaml`;
    expectIssue(await loadIssues(files(edit(unit, "level: 1", "level: 5"))), unit, "level");
    expectIssue(await loadIssues(files(edit(unit, "skill: gleam-basics", "skill: nope"))), unit, 'unknown skill "nope"');
    expectIssue(await loadIssues(files(edit(unit, "skill: gleam-basics", "skill: data-transformation"))), unit, 'track "core"');
    expectIssue(await loadIssues(files(edit(unit, "source: { kind: original }\n", ""))), unit, "source");
    expectIssue(await loadIssues(files(edit(unit, "order: 1", "order: 1\ncolor: red"))), unit, "color");
    expectIssue(await loadIssues(files(edit(unit, "prerequisites: []", "prerequisites: [u09-nope]"))), unit, 'unknown unit "u09-nope"');
    expectIssue(await loadIssues(files(edit(unit, "prerequisites: []", "prerequisites: [u01-values]"))), unit, "lists itself");
    expectIssue(await loadIssues(files(edit(unit, "prerequisites: []", "prerequisites: [u02-failure]"))), "lessons", "cycle");
    expectIssue(await loadIssues(files(edit(`${U2}unit.yaml`, "order: 2", "order: 1"))), `${U2}unit.yaml`, 'also used by unit "u01-values"');
    expectIssue(await loadIssues(without(files(), unit)), unit, "missing unit.yaml");
  });

  it("requires the lessons list to match the lesson files", async () => {
    const unit = `${U1}unit.yaml`;
    expectIssue(await loadIssues(files(edit(unit, "l02-math]", "l02-math, l03-gone]"))), `${U1}l03-gone.yaml`, "missing lesson file");
    expectIssue(await loadIssues(files(edit(unit, "l02-math]", "l02-math, l01-let]"))), unit, 'duplicate lesson "l01-let"');
    expectIssue(await loadIssues(files(edit(unit, "[l01-let, l02-math]", "[l01-let]"))), `${U1}l02-math.yaml`, "not listed");
    expectIssue(await loadIssues(files({ [`${U1}notes.md`]: "x" })), `${U1}notes.md`, "unexpected file");
    expectIssue(await loadIssues(files({ [`${U1}extra/a.yaml`]: "x: 1" })), `${U1}extra/a.yaml`, "unexpected file");
    expectIssue(await loadIssues(files({ "lessons/README.md": "x" })), "lessons/README.md", "only unit directories");
    expectIssue(await loadIssues(files({ [`${U1}l09-ghost.en.yaml`]: "title: Ghost\n" })), `${U1}l09-ghost.en.yaml`, "unknown lesson");
    expectIssue(await loadIssues(files({ [`${U1}l01-let.fr.yaml`]: "title: Valeurs\n" })), `${U1}l01-let.fr.yaml`, 'unsupported locale "fr"');
    expectIssue(await loadIssues(files({ "lessons/U3_bad/unit.yaml": "title: x" })), "lessons/U3_bad", "not kebab-case");
  });

  it("validates lesson blocks", async () => {
    const l1 = `${U1}l01-let.yaml`;
    expectIssue(await loadIssues(files(edit(l1, "exercise: total", "exercise: bind"))), l1, 'duplicate block id "bind"');
    expectIssue(await loadIssues(files(edit(l1, "prose: intro", "prose: bind"))), l1, 'duplicate block id "bind"');
    expectIssue(await loadIssues(files(edit(l1, "answer: 1\n    feedback:\n      correct: 맞아요", "answer: 3\n    feedback:\n      correct: 맞아요"))), l1, "answer 3 is out of range (0..2)");
    expectIssue(await loadIssues(files(edit(`${U1}l02-math.yaml`, 'choices: ["`3`", "`3.5`"]', 'choices: ["`3`"]'))), `${U1}l02-math.yaml`, "at least two choices");
    expectIssue(await loadIssues(files(edit(l1, "type: choice", "type: essay"))), l1, "blocks.1.type");
    expectIssue(await loadIssues(files(edit(l1, "    markdown: let으로 이름을 붙여요.\n", ""))), l1, "blocks.0.markdown");
    expectIssue(await loadIssues(files(edit(l1, "prompt: 올바른 바인딩은?", "prompt: 올바른 바인딩은?\n    hint: x"))), l1, "hint");
    expectIssue(await loadIssues(files(edit(l1, "{ 0: let이 필요해요, 2: var는 없어요 }", "{ 0: let이 필요해요 }"))), l1, "missing explanation for wrong choice 2");
    expectIssue(await loadIssues(files(edit(l1, "{ 0: let이 필요해요, 2: var는 없어요 }", "{ 0: a, 1: b, 2: c }"))), l1, "feedback.choices.1 is the answer");
    expectIssue(await loadIssues(files(edit(l1, "{ 0: let이 필요해요, 2: var는 없어요 }", "{ 0: a, 2: c, 7: d }"))), l1, "feedback.choices.7 is out of range");
    expectIssue(await loadIssues(files(edit(l1, '"`var x = 5`"]', '"`x = 5`"]'))), l1, "duplicate choice");
    expectIssue(await loadIssues(files(edit(`${U2}l01-result.yaml`, "title: Result\n", ""))), `${U2}l01-result.yaml`, "title");
  });

  it("reports overlay problems against the Korean lesson", async () => {
    const en = `${U1}l01-let.en.yaml`;
    const zh = `${U1}l01-let.zh.yaml`;
    const zhWith = (block: string) => ({ [zh]: `blocks:\n${block}` });
    expectIssue(await loadIssues(files(zhWith("  nope: { markdown: x }\n"))), zh, 'unknown block "nope"');
    expectIssue(await loadIssues(files(zhWith("  bind: { answer: 2 }\n"))), zh, "blocks.bind.answer: answers are never translated");
    expectIssue(await loadIssues(files(zhWith("  bind: { choices: [a, b] }\n"))), zh, "has 2 entries; the Korean block has 3");
    expectIssue(await loadIssues(files(zhWith('  bind: { choices: ["`let x = 5`", "`x = 5`", "`var x = 5`"] }\n'))), zh, "moved from index 0 to 1");
    expectIssue(await loadIssues(files(zhWith("  bind: { markdown: x }\n"))), zh, "an exercise block translates");
    expectIssue(await loadIssues(files(zhWith("  intro: { prompt: x }\n"))), zh, 'a prose block translates only "markdown"');
    expectIssue(await loadIssues(files(zhWith("  bind: { code: x }\n"))), zh, "the Korean block has no code");
    expectIssue(await loadIssues(files(zhWith("  bind: { feedback: { choices: { 1: x } } }\n"))), zh, "feedback.choices.1: unknown choice explanation");
    expectIssue(await loadIssues(files(zhWith("  bind: { hint: x }\n"))), zh, "hint");
    expectIssue(await loadIssues(files({ [en]: "title: [not, text]\n" })), en, "title");
    expectIssue(await loadIssues(files({ [`${U1}unit.en.yaml`]: "title: Values\nlessons: [a]\n" })), `${U1}unit.en.yaml`, "lessons");
    // Localized code may differ from the Korean code (comments and string literals are translated).
    await loadOk(files(edit(en, "// The result?", 'io.println("The result?")')));
  });

  it("computes complete locales and reports gaps", async () => {
    const en = `${U1}l01-let.en.yaml`;
    const enLocales = async (extra: Files) => (await loadOk(files(extra))).lessonUnits[0]?.unit.locales;
    // Korean code with Hangul needs localized code.
    expect(await enLocales(edit(en, "    code: |-\n      let total = 100 * 3\n      // The result?\n", ""))).toEqual(["ko"]);
    expect(await enLocales(edit(en, "Which binding is correct?", "올바른 바인딩은?"))).toEqual(["ko"]);
    expect(await enLocales(edit(en, "{ 0: You need let, 2: There is no var }", "{ 0: You need let }"))).toEqual(["ko"]);
    expect(await enLocales(edit(en, "  intro: { markdown: Name values with let. }\n", ""))).toEqual(["ko"]);
    expect(await enLocales(edit(en, "title: Values and let\n", ""))).toEqual(["ko"]);
    expect(await enLocales({ [`${U1}unit.en.yaml`]: "" })).toEqual(["ko"]);
    expect((await loadOk(without(files(), `${U1}l02-math.en.yaml`))).lessonUnits[0]?.unit.locales).toEqual(["ko"]);
    // Korean code without Hangul does not need a translation.
    expect(await enLocales({})).toEqual(["ko", "en"]);

    const r = await loadDirectory(await writeTree(files(edit(en, "Which binding is correct?", "올바른 바인딩은?"))));
    if (!r.ok) throw new Error("expected a bundle");
    const gaps = lessonTranslationGaps(r.value);
    expect(gaps.find((g) => g.path === en)).toEqual({ path: en, locale: "en", missing: ["block bind: still contains Korean"] });
    expect(gaps.find((g) => g.path === `${U1}l02-math.zh.yaml`)?.missing).toEqual(["l02-math.zh.yaml"]);
    expect(gaps.find((g) => g.path === `${U2}unit.zh.yaml`)?.missing).toEqual(["unit.zh.yaml"]);
  });

  it("includes lessons in the bundle hash, which differs from the hash of the same files before lessons", async () => {
    const a = await loadOk(files());
    const b = await loadOk(files(edit(`${U1}l01-let.en.yaml`, "Right", "Correct")));
    expect(b.contentHash).not.toBe(a.contentHash);
    expect(b.variants.map((v) => v.contentHash)).toEqual(a.variants.map((v) => v.contentHash));
    // A DB whose current bundle was hashed without the lessons format marker re-imports the same files.
    const tree = await readContentTree(await writeTree(files()));
    expect(a.contentHash).not.toBe(hashFiles([...(tree?.files.values() ?? [])]));
  });
});

describe("lesson catalog", () => {
  let db: Db;
  let content: ContentModule;

  beforeEach(async () => {
    db = await createTestDb();
    await runMigrations(db, "content", migrations);
    content = createContentModule({
      db,
      clock: createFixedClock("2026-10-01T09:00:00.000Z"),
      events: { publish: async () => {}, subscribe: () => () => {} },
      logger: silentLogger,
    });
  });
  afterEach(async () => {
    await db.close();
  });

  async function importFiles(f: Files, dir?: string): Promise<void> {
    const loaded = await content.admin.loadDirectory(await writeTree(f, dir));
    if (!loaded.ok) throw new Error(JSON.stringify(loaded.error, null, 2));
    const imported = await content.admin.importBundle(loaded.value);
    if (!imported.ok) throw new Error(imported.error.message);
  }

  it("lists units in order with lesson titles and locales, localized field by field", async () => {
    await importFiles(files());
    const ko = await content.catalog.listLessonUnits();
    expect(ko).toEqual<LessonUnitSummary[]>([
      {
        id: "u01-values",
        title: "값",
        order: 1,
        level: 1,
        skill: "gleam-basics" as LessonUnitSummary["skill"],
        prerequisites: [],
        lessonIds: ["l01-let", "l02-math"],
        lessonTitles: ["값과 let", "정수"],
        locales: ["ko", "en"],
      },
      {
        id: "u02-failure",
        title: "실패",
        order: 2,
        level: 3,
        skill: "explicit-failure" as LessonUnitSummary["skill"],
        prerequisites: ["u01-values"],
        lessonIds: ["l01-result"],
        lessonTitles: ["Result"],
        locales: ["ko"],
      },
    ]);
    expect(await content.catalog.listLessonUnits("ko")).toEqual(ko);
    const en = await content.catalog.listLessonUnits("en");
    expect(en.map((u) => [u.title, u.lessonTitles])).toEqual([
      ["Values", ["Values and let", "Integers"]],
      ["실패", ["Result"]],
    ]);
    const zh = await content.catalog.listLessonUnits("zh");
    expect(zh.map((u) => [u.title, u.lessonTitles])).toEqual([
      ["值", ["值与 let", "정수"]],
      ["실패", ["Result"]],
    ]);
  });

  it("serves lessons without answers or feedback, with Korean fallback per field", async () => {
    await importFiles(files());
    const ko = await content.catalog.getLesson("u01-values", "l01-let");
    expect(ko).toEqual({
      id: "l01-let",
      unitId: "u01-values",
      title: "값과 let",
      tags: ["concept:basics"],
      blocks: [
        { kind: "prose", id: "intro", markdown: "let으로 이름을 붙여요." },
        { kind: "exercise", id: "bind", type: "choice", prompt: "올바른 바인딩은?", choices: ["`x = 5`", "`let x = 5`", "`var x = 5`"] },
        { kind: "exercise", id: "total", type: "predict", prompt: "total의 값은?", code: "let total = 100 * 3\n// 결과는?", choices: ["`3`", "`300`", "`103`"] },
      ],
    });
    for (const locale of [undefined, "en", "zh"] as const) {
      const json = JSON.stringify(await content.catalog.getLesson("u01-values", "l01-let", locale));
      expect(json).not.toMatch(/answer|feedback|SECRET_CORRECT|맞아요|Right|没有 var/);
    }
    const en = await content.catalog.getLesson("u01-values", "l01-let", "en");
    expect(en?.title).toBe("Values and let");
    expect(en?.blocks[2]).toMatchObject({ prompt: "What is total?", code: "let total = 100 * 3\n// The result?" });
    const zh = await content.catalog.getLesson("u01-values", "l01-let", "zh");
    expect(zh?.title).toBe("值与 let");
    expect(zh?.blocks.map((b) => (b.kind === "prose" ? b.markdown : b.prompt))).toEqual(["用 let 命名。", "올바른 바인딩은?", "total의 값은?"]);
    expect(await content.catalog.getLesson("u01-values", "nope")).toBeNull();
    expect(await content.catalog.getLesson("nope", "l01-let")).toBeNull();
  });

  it("returns answers with per-choice feedback in the locale, falling back per index", async () => {
    await importFiles(files());
    expect(await content.catalog.getLessonAnswer("u01-values", "l01-let", "bind")).toEqual({
      unitId: "u01-values",
      lessonId: "l01-let",
      exerciseId: "bind",
      answer: 1,
      correctFeedback: "맞아요 SECRET_CORRECT",
      choiceFeedback: { 0: "let이 필요해요", 2: "var는 없어요" },
    });
    expect(await content.catalog.getLessonAnswer("u01-values", "l01-let", "bind", "en")).toMatchObject({
      answer: 1,
      correctFeedback: "Right",
      choiceFeedback: { 0: "You need let", 2: "There is no var" },
    });
    expect(await content.catalog.getLessonAnswer("u01-values", "l01-let", "bind", "zh")).toMatchObject({
      correctFeedback: "맞아요 SECRET_CORRECT",
      choiceFeedback: { 0: "let이 필요해요", 2: "没有 var" },
    });
    expect(await content.catalog.getLessonAnswer("u01-values", "l01-let", "intro")).toBeNull();
    expect(await content.catalog.getLessonAnswer("u01-values", "l01-let", "nope")).toBeNull();
    expect(await content.catalog.getLessonAnswer("u01-values", "nope", "bind")).toBeNull();
  });

  it("updates lessons on re-import and retires removed units and lessons (still readable)", async () => {
    const dir = await writeTree(files());
    await importFiles(files(), dir);
    const changed = {
      ...without(without(files(), U2), `${U1}l02-math`),
      ...edit(`${U1}unit.yaml`, "[l01-let, l02-math]", "[l01-let]"),
      ...edit(`${U1}l01-let.yaml`, "title: 값과 let", "title: 값과 let!"),
    };
    await importFiles(changed, dir);
    const units = await content.catalog.listLessonUnits();
    expect(units.map((u) => [u.id, u.lessonIds, u.lessonTitles])).toEqual([["u01-values", ["l01-let"], ["값과 let!"]]]);
    expect((await content.catalog.getLesson("u01-values", "l02-math"))?.title).toBe("정수");
    expect((await content.catalog.getLesson("u02-failure", "l01-result"))?.title).toBe("Result");
    // Coming back un-retires.
    await importFiles(files(), dir);
    expect((await content.catalog.listLessonUnits()).map((u) => u.lessonIds)).toEqual([["l01-let", "l02-math"], ["l01-result"]]);
  });
});

describe("the repository /content lessons", () => {
  it("loads 15 units and 64 lessons, and serves every lesson and answer in every locale", async () => {
    const loaded = await loadDirectory(REPO_CONTENT_DIR);
    if (!loaded.ok) throw new Error(JSON.stringify(loaded.error, null, 2));
    const db = await createTestDb();
    try {
      await runMigrations(db, "content", migrations);
      const content = createContentModule({
        db,
        clock: createFixedClock("2026-10-01T09:00:00.000Z"),
        events: { publish: async () => {}, subscribe: () => () => {} },
        logger: silentLogger,
      });
      const imported = await content.admin.importBundle(loaded.value);
      if (!imported.ok) throw new Error(imported.error.message);

      const units = await content.catalog.listLessonUnits();
      expect(units).toHaveLength(15);
      expect(units.map((u) => u.order)).toEqual(Array.from({ length: 15 }, (_, i) => i + 1));
      expect(units[0]).toMatchObject({ id: "u01-values", level: 1, skill: "gleam-basics", prerequisites: [] });
      expect(units.reduce((n, u) => n + u.lessonIds.length, 0)).toBe(64);
      expect(new Set(units.map((u) => u.skill))).toEqual(new Set(["gleam-basics", "gleam-types", "gleam-lists-recursion", "explicit-failure"]));
      for (const u of units) expect(u.locales).toContain("zh");
      // u07 has two code snippets with Korean comments and no English code yet (see lessonTranslationGaps).
      const noEn = units.filter((u) => !u.locales.includes("en")).map((u) => u.id);
      expect(["u07-functions-as-values"]).toEqual(expect.arrayContaining(noEn));
      for (const g of lessonTranslationGaps(loaded.value)) expect(g.missing.join()).toMatch(/^block [a-z0-9-]+: code/);

      let prose = 0;
      let exercises = 0;
      for (const locale of ["ko", "en", "zh"] as const) {
        const localized = await content.catalog.listLessonUnits(locale);
        expect(localized.map((u) => u.id)).toEqual(units.map((u) => u.id));
        for (const u of localized) {
          expect(u.lessonTitles).toHaveLength(u.lessonIds.length);
          for (const lessonId of u.lessonIds) {
            const lesson = await content.catalog.getLesson(u.id, lessonId, locale);
            if (!lesson) throw new Error(`missing ${u.id}/${lessonId}`);
            expect(JSON.stringify(lesson)).not.toMatch(/"(answer|feedback|correctFeedback|choiceFeedback)"/);
            for (const b of lesson.blocks) {
              if (b.kind === "prose") {
                if (locale === "ko") prose++;
                continue;
              }
              if (locale === "ko") exercises++;
              const key = await content.catalog.getLessonAnswer(u.id, lessonId, b.id, locale);
              if (!key) throw new Error(`missing answer ${u.id}/${lessonId}#${b.id}`);
              expect(key.answer).toBeLessThan(b.choices.length);
              const wrong = b.choices.map((_, i) => i).filter((i) => i !== key.answer);
              expect(Object.keys(key.choiceFeedback).map(Number).sort()).toEqual(wrong);
            }
          }
        }
      }
      expect({ prose, exercises }).toEqual({ prose: 150, exercises: 228 });
      const en = await content.catalog.getLesson("u01-values", "l01-values-let", "en");
      expect(en?.title).toBe("Values and let");
    } finally {
      await db.close();
    }
  });
});
