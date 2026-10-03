import { describe, expect, it } from "vitest";
import type { ContentCatalog, RecallCard, RecallCardKey } from "@fp/content/contract";
import type { CodeRunner, RunJob, RunOutput, SnippetRequest, SnippetResult } from "@fp/grading/contract";
import { appError, err, ok, runMigrations, silentLogger, type AppError, type Result } from "@fp/kernel";
import { createFixedClock, createTestDb } from "@fp/kernel/testing";
import { createGradingModule, migrations as gradingMigrations } from "@fp/grading";
import { cardSnippets, combinedRequest, formatRecallSummary, verifyRecall, verifyRecallCard, type SnippetEvaluator } from "../src/recall.ts";

const card: RecallCard = {
  id: "list-fold",
  deckId: "stdlib",
  title: "list.fold",
  topic: "gleam/list",
  summary: "접기",
  example: "list.fold([1, 2, 3], 0, add)  // -> 6",
  imports: ["gleam/list"],
  definitions: "fn add(a, b) { a + b }",
  recognize: { prompt: "?", choices: ["a", "b", "c"] },
  cloze: { prompt: "?", code: "list.____([1, 2, 3], 0, add)" },
  predict: { prompt: "?", code: "list.fold([1, 2, 3], 0, sub)" },
  produce: { prompt: "?", header: "pub fn total(xs: List(Int)) -> Int" },
  locales: ["ko"],
};

const key: RecallCardKey = {
  cardId: "list-fold",
  recognize: { answer: 1, correctFeedback: "ok", choiceFeedback: { 0: "no", 2: "no" } },
  cloze: { answers: ["fold", " fold_left "], expected: "6" },
  predict: { expected: "-6" },
  produce: { checks: "#(total([1, 2]), total([]))", expected: "#(3, 0)", mustUse: ["list.fold"], reference: "list.fold(xs, 0, add)" },
};

/** Values of the expressions (without comments) the fake sandbox knows; anything else is a compile error. */
const VALUES: Record<string, string> = {
  "list.fold([1, 2, 3], 0, add)": "6",
  "list.fold_left([1, 2, 3], 0, add)": "6",
  "list.fold([1, 2, 3], 0, sub)": "-6",
  "#(total([1, 2]), total([]))": "#(3, 0)",
};

/** The value of `expression` given `definitions`; produce checks need the produce function. */
function fakeValue(expression: string, definitions: string, values: Record<string, string>): Result<SnippetResult, AppError> {
  const helpers = new Map([...definitions.matchAll(/fn fp_recall_check_(\d+)\(\) \{\n([\s\S]*?)\n\}/g)].map((m) => [m[1], m[2] ?? ""]));
  const one = (expr: string): string | null => {
    if (expr.includes("total(") && !definitions.includes("pub fn total(xs: List(Int)) -> Int {\nlist.fold(xs, 0, add)\n}")) return null;
    if (expr.includes("add") && !definitions.includes("fn add(a, b)")) return null;
    return values[expr.replace(/\s*\/\/.*$/gm, "").trim()] ?? null;
  };
  const combined = /^#\(0, (fp_recall_check_\d+\(\)(, )?)+\)$/.test(expression);
  const parts = combined ? [...expression.matchAll(/fp_recall_check_(\d+)\(\)/g)].map((m) => one(helpers.get(m[1] ?? "") ?? "")) : [one(expression)];
  if (parts.some((p) => p === null)) return ok({ kind: "compile_error", diagnostics: [{ severity: "error", message: "Unknown variable" }] });
  return ok({ kind: "value", value: combined ? `#(0, ${parts.join(", ")})` : (parts[0] ?? "") });
}

function fakeEvaluator(values: Record<string, string> = VALUES): SnippetEvaluator & { readonly requests: SnippetRequest[] } {
  const requests: SnippetRequest[] = [];
  const evaluate = async (req: SnippetRequest) => {
    requests.push(req);
    return fakeValue(req.expression, req.definitions ?? "", values);
  };
  return Object.assign(evaluate, { requests });
}

