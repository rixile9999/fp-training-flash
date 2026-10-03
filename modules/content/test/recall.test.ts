import { runMigrations, silentLogger, type Db } from "@fp/kernel";
import { createFixedClock, createTestDb } from "@fp/kernel/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadDirectory, parsedContentOf } from "../src/bundle.ts";
import type { RecallCard, RecallCardKey, RecallDeck } from "../src/contract/index.ts";
import { createContentModule, migrations, recallTranslationGaps, type ContentModule } from "../src/index.ts";
import type { ContentIssue, ParsedContent } from "../src/loader/parse.ts";
import { exampleExpected } from "../src/loader/recall.ts";
import { baseFiles, cleanupTrees, recallFiles, REPO_CONTENT_DIR, RS, RX, without, writeTree, type Files } from "./fixtures.ts";

const files = (extra: Files = {}): Files => ({ ...baseFiles(), ...recallFiles(), ...extra });

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

function expectIssue(issues: readonly ContentIssue[], path: string, fragment: string): void {
  expect(issues.some((i) => i.path === path && i.message.includes(fragment)), JSON.stringify(issues, null, 2)).toBe(true);
}

const edit = (path: string, from: string, to: string): Files => {
  const text = files()[path];
  if (text === undefined || !text.includes(from)) throw new Error(`fixture ${path} has no ${JSON.stringify(from)}`);
  return { [path]: text.replace(from, to) };
};

const FOLD = `${RS}list-fold.yaml`;
const FOLD_EN = `${RS}list-fold.en.yaml`;
/** Keys and texts of the answer key that must never appear in a learner view. */
const LEAK = /"(answer|answers|expected|checks|reference|mustUse|feedback|correctFeedback|choiceFeedback)"|SECRET|secret_acc|#\(3, 0\)/;

afterEach(cleanupTrees);

