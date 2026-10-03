/**
 * Recall checks of content CI (content/recall, docs/design/recall.md). The content module loader already rejects
 * structural problems (ContentIssue); this evaluates every card's code in the grading sandbox
 * (GradingService.evaluateSnippet) with the card's imports and definitions and compares `string.inspect` values:
 *   - example            = the text after its last `// ->`
 *   - each cloze fill    = cloze.expected (the blank replaced by the accepted fill)
 *   - predict code       = predict.expected
 *   - produce checks     = produce.expected, with `<header> {\n<reference>\n}` added after the definitions
 * Fast path: one snippet per card whose expression is a tuple of all its snippets (each wrapped in a helper fn).
 * Only when that tuple differs from the expected tuple (or fails) is each snippet evaluated alone, to say which one.
 */
import type { AppError, Locale, Result } from "@fp/kernel";
import type { ContentCatalog, RecallCard, RecallCardKey } from "@fp/content/contract";
import type { SnippetRequest, SnippetResult } from "@fp/grading/contract";
import { CLOZE_BLANK, exampleExpected } from "@fp/content";

export type SnippetEvaluator = (req: SnippetRequest) => Promise<Result<SnippetResult, AppError>>;

export interface RecallSnippet {
  /** e.g. "example", "cloze[fold]", "predict", "produce". */
  readonly label: string;
  readonly expression: string;
  readonly expected: string;
  /** Needs the produce function (header + reference) in the definitions. */
  readonly produce: boolean;
}

export interface RecallCardCheck {
  readonly cardId: string;
  readonly deckId: string;
  readonly snippets: number;
  /** Sandbox jobs used (1 when the combined tuple matched). */
  readonly jobs: number;
  readonly problems: readonly string[];
  readonly durationMs: number;
}

export interface RecallCheck {
  readonly cards: readonly RecallCardCheck[];
  /** Catalog problems (a listed card without a key, a learner view with answer-key fields). */
  readonly problems: readonly string[];
}

const HELPER = "fp_recall_check_";
const LEAKED = /"(answer|answers|expected|checks|reference|mustUse|feedback|correctFeedback|choiceFeedback)"/;

/** The produce function: the reference body wrapped in the header, exactly as a learner's body is. */
export function produceFunction(card: RecallCard, key: RecallCardKey): string {
  return `${card.produce.header} {\n${key.produce.reference}\n}`;
}

export function cardSnippets(card: RecallCard, key: RecallCardKey): RecallSnippet[] {
  const out: RecallSnippet[] = [
    { label: "example", expression: card.example, expected: exampleExpected(card.example) ?? "(no // -> value)", produce: false },
  ];
  for (const fill of key.cloze.answers) {
    out.push({ label: `cloze[${fill.trim()}]`, expression: card.cloze.code.replace(CLOZE_BLANK, fill.trim()), expected: key.cloze.expected, produce: false });
  }
  if (card.predict && key.predict) out.push({ label: "predict", expression: card.predict.code, expected: key.predict.expected, produce: false });
  out.push({ label: "produce", expression: key.produce.checks, expected: key.produce.expected, produce: true });
  return out;
}

const join = (parts: readonly (string | undefined)[]) => parts.filter((p): p is string => p !== undefined && p.trim() !== "").join("\n\n");

/**
 * One request evaluating every snippet: `#(0, fp_recall_check_0(), ...)` with each snippet in its own helper fn.
 * The leading 0 matters on Erlang: a tuple whose first element is an atom (`#(Lt, Lt)`) is inspected as a record
 * (`Lt(Lt)`), so the first element must not be a snippet value.
 */
export function combinedRequest(card: RecallCard, key: RecallCardKey, snippets: readonly RecallSnippet[]): { request: SnippetRequest; expected: string } {
  const helpers = snippets.map((s, i) => `fn ${HELPER}${i}() {\n${s.expression}\n}`);
  return {
    request: {
      imports: card.imports,
      definitions: join([card.definitions, produceFunction(card, key), ...helpers]),
      expression: `#(0, ${snippets.map((_, i) => `${HELPER}${i}()`).join(", ")})`,
    },
    expected: `#(0, ${snippets.map((s) => s.expected).join(", ")})`,
  };
}