describe("recall snippets", () => {
  it("lists example, every cloze fill, predict and produce", () => {
    expect(cardSnippets(card, key).map((s) => [s.label, s.expression, s.expected, s.produce])).toEqual([
      ["example", "list.fold([1, 2, 3], 0, add)  // -> 6", "6", false],
      ["cloze[fold]", "list.fold([1, 2, 3], 0, add)", "6", false],
      ["cloze[fold_left]", "list.fold_left([1, 2, 3], 0, add)", "6", false],
      ["predict", "list.fold([1, 2, 3], 0, sub)", "-6", false],
      ["produce", "#(total([1, 2]), total([]))", "#(3, 0)", true],
    ]);
  });

  it("builds one tuple request with definitions, the produce function and a helper per snippet", () => {
    const { request, expected } = combinedRequest(card, key, cardSnippets(card, key));
    expect(request.imports).toEqual(["gleam/list"]);
    expect(request.definitions).toBe(
      [
        "fn add(a, b) { a + b }",
        "pub fn total(xs: List(Int)) -> Int {\nlist.fold(xs, 0, add)\n}",
        "fn fp_recall_check_0() {\nlist.fold([1, 2, 3], 0, add)  // -> 6\n}",
        "fn fp_recall_check_1() {\nlist.fold([1, 2, 3], 0, add)\n}",
        "fn fp_recall_check_2() {\nlist.fold_left([1, 2, 3], 0, add)\n}",
        "fn fp_recall_check_3() {\nlist.fold([1, 2, 3], 0, sub)\n}",
        "fn fp_recall_check_4() {\n#(total([1, 2]), total([]))\n}",
      ].join("\n\n"),
    );
    expect(request.expression).toBe("#(0, fp_recall_check_0(), fp_recall_check_1(), fp_recall_check_2(), fp_recall_check_3(), fp_recall_check_4())");
    expect(expected).toBe("#(0, 6, 6, 6, -6, #(3, 0))");
  });
});