describe("recall loader", () => {
  it("parses decks and cards in order, with answer keys and complete locales", async () => {
    const { recall } = await loadOk(files());
    expect(recall.decks.map((d) => d.deck)).toEqual([
      { id: "syntax", title: "문법", description: "핵심 문법", order: 1 },
      { id: "stdlib", title: "핵심 라이브러리", description: "자주 쓰는 함수", order: 2 },
    ]);
    expect(recall.decks[1]?.translations).toEqual({ en: { title: "Core library", description: "Functions used most" }, zh: { title: "核心库" } });
    expect(recall.cards.map((c) => [c.card.deckId, c.card.id, c.order, c.card.locales])).toEqual([
      ["syntax", "shape-area", 1, ["ko", "en"]],
      ["stdlib", "list-map", 1, ["ko"]],
      ["stdlib", "list-fold", 2, ["ko", "en"]],
    ]);
    const fold = recall.cards[2];
    expect(fold?.card).toEqual<RecallCard>({
      id: "list-fold",
      deckId: "stdlib",
      title: "list.fold",
      topic: "gleam/list",
      summary: "리스트를 접어 값 하나로 만듭니다.",
      example: "list.fold([1, 2, 3], 0, fn(acc, x) { acc + x })  // -> 6",
      imports: ["gleam/list"],
      signature: "list.fold(List(a), from: b, with: fn(b, a) -> b) -> b",
      frequency: 39,
      recognize: { prompt: "콜백의 인자 순서는?", choices: ["`fn(원소, 누적값)`", "`fn(누적값, 원소)`", "`fn(x)`"] },
      cloze: { prompt: "빈칸을 채우세요.", code: "list.____([1, 2, 3], 0, fn(acc, x) { acc + x })" },
      predict: { prompt: "이 식의 값은?", code: "list.fold([1, 2, 3], 0, fn(acc, x) { acc - x })" },
      produce: { prompt: "합을 돌려주는 본문을 쓰세요.", header: "pub fn total(xs: List(Int)) -> Int", hint: "시작값은 0입니다." },
      locales: ["ko", "en"],
    });
    expect(JSON.stringify(fold?.card)).not.toMatch(LEAK);
    expect(fold?.key).toEqual<RecallCardKey>({
      cardId: "list-fold",
      recognize: { answer: 1, correctFeedback: "맞아요 SECRET_CORRECT", choiceFeedback: { 0: "반대예요 SECRET_WRONG", 2: "인자가 두 개예요" } },
      cloze: { answers: ["fold", "fold_left"], expected: "6" },
      predict: { expected: "-6" },
      produce: {
        checks: "#(total([1, 2]), total([]))",
        expected: "#(3, 0)",
        mustUse: ["list.fold"],
        reference: "list.fold(xs, 0, fn(secret_acc, x) { secret_acc + x })",
      },
    });
    expect(fold?.translations.zh).toEqual({ summary: "把列表折叠成一个值。", recognize: { feedback: { choices: { 2: "有两个参数" } } } });
    const shape = recall.cards[0];
    expect(shape?.card.definitions).toContain("// 도형");
    expect(shape?.key.produce.mustUse).toEqual([]);
    expect(shape?.card.imports).toEqual([]);
  });

  it("accepts a tree without content/recall and empty deck directories", async () => {
    expect((await loadOk(baseFiles())).recall).toEqual({ decks: [], cards: [], deckGaps: { en: [], zh: [] } });
    const { recall } = await loadOk(without(files(), RX));
    expect(recall.decks.map((d) => d.deck.id)).toEqual(["syntax", "stdlib"]);
    expect(recall.cards.map((c) => c.card.id)).toEqual(["list-map", "list-fold"]);
  });

  it("validates decks.yaml, deck directories and file names", async () => {
    const decks = "recall/decks.yaml";
    expectIssue(await loadIssues(without(files(), decks)), decks, "missing recall/decks.yaml");
    expectIssue(await loadIssues(files(edit(decks, "order: 2", "order: 1"))), decks, 'also used by deck "stdlib"');
    expectIssue(await loadIssues(files(edit(decks, "id: syntax", "id: stdlib"))), decks, 'duplicate deck "stdlib"');
    expectIssue(await loadIssues(files(edit(decks, "order: 1 }", "order: 1, color: red }"))), decks, "color");
    expectIssue(await loadIssues(files({ "recall/other/x.yaml": "title: x\n" })), "recall/other", 'unknown deck "other"');
    expectIssue(await loadIssues(files({ "recall/notes.md": "x" })), "recall/notes.md", "unexpected file");
    expectIssue(await loadIssues(files({ [`${RS}sub/a.yaml`]: "x: 1" })), `${RS}sub/a.yaml`, "unexpected file");
    expectIssue(await loadIssues(files({ [`${RS}list-fold.md`]: "x" })), `${RS}list-fold.md`, "unexpected file");
    expectIssue(await loadIssues(files({ [`${RS}List_Fold.yaml`]: files()[FOLD] ?? "" })), `${RS}List_Fold.yaml`, "not kebab-case");
    expectIssue(await loadIssues(files({ [`${RS}list-fold.fr.yaml`]: "summary: x\n" })), `${RS}list-fold.fr.yaml`, 'unsupported locale "fr"');
    expectIssue(await loadIssues(files({ [`${RS}gone.en.yaml`]: "summary: x\n" })), `${RS}gone.en.yaml`, 'translation of unknown card "gone"');
    expectIssue(await loadIssues(files({ "recall/decks.en.yaml": "decks: { nope: { title: X } }\n" })), "recall/decks.en.yaml", 'unknown deck "nope"');
  });

  it("requires unique card ids across decks and unique order per deck", async () => {
    expectIssue(await loadIssues(files({ [`${RX}list-map.yaml`]: files()[`${RS}list-map.yaml`] ?? "" })), `${RX}list-map.yaml`, 'also used in deck "stdlib"');
    expectIssue(await loadIssues(files(edit(FOLD, "order: 2", "order: 1"))), `${RS}list-map.yaml`, 'also used by card "list-fold"');
    // The same order in another deck is fine.
    await loadOk(files(edit(`${RX}shape-area.yaml`, "order: 1", "order: 2")));
  });

  it("applies the static card rules", async () => {
    const cases: [string, string, string][] = [
      ["order: 2", "order: 2.5", "order"],
      ["frequency: 39", "frequency: 39\ncolor: red", "color"],
      ["  // -> 6", "", '"// -> value" comment'],
      ["  // -> 6", "  // ->  ", '"// -> value" comment'],
      ['"`fn(x)`"]', '"`fn(x)`", a, b]', "3-4 choices"],
      ['"`fn(x)`"]', '"`fn(원소, 누적값)`"]', "duplicate choice"],
      ["answer: 1", "answer: 3", "recognize.answer: 3 is out of range (0..2)"],
      ["      2: 인자가 두 개예요\n", "", "missing explanation for wrong choice 2"],
      ["      2: 인자가 두 개예요\n", "      1: x\n      2: y\n", "feedback.choices.1 is the answer"],
      ["      2: 인자가 두 개예요\n", "      2: y\n      5: z\n", "feedback.choices.5 is out of range"],
      ['code: "list.____([1, 2, 3]', 'code: "list.fold([1, 2, 3]', 'exactly one "____" blank (found 0)'],
      ['code: "list.____([1, 2, 3]', 'code: "list.____(____, [1, 2, 3]', "(found 2)"],
      ['answers: [fold, " fold_left "]', "answers: []", "at least one accepted fill"],
      ['answers: [fold, " fold_left "]', 'answers: [fold, "  "]', "cloze.answers.1"],
      ['expected: "6"', "expected: 6", "must be a string"],
      ['header: "pub fn total(', 'header: "fn total(', 'must start with "pub fn <name>("'],
      ["mustUse: [list.fold]", "mustUse: [list.fold, int.sum]", 'does not use the mustUse token "int.sum"'],
      ["imports: [gleam/list]", "imports: [gleam/list as l]", "is not a module path"],
      ["summary: 리스트를 접어 값 하나로 만듭니다.\n", "", "summary"],
      ['  checks: "#(total([1, 2]), total([]))"\n', "", "produce.checks"],
    ];
    for (const [from, to, fragment] of cases) expectIssue(await loadIssues(files(edit(FOLD, from, to))), FOLD, fragment);
    await loadOk(files(edit(FOLD, "imports: [gleam/list]", "imports: [gleam/list, \"gleam/int.{add, type Foo}\"]")));
  });

  it("reports overlay problems against the Korean card", async () => {
    const cases: [Files, string][] = [
      [edit(FOLD_EN, "cloze: { prompt: Fill in the blank. }", "cloze: { prompt: x, answers: [fold] }"), "cloze.answers: never translated"],
      [edit(FOLD_EN, "cloze: { prompt: Fill in the blank. }", "cloze: { prompt: x, code: y }"), "cloze.code: never translated"],
      [edit(FOLD_EN, "predict: { prompt: What is the value? }", "predict: { prompt: x, expected: '1' }"), "predict.expected: never translated"],
      [edit(FOLD_EN, "hint: Start from 0. }", "hint: x, reference: y, checks: z }"), "produce.reference: never translated"],
      [edit(FOLD_EN, "hint: Start from 0. }", "hint: x, mustUse: [y], header: z }"), "produce.header: never translated"],
      [edit(FOLD_EN, "summary:", "imports: [gleam/int]\nsummary:"), "imports: never translated"],
      [edit(FOLD_EN, "summary:", "order: 3\nsummary:"), "order"],
      [edit(FOLD_EN, "  feedback:\n", "  answer: 0\n  feedback:\n"), "recognize.answer: never translated"],
      [edit(FOLD_EN, '"`fn(x)`"]', '"`fn(x)`", "`fn()`"]'), "has 4 entries; the Korean card has 3"],
      [edit(FOLD_EN, '["`fn(element, acc)`", "`fn(acc, element)`", "`fn(x)`"]', '["`fn(x)`", "`fn(acc, element)`", "`fn(element, acc)`"]'), "moved from index 2 to 0"],
      [edit(FOLD_EN, "2: It takes two", "1: x, 2: It takes two"), "recognize.feedback.choices.1: unknown"],
      [edit(FOLD_EN, "summary:", "example: list.fold([1, 2, 3], 0, fn(acc, x) { acc * x })  // -> 6\nsummary:"), "example: the code differs"],
      [edit(FOLD_EN, "summary:", "definitions: pub type T { T }\nsummary:"), "definitions: the Korean card has no definitions"],
      [edit(`${RX}shape-area.en.yaml`, "side *. side", "side +. side"), "definitions: the code differs"],
      [{ [`${RS}list-map.en.yaml`]: "predict: { prompt: x }\n" }, "predict: the Korean card has no predict item"],
      [{ [`${RS}list-map.en.yaml`]: "produce: { hint: x }\n" }, "produce.hint: the Korean card has no hint"],
    ];
    for (const [change, fragment] of cases) {
      const path = Object.keys(change)[0] ?? "";
      expectIssue(await loadIssues(files(change)), path, fragment);
    }
    // Comments may change; so may the spacing that codeOnly ignores at line ends.
    await loadOk(files(edit(FOLD_EN, "summary:", "example: |\n  list.fold([1, 2, 3], 0, fn(acc, x) { acc + x })  // -> 6 (sum)\nsummary:")));
  });

  it("computes complete locales and reports gaps", async () => {
    const enLocales = async (change: Files) => (await loadOk(files(change))).recall.cards.find((c) => c.card.id === "list-fold")?.card.locales;
    expect(await enLocales({})).toEqual(["ko", "en"]);
    expect(await enLocales(edit(FOLD_EN, "summary: Folds a list into one value.\n", ""))).toEqual(["ko"]);
    expect(await enLocales(edit(FOLD_EN, "hint: Start from 0. }", "}"))).toEqual(["ko"]);
    expect(await enLocales(edit(FOLD_EN, "In which order", "콜백 order"))).toEqual(["ko"]);
    expect(await enLocales(edit(FOLD_EN, "{ 0: Other way round, 2: It takes two }", "{ 0: Other way round }"))).toEqual(["ko"]);
    // A Korean title must be translated; a code-like title need not be.
    expect(await enLocales(edit(FOLD, "title: list.fold", "title: 접기"))).toEqual(["ko"]);
    // Korean comments in the example need a translated example; Korean inside string literals does not.
    expect(await enLocales(edit(FOLD, "// -> 6", "// -> 6 합"))).toEqual(["ko"]);
    expect(await enLocales(edit(FOLD, "imports: [gleam/list]", "imports: [gleam/list]\ndefinitions: 'pub const s = \"합\"'"))).toEqual(["ko", "en"]);

    const r = await loadDirectory(await writeTree(files()));
    if (!r.ok) throw new Error("expected a bundle");
    const gaps = recallTranslationGaps(r.value);
    expect(gaps).toEqual([
      { path: `${RS}list-map.en.yaml`, locale: "en", missing: ["list-map.en.yaml"] },
      { path: "recall/decks.zh.yaml", locale: "zh", missing: ["deck stdlib: description", "deck syntax: title, description"] },
      { path: `${RX}shape-area.zh.yaml`, locale: "zh", missing: ["shape-area.zh.yaml"] },
      { path: `${RS}list-map.zh.yaml`, locale: "zh", missing: ["list-map.zh.yaml"] },
      {
        path: `${RS}list-fold.zh.yaml`,
        locale: "zh",
        missing: [
          "recognize.prompt",
          "recognize.choices",
          "recognize.feedback.correct",
          "recognize.feedback.choices.0",
          "cloze.prompt",
          "predict.prompt",
          "produce.prompt",
          "produce.hint",
        ],
      },
    ]);
    const shapeEn = await loadDirectory(await writeTree(files(edit(`${RX}shape-area.en.yaml`, "  // Shape\n", ""))));
    if (!shapeEn.ok) throw new Error("expected a bundle");
    expect(recallTranslationGaps(shapeEn.value).find((g) => g.path === `${RX}shape-area.en.yaml`)).toBeUndefined();
    const noDefs = await loadDirectory(await writeTree(files(edit(`${RX}shape-area.en.yaml`, "definitions: |\n  // Shape\n  pub type Shape {\n    Square(side: Float)\n  }\n\n  pub fn area(s: Shape) -> Float {\n    case s { Square(side) -> side *. side }\n  }\n", ""))));
    if (!noDefs.ok) throw new Error("expected a bundle");
    expect(recallTranslationGaps(noDefs.value).find((g) => g.path === `${RX}shape-area.en.yaml`)?.missing).toEqual([
      "definitions (the Korean definitions have Korean comments)",
    ]);
  });

  it("reads the expected value after the last arrow", () => {
    expect(exampleExpected("f(1)  // -> 6")).toBe("6");
    expect(exampleExpected('{\n  let x = 1 // -> no\n  x\n}  // -> "a b"\n')).toBe('"a b"');
    expect(exampleExpected("f(1)")).toBeNull();
  });

  it("includes recall files in the bundle hash", async () => {
    const a = await loadOk(files());
    const b = await loadOk(files(edit(FOLD_EN, "Right", "Correct")));
    expect(b.contentHash).not.toBe(a.contentHash);
    expect(b.variants.map((v) => v.contentHash)).toEqual(a.variants.map((v) => v.contentHash));
  });
});

