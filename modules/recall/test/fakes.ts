import { appError, asId, err, ok, runMigrations, silentLogger } from "@fp/kernel";
import type { AppError, Db, Locale, Result, UserId } from "@fp/kernel";
import { createFixedClock, createTestDb, type MutableClock } from "@fp/kernel/testing";
import type { ContentCatalog, RecallCard, RecallCardKey, RecallDeck } from "@fp/content/contract";
import type { GradingService, SnippetRequest, SnippetResult } from "@fp/grading/contract";
import { createRecallModule, migrations } from "../src/index.ts";
import type { RecallService } from "../src/contract/index.ts";

export const USER = asId<UserId>("u1");
export const OTHER_USER = asId<UserId>("u2");

export interface FakeCardSpec {
  readonly id: string;
  readonly deckId: string;
  readonly topic: string;
  readonly predict?: boolean;
  readonly definitions?: string;
  readonly imports?: readonly string[];
}

const tag = (locale: Locale | undefined, text: string): string => (locale === "en" || locale === "zh" ? `[${locale}] ${text}` : text);

/** Recognize answer is always index 1; choice feedback exists for 0 and 2 (not 3). */
export const RECOGNIZE_ANSWER = 1;
export const CHECKS = "#(total([1, 2, 3]), total([]))";
export const PRODUCE_EXPECTED = "#(6, 0)";
export const HEADER = "pub fn total(xs: List(Int)) -> Int";
export const PREDICT_EXPECTED = '#("a b", [1, 2])';

export function makeCard(spec: FakeCardSpec, locale?: Locale): RecallCard {
  return {
    id: spec.id,
    deckId: spec.deckId,
    title: tag(locale, `카드 ${spec.id}`),
    topic: spec.topic,
    summary: tag(locale, "요약"),
    example: "list.fold([1, 2, 3], 0, fn(acc, x) { acc + x })  // -> 6",
    imports: spec.imports ?? ["gleam/list"],
    ...(spec.definitions !== undefined ? { definitions: spec.definitions } : {}),
    recognize: { prompt: tag(locale, "순서는?"), choices: ["a", "b", "c", "d"] },
    cloze: { prompt: tag(locale, "빈칸"), code: "list.____([1, 2, 3], 0, fn(acc, x) { acc + x })" },
    ...(spec.predict ? { predict: { prompt: tag(locale, "값은?"), code: '#("a" <> " b", [1, 2])' } } : {}),
    produce: { prompt: tag(locale, "합"), header: HEADER },
    locales: ["ko", "en", "zh"],
  };
}

export function makeKey(spec: FakeCardSpec, locale?: Locale): RecallCardKey {
  return {
    cardId: spec.id,
    recognize: {
      answer: RECOGNIZE_ANSWER,
      correctFeedback: tag(locale, "정답 해설"),
      choiceFeedback: { 0: tag(locale, "오답 0"), 2: tag(locale, "오답 2") },
    },
    cloze: { answers: ["fold"], expected: "6" },
    ...(spec.predict ? { predict: { expected: PREDICT_EXPECTED } } : {}),
    produce: { checks: CHECKS, expected: PRODUCE_EXPECTED, mustUse: ["list.fold"], reference: "list.fold(xs, 0, fn(acc, x) { acc + x })" },
  };
}

export const DECKS: readonly { id: string; order: number }[] = [
  { id: "syntax", order: 2 },
  { id: "stdlib", order: 1 },
];

/** stdlib: 4 x gleam/list, 2 x gleam/string, 2 x gleam/dict (in that order); syntax: 3 cards. */
export const CARDS: readonly FakeCardSpec[] = [
  { id: "s1", deckId: "syntax", topic: "syntax/let" },
  { id: "s2", deckId: "syntax", topic: "syntax/case", definitions: "pub type Shape {\n  Circle(r: Float)\n}\n" },
  { id: "s3", deckId: "syntax", topic: "syntax/let" },
  { id: "l1", deckId: "stdlib", topic: "gleam/list", predict: true },
  { id: "l2", deckId: "stdlib", topic: "gleam/list" },
  { id: "l3", deckId: "stdlib", topic: "gleam/list" },
  { id: "l4", deckId: "stdlib", topic: "gleam/list" },
  { id: "t1", deckId: "stdlib", topic: "gleam/string" },
  { id: "t2", deckId: "stdlib", topic: "gleam/string" },
  { id: "d1", deckId: "stdlib", topic: "gleam/dict" },
  { id: "d2", deckId: "stdlib", topic: "gleam/dict" },
];