describe("verifyRecallCard", () => {
  it("passes with a single sandbox job when the tuple matches", async () => {
    const evaluate = fakeEvaluator();
    const r = await verifyRecallCard(card, key, evaluate);
    expect(r).toMatchObject({ cardId: "list-fold", deckId: "stdlib", snippets: 5, jobs: 1, problems: [] });
    expect(evaluate.requests).toHaveLength(1);
  });

  it("evaluates each snippet alone to attribute a mismatch", async () => {
    const evaluate = fakeEvaluator({ ...VALUES, "list.fold([1, 2, 3], 0, sub)": "6" });
    const r = await verifyRecallCard(card, key, evaluate);
    expect(r.jobs).toBe(6);
    expect(r.problems).toEqual(["predict: got 6, expected -6"]);
    // Alone, only the produce snippet gets the produce function.
    const singles = evaluate.requests.slice(1);
    expect(singles.map((q) => q.definitions?.includes("pub fn total"))).toEqual([false, false, false, false, true]);
    expect(singles.every((q) => q.definitions?.startsWith("fn add(a, b)"))).toBe(true);
  });

  it("reports compile errors, runtime errors, timeouts, rejections and sandbox failures per snippet", async () => {
    const evaluate: SnippetEvaluator = async (req) => {
      if (req.expression.startsWith("#(0, fp_recall")) return ok({ kind: "timeout" });
      if (req.expression.includes("fold_left")) return ok({ kind: "compile_error", diagnostics: [{ severity: "error", message: " Unknown module value " }] });
      if (req.expression.includes("sub")) return ok({ kind: "runtime_error", message: "badarith" });
      if (req.expression.includes("total")) return ok({ kind: "rejected", reasons: ["forbidden import"] });
      if (req.expression.includes("//")) return err(appError("unavailable", "runner down"));
      return ok({ kind: "value", value: "6" });
    };
    const r = await verifyRecallCard(card, key, evaluate);
    expect(r.problems).toEqual([
      "example: unavailable: runner down",
      "cloze[fold_left]: compile error: Unknown module value",
      "predict: runtime error: badarith",
      "produce: rejected: forbidden import",
    ]);
  });

  it("does not blame the card when only the combined request fails (e.g. too long)", async () => {
    const inner = fakeEvaluator();
    const evaluate: SnippetEvaluator = async (req) =>
      req.expression.startsWith("#(0, fp_recall") ? err(appError("invalid_input", "too long")) : inner(req);
    const r = await verifyRecallCard(card, key, evaluate);
    expect(r).toMatchObject({ jobs: 6, problems: [] });
  });

  it("checks a card without definitions or predict", async () => {
    const plain: RecallCard = { ...card, definitions: undefined, predict: undefined, example: "1 + 1  // -> 2", cloze: { prompt: "?", code: "1 ____ 1" } } as RecallCard;
    const plainKey: RecallCardKey = { ...key, predict: undefined, cloze: { answers: ["+"], expected: "2" }, produce: { ...key.produce, reference: "1", checks: "total([])", expected: "1" } } as RecallCardKey;
    const evaluate = fakeEvaluator({ "1 + 1": "2", "total([])": "1" });
    const seen: SnippetRequest[] = [];
    const r = await verifyRecallCard(plain, plainKey, async (req) => {
      seen.push(req);
      return evaluate(req);
    });
    expect(r.snippets).toBe(3);
    // The fake needs the list.fold produce function for "total(": a mismatch is attributed to produce.
    expect(r.problems).toEqual(["produce: compile error: Unknown variable"]);
    expect(seen[1]).toEqual({ imports: ["gleam/list"], expression: "1 + 1  // -> 2" });
  });
});

/** Only the recall methods are used by verifyRecall. */
function fakeCatalog(cards: readonly RecallCard[], keys: Record<string, RecallCardKey>, leak = false): ContentCatalog {
  const unused = async (): Promise<never> => {
    throw new Error("not used");
  };
  return {
    listSkills: unused,
    getSkill: unused,
    listExercises: unused,
    getExercise: unused,
    getGradingSpec: unused,
    getReferenceMaterial: unused,
    getConceptNotes: unused,
    getTheoryTopics: unused,
    listTheoryTopics: unused,
    listLessonUnits: unused,
    getLesson: unused,
    getLessonAnswer: unused,
    listRecallDecks: unused,
    listRecallCards: async (_deck, locale) => cards.map((c) => (leak && locale === "en" ? ({ ...c, expected: "6" } as RecallCard) : c)),
    getRecallCard: unused,
    getRecallCardKey: async (id) => keys[id] ?? null,
    currentBundle: unused,
  };
}

describe("verifyRecall", () => {
  const second: RecallCard = { ...card, id: "list-sum", example: "list.fold([1, 2, 3], 0, add)  // -> 7" };
  const third: RecallCard = { ...card, id: "orphan" };

  it("checks every listed card concurrently and reports in catalog order", async () => {
    const seen: string[] = [];
    const evaluate = fakeEvaluator();
    const r = await verifyRecall({
      catalog: fakeCatalog([card, second, third], { "list-fold": key, "list-sum": { ...key, cardId: "list-sum" } }),
      evaluate,
      concurrency: 3,
      locales: ["ko", "en", "zh"],
      onCard: (c) => seen.push(c.cardId),
    });
    expect(r.cards.map((c) => [c.cardId, c.problems])).toEqual([
      ["list-fold", []],
      ["list-sum", ["example: got 6, expected 7"]],
    ]);
    expect(r.problems).toEqual(["orphan: listed but getRecallCardKey returned null"]);
    expect(new Set(seen)).toEqual(new Set(["list-fold", "list-sum"]));
    expect(formatRecallSummary(r)).toBe("2 recall cards (10 snippets, 7 sandbox jobs): 1 passed, 1 failed");
  });

  it("filters by card id and flags learner views with answer-key fields", async () => {
    const r = await verifyRecall({
      catalog: fakeCatalog([card, second], { "list-fold": key }, true),
      evaluate: fakeEvaluator(),
      concurrency: 1,
      cardIds: new Set(["list-fold"]),
      locales: ["ko", "en"],
    });
    expect(r.cards.map((c) => c.cardId)).toEqual(["list-fold"]);
    expect(r.problems).toEqual([
      "list-fold [en]: the learner view contains answer-key fields",
      "list-sum [en]: the learner view contains answer-key fields",
    ]);
  });
});