function singleRequest(card: RecallCard, key: RecallCardKey, s: RecallSnippet): SnippetRequest {
  const definitions = join([card.definitions, s.produce ? produceFunction(card, key) : undefined]);
  return { imports: card.imports, ...(definitions === "" ? {} : { definitions }), expression: s.expression };
}

/** null when the snippet produced `expected`, else what went wrong. */
function judge(r: Result<SnippetResult, AppError>, expected: string): string | null {
  if (!r.ok) return `${r.error.code}: ${r.error.message}`;
  const v = r.value;
  switch (v.kind) {
    case "value":
      return v.value.trim() === expected.trim() ? null : `got ${v.value}, expected ${expected}`;
    case "compile_error":
      return `compile error: ${v.diagnostics.map((d) => d.message.trim()).join(" | ").slice(0, 600)}`;
    case "runtime_error":
      return `runtime error: ${v.message.slice(0, 300)}`;
    case "timeout":
      return "timeout";
    case "rejected":
      return `rejected: ${v.reasons.join("; ")}`;
  }
}

export async function verifyRecallCard(card: RecallCard, key: RecallCardKey, evaluate: SnippetEvaluator): Promise<RecallCardCheck> {
  const started = Date.now();
  const snippets = cardSnippets(card, key);
  const done = (jobs: number, problems: string[]): RecallCardCheck => ({
    cardId: card.id,
    deckId: card.deckId,
    snippets: snippets.length,
    jobs,
    problems,
    durationMs: Date.now() - started,
  });
  const combined = combinedRequest(card, key, snippets);
  if (judge(await evaluate(combined.request), combined.expected) === null) return done(1, []);
  const problems: string[] = [];
  for (const s of snippets) {
    const p = judge(await evaluate(singleRequest(card, key, s)), s.expected);
    if (p !== null) problems.push(`${s.label}: ${p}`);
  }
  // Every snippet passes alone, so the combined run failed for a reason of its own (e.g. its size): not a card problem.
  return done(1 + snippets.length, problems);
}

export interface VerifyRecallOptions {
  readonly catalog: ContentCatalog;
  readonly evaluate: SnippetEvaluator;
  /** Cards checked at once (each card's jobs run one after another). */
  readonly concurrency: number;
  /** Only these card ids (default: every listed card). */
  readonly cardIds?: ReadonlySet<string>;
  readonly locales?: readonly Locale[];
  /** Called as each card finishes (progress output). */
  readonly onCard?: (check: RecallCardCheck) => void;
}

/** Evaluates every listed card (Korean code; code never changes per locale) and walks the catalog in every locale. */
export async function verifyRecall(opts: VerifyRecallOptions): Promise<RecallCheck> {
  const problems: string[] = [];
  const cards = (await opts.catalog.listRecallCards()).filter((c) => !opts.cardIds || opts.cardIds.has(c.id));
  for (const locale of opts.locales ?? []) {
    for (const c of await opts.catalog.listRecallCards(undefined, locale)) {
      if (LEAKED.test(JSON.stringify(c))) problems.push(`${c.id} [${locale}]: the learner view contains answer-key fields`);
    }
  }
  const results: RecallCardCheck[] = [];
  const queue = [...cards];
  await Promise.all(
    Array.from({ length: Math.max(1, opts.concurrency) }, async () => {
      for (let card = queue.shift(); card; card = queue.shift()) {
        const key = await opts.catalog.getRecallCardKey(card.id);
        if (!key) {
          problems.push(`${card.id}: listed but getRecallCardKey returned null`);
          continue;
        }
        const r = await verifyRecallCard(card, key, opts.evaluate);
        results.push(r);
        opts.onCard?.(r);
      }
    }),
  );
  const order = new Map(cards.map((c, i) => [c.id, i]));
  results.sort((a, b) => (order.get(a.cardId) ?? 0) - (order.get(b.cardId) ?? 0));
  return { cards: results, problems };
}

/** e.g. "6 cards (31 snippets, 6 sandbox jobs): 5 passed, 1 failed". */
export function formatRecallSummary(check: RecallCheck): string {
  const snippets = check.cards.reduce((n, c) => n + c.snippets, 0);
  const jobs = check.cards.reduce((n, c) => n + c.jobs, 0);
  const failed = check.cards.filter((c) => c.problems.length > 0).length;
  return `${check.cards.length} recall cards (${snippets} snippets, ${jobs} sandbox jobs): ${check.cards.length - failed} passed, ${failed} failed`;
}