describe("recall catalog", () => {
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

  it("lists decks in order with card counts, localized field by field", async () => {
    await importFiles(files());
    expect(await content.catalog.listRecallDecks()).toEqual<RecallDeck[]>([
      { id: "syntax", title: "문법", description: "핵심 문법", order: 1, cardCount: 1 },
      { id: "stdlib", title: "핵심 라이브러리", description: "자주 쓰는 함수", order: 2, cardCount: 2 },
    ]);
    expect((await content.catalog.listRecallDecks("en")).map((d) => [d.title, d.description])).toEqual([
      ["Syntax", "Core syntax"],
      ["Core library", "Functions used most"],
    ]);
    expect((await content.catalog.listRecallDecks("zh")).map((d) => [d.title, d.description])).toEqual([
      ["문법", "핵심 문법"],
      ["核心库", "자주 쓰는 함수"],
    ]);
  });

  it("lists cards by deck order then card order, filtered by deck", async () => {
    await importFiles(files());
    expect((await content.catalog.listRecallCards()).map((c) => c.id)).toEqual(["shape-area", "list-map", "list-fold"]);
    expect((await content.catalog.listRecallCards("stdlib")).map((c) => c.id)).toEqual(["list-map", "list-fold"]);
    expect(await content.catalog.listRecallCards("nope")).toEqual([]);
    expect((await content.catalog.listRecallCards(undefined, "en")).map((c) => c.title)).toEqual(["Custom types", "list.map", "list.fold"]);
    const ko = await content.catalog.listRecallCards();
    expect(await content.catalog.listRecallCards(undefined, "ko")).toEqual(ko);
    expect(ko[2]).toEqual(await content.catalog.getRecallCard("list-fold"));
  });

  it("serves cards without answers in every locale, with Korean fallback per field", async () => {
    await importFiles(files());
    for (const locale of [undefined, "en", "zh"] as const) {
      for (const c of await content.catalog.listRecallCards(undefined, locale)) {
        expect(JSON.stringify(c)).not.toMatch(LEAK);
        expect(JSON.stringify(await content.catalog.getRecallCard(c.id, locale))).not.toMatch(LEAK);
      }
    }
    const en = await content.catalog.getRecallCard("list-fold", "en");
    expect(en).toMatchObject({
      title: "list.fold",
      summary: "Folds a list into one value.",
      example: "list.fold([1, 2, 3], 0, fn(acc, x) { acc + x })  // -> 6",
      recognize: { prompt: "In which order does the callback take its arguments?", choices: ["`fn(element, acc)`", "`fn(acc, element)`", "`fn(x)`"] },
      cloze: { prompt: "Fill in the blank.", code: "list.____([1, 2, 3], 0, fn(acc, x) { acc + x })" },
      predict: { prompt: "What is the value?" },
      produce: { prompt: "Write the body that returns the sum.", header: "pub fn total(xs: List(Int)) -> Int", hint: "Start from 0." },
      locales: ["ko", "en"],
    });
    const zh = await content.catalog.getRecallCard("list-fold", "zh");
    expect(zh?.summary).toBe("把列表折叠成一个值。");
    expect(zh?.recognize.prompt).toBe("콜백의 인자 순서는?");
    expect(zh?.produce.hint).toBe("시작값은 0입니다.");
    const shape = await content.catalog.getRecallCard("shape-area", "en");
    expect(shape?.definitions).toContain("// Shape");
    expect(shape?.definitions).not.toContain("도형");
    expect((await content.catalog.getRecallCard("shape-area", "zh"))?.definitions).toContain("// 도형");
    expect(await content.catalog.getRecallCard("list-map")).not.toHaveProperty("predict");
    expect(await content.catalog.getRecallCard("list-map")).not.toHaveProperty("definitions");
    expect(await content.catalog.getRecallCard("nope")).toBeNull();
  });

  it("returns answer keys with feedback in the locale, falling back per index", async () => {
    await importFiles(files());
    const ko = await content.catalog.getRecallCardKey("list-fold");
    expect(ko?.recognize).toEqual({ answer: 1, correctFeedback: "맞아요 SECRET_CORRECT", choiceFeedback: { 0: "반대예요 SECRET_WRONG", 2: "인자가 두 개예요" } });
    expect(ko?.produce.reference).toBe("list.fold(xs, 0, fn(secret_acc, x) { secret_acc + x })");
    expect((await content.catalog.getRecallCardKey("list-fold", "en"))?.recognize).toEqual({
      answer: 1,
      correctFeedback: "Right",
      choiceFeedback: { 0: "Other way round", 2: "It takes two" },
    });
    const zh = await content.catalog.getRecallCardKey("list-fold", "zh");
    expect(zh?.recognize).toEqual({ answer: 1, correctFeedback: "맞아요 SECRET_CORRECT", choiceFeedback: { 0: "반대예요 SECRET_WRONG", 2: "有两个参数" } });
    expect({ ...zh, recognize: undefined }).toEqual({ ...ko, recognize: undefined });
    expect(await content.catalog.getRecallCardKey("list-map")).not.toHaveProperty("predict");
    expect(await content.catalog.getRecallCardKey("nope")).toBeNull();
  });

  it("updates cards on re-import and retires removed decks and cards (still readable by id)", async () => {
    const dir = await writeTree(files());
    await importFiles(files(), dir);
    const changed = {
      ...without(without(files(), RX), `${RS}list-map`),
      ...edit("recall/decks.yaml", "  - { id: syntax, title: 문법, description: 핵심 문법, order: 1 }\n", ""),
      ...edit("recall/decks.en.yaml", "  syntax: { title: Syntax, description: Core syntax }\n", ""),
      ...edit(FOLD, "summary: 리스트를 접어 값 하나로 만듭니다.", "summary: 바뀐 요약"),
    };
    await importFiles(changed, dir);
    expect((await content.catalog.listRecallDecks()).map((d) => [d.id, d.cardCount])).toEqual([["stdlib", 1]]);
    expect((await content.catalog.listRecallCards()).map((c) => [c.id, c.summary])).toEqual([["list-fold", "바뀐 요약"]]);
    expect((await content.catalog.getRecallCard("list-map"))?.title).toBe("list.map");
    expect((await content.catalog.getRecallCardKey("shape-area"))?.cloze.answers).toEqual(["area"]);
    // Coming back un-retires.
    await importFiles(files(), dir);
    expect((await content.catalog.listRecallCards()).map((c) => c.id)).toEqual(["shape-area", "list-map", "list-fold"]);
    expect((await content.catalog.listRecallDecks()).map((d) => d.cardCount)).toEqual([1, 2]);
  });
});