/**
 * A fake CodeRunner behind the real grading service: it reads the snippet module (`pub fn value() {...}` after the
 * definitions) and answers like the harness (value_test panics with "<token>:<bytes>:<value>").
 */
function fakeRunner(values: Record<string, string>): CodeRunner & { readonly jobs: RunJob[] } {
  const info = { runner: "local" as const, languageVersion: "test", runtimeVersion: "test" };
  const jobs: RunJob[] = [];
  return {
    language: "gleam",
    jobs,
    info: async () => info,
    run: async (job): Promise<RunOutput> => {
      jobs.push(job);
      const module = job.sourceFiles[0]?.content ?? "";
      const token = /panic as \{ "([^"]+):"/.exec(job.testFiles[0]?.content ?? "")?.[1] ?? "";
      const m = /\npub fn value\(\) \{\n([\s\S]*)\n\}\n$/.exec(module);
      const definitions = module.slice(0, m?.index ?? 0);
      const r = fakeValue(m?.[1] ?? "", definitions, values);
      if (!r.ok || r.value.kind !== "value") {
        return { kind: "compile_error", compileDiagnostics: [{ severity: "error", message: "Unknown variable" }], runner: info, durationMs: 1 };
      }
      const v = r.value.value;
      return {
        kind: "completed",
        compileDiagnostics: [],
        tests: [{ functionName: "value_test", status: "failed", message: `panic: ${token}:${Buffer.byteLength(v)}:${v} (test/fp_snippet_test.gleam:6)` }],
        performance: [],
        runner: info,
        durationMs: 1,
      };
    },
  };
}

describe("verifyRecall through the grading service", () => {
  it("evaluates cards with GradingService.evaluateSnippet", async () => {
    const db = await createTestDb();
    try {
      await runMigrations(db, "grading", gradingMigrations);
      const runner = fakeRunner(VALUES);
      const grading = createGradingModule({
        db,
        clock: createFixedClock("2026-10-03T00:00:00.000Z"),
        events: { publish: async () => {}, subscribe: () => () => {} },
        logger: silentLogger,
        catalog: fakeCatalog([], {}),
        runner,
        concurrency: 2,
      });
      const broken: RecallCard = { ...card, id: "broken", cloze: { prompt: "?", code: "list.____([1, 2, 3], 0, sub)" } };
      const r = await verifyRecall({
        catalog: fakeCatalog([card, broken], { "list-fold": key, broken: { ...key, cardId: "broken" } }),
        evaluate: (req) => grading.service.evaluateSnippet(req),
        concurrency: 2,
      });
      expect(r.cards.map((c) => [c.cardId, c.jobs, c.problems])).toEqual([
        ["list-fold", 1, []],
        ["broken", 6, ["cloze[fold]: got -6, expected 6", "cloze[fold_left]: compile error: Unknown variable"]],
      ]);
      expect(runner.jobs[0]?.sourceFiles[0]?.content).toMatch(/^import gleam\/string\nimport gleam\/list\n\nfn add\(a, b\)/);
    } finally {
      await db.close();
    }
  });
});