export function fakeCatalog(cards: readonly FakeCardSpec[] = CARDS): ContentCatalog {
  const notUsed = async (): Promise<never> => {
    throw new Error("not used by recall");
  };
  const find = (id: string) => cards.find((c) => c.id === id);
  return {
    listSkills: notUsed,
    getSkill: notUsed,
    listExercises: notUsed,
    getExercise: notUsed,
    getGradingSpec: notUsed,
    getReferenceMaterial: notUsed,
    getConceptNotes: notUsed,
    getTheoryTopics: notUsed,
    listTheoryTopics: notUsed,
    listLessonUnits: notUsed,
    getLesson: notUsed,
    getLessonAnswer: notUsed,
    currentBundle: notUsed,
    listRecallDecks: async (locale) =>
      DECKS.map(
        (d): RecallDeck => ({
          id: d.id,
          title: tag(locale, `덱 ${d.id}`),
          description: "",
          order: d.order,
          cardCount: cards.filter((c) => c.deckId === d.id).length,
        }),
      ),
    listRecallCards: async (deckId, locale) => cards.filter((c) => deckId === undefined || c.deckId === deckId).map((c) => makeCard(c, locale)),
    getRecallCard: async (id, locale) => {
      const c = find(id);
      return c ? makeCard(c, locale) : null;
    },
    getRecallCardKey: async (id, locale) => {
      const c = find(id);
      return c ? makeKey(c, locale) : null;
    },
  };
}

/** Same layout as the grading snippet module (imports, blank, definitions, blank, value()). */
export function snippetModule(req: SnippetRequest): string {
  const imports = ["gleam/string", ...req.imports.filter((i) => i !== "gleam/string")];
  return [...[...new Set(imports)].map((i) => `import ${i}`), "", req.definitions ?? "", "", "pub fn value() {", req.expression, "}", ""].join("\n");
}

export type SnippetHandler = (req: SnippetRequest) => Promise<Result<SnippetResult, AppError>>;

/**
 * Fake sandbox. Produce bodies: a line containing COMPILE_ERROR -> compile error at that module line; CRASH ->
 * runtime error; LOOP -> timeout; FORBIDDEN -> rejected; otherwise a body containing "fold" or "LITERAL" gives
 * the expected value, anything else "#(1, 1)". Cloze: `list.fold_right(` gives "6", `list.length(` gives "3",
 * anything else a compile error.
 */
export const defaultSnippet: SnippetHandler = async (req) => {
  const mod = snippetModule(req);
  if (req.definitions?.includes("pub fn total")) {
    const lines = mod.split("\n");
    const errLine = lines.findIndex((l) => l.includes("COMPILE_ERROR"));
    if (errLine >= 0) return ok({ kind: "compile_error", diagnostics: [{ severity: "error", message: "Unknown variable", line: errLine + 1 }] });
    if (req.definitions.includes("CRASH")) return ok({ kind: "runtime_error", message: "boom" });
    if (req.definitions.includes("LOOP")) return ok({ kind: "timeout" });
    if (req.definitions.includes("FORBIDDEN")) return ok({ kind: "rejected", reasons: ["no FFI"] });
    const good = req.definitions.includes("fold") || req.definitions.includes("LITERAL");
    return ok({ kind: "value", value: good ? PRODUCE_EXPECTED : "#(1, 1)" });
  }
  if (req.expression.includes("list.fold_right(")) return ok({ kind: "value", value: "6" });
  if (req.expression.includes("list.length(")) return ok({ kind: "value", value: "3" });
  return ok({ kind: "compile_error", diagnostics: [{ severity: "error", message: "Unknown function", line: 5 }] });
};

export function fakeGrading(handler: { current: SnippetHandler }) {
  const calls: SnippetRequest[] = [];
  const grading: GradingService = {
    submit: async () => err(appError("internal", "not used")),
    trialRun: async () => err(appError("internal", "not used")),
    getSubmission: async () => null,
    listSubmissions: async () => [],
    evaluateSnippet: async (req) => {
      calls.push(req);
      return handler.current(req);
    },
  };
  return { grading, calls };
}

export interface Harness {
  readonly db: Db;
  readonly clock: MutableClock;
  service: RecallService;
  readonly snippet: { current: SnippetHandler };
  readonly calls: SnippetRequest[];
  /** A new module instance on the same database (simulates a restart). */
  restart(): void;
}

export async function createHarness(opts: { cards?: readonly FakeCardSpec[]; newCardsPerDay?: number; start?: string } = {}): Promise<Harness> {
  const db = await createTestDb();
  await runMigrations(db, "recall", migrations);
  const clock = createFixedClock(opts.start ?? "2026-09-30T09:00:00.000Z");
  const snippet = { current: defaultSnippet };
  const { grading, calls } = fakeGrading(snippet);
  const make = () =>
    createRecallModule({
      db,
      clock,
      logger: silentLogger,
      catalog: fakeCatalog(opts.cards),
      grading,
      ...(opts.newCardsPerDay !== undefined ? { newCardsPerDay: opts.newCardsPerDay } : {}),
    }).service;
  const h: Harness = {
    db,
    clock,
    service: make(),
    snippet,
    calls,
    restart() {
      h.service = make();
    },
  };
  return h;
}

export function unwrap<T>(r: Result<T, AppError>): T {
  if (!r.ok) throw new Error(`expected ok, got ${r.error.code}: ${r.error.message}`);
  return r.value;
}

export function unwrapErr<T>(r: Result<T, AppError>): AppError {
  if (r.ok) throw new Error("expected an error");
  return r.error;
}