describe("the repository /content recall cards", () => {
  it("load without issues and are served with answer keys in every locale", async () => {
    const loaded = await loadDirectory(REPO_CONTENT_DIR);
    // Card authors may be mid-edit; report only recall issues here (other suites cover the rest of the tree).
    if (!loaded.ok) {
      const recallIssues = loaded.error.filter((i) => i.path.startsWith("recall"));
      expect(recallIssues).toEqual([]);
      return;
    }
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
      const decks = await content.catalog.listRecallDecks();
      expect(decks.map((d) => d.id)).toEqual(["syntax", "stdlib", "pitfalls"]);
      for (const locale of ["ko", "en", "zh"] as const) {
        const cards = await content.catalog.listRecallCards(undefined, locale);
        expect(cards.length).toBe(decks.reduce((n, d) => n + d.cardCount, 0));
        for (const card of cards) {
          expect(JSON.stringify(card)).not.toMatch(/"(answer|answers|expected|checks|reference|mustUse|feedback)"/);
          const key = await content.catalog.getRecallCardKey(card.id, locale);
          if (!key) throw new Error(`missing key ${card.id}`);
          expect(key.recognize.answer).toBeLessThan(card.recognize.choices.length);
          const wrong = card.recognize.choices.map((_, i) => i).filter((i) => i !== key.recognize.answer);
          expect(Object.keys(key.recognize.choiceFeedback).map(Number).sort()).toEqual(wrong);
          expect(card.cloze.code.split("____")).toHaveLength(2);
        }
      }
    } finally {
      await db.close();
    }
  });
});

describe("usesToken (mirrors the recall grader)", async () => {
  const { usesToken } = await import("../src/loader/recall.ts");
  it("ignores comments, strings and longer identifiers", () => {
    expect(usesToken("list.fold(xs, 0, f)", "list.fold")).toBe(true);
    expect(usesToken("list.fold_right(xs, 0, f)", "list.fold")).toBe(false);
    expect(usesToken("list.fold(xs, 0, f)", "fold")).toBe(false);
    expect(usesToken('io.println("case") // case', "case")).toBe(false);
    expect(usesToken("case x { _ -> 1 }", "case")).toBe(true);
    expect(usesToken("a |> b", "|>")).toBe(true);
  });
});

