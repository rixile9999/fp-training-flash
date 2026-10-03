/**
 * Recall cards (content/recall, docs/design/recall.md): decks.yaml, decks.<l>.yaml, <deck>/<card-id>.yaml and
 * <deck>/<card-id>.<l>.yaml. Pure; every problem becomes an issue. Cards are not versioned. Whether the code of a card
 * actually evaluates to its expected values is checked by content CI in the sandbox, not here.
 */
import { DEFAULT_LOCALE, type Locale } from "@fp/kernel";
import type { RecallCard, RecallCardKey } from "../contract/index.ts";
import {
  TRANSLATED_LOCALES,
  type RecallCardText,
  type RecallDeckText,
  type StoredRecallDeck,
  type TranslatedLocale,
  type Translations,
} from "../i18n.ts";
import { codeOnly } from "./gleam.ts";
import {
  KEBAB_ID,
  recallCardOverlaySchema,
  recallCardSchema,
  recallDecksOverlaySchema,
  recallDecksSchema,
  type RecallCardOverlayYaml,
  type RecallCardYaml,
} from "./schemas.ts";
import { checkLocale, defined, HANGUL, own } from "./translations.ts";
import { compareStrings, filesUnder, subdirs, type ContentTree, type TreeFile } from "./tree.ts";
import { parseYaml, validate, type AddIssue } from "./yaml.ts";

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

export const RECALL_DIR = "recall/";
const DECKS_FILE = `${RECALL_DIR}decks.yaml`;
const FILE_NAME = /^([^./]+)(?:\.([^./]+))?\.yaml$/;
const DECK_FILES = "a deck directory holds only <card-id>.yaml and <card-id>.<locale>.yaml files";
/** The blank of a cloze item. */
export const CLOZE_BLANK = "____";
/** Marks the expected value of an example: the text after the last one is `string.inspect` of the expression. */
export const EXAMPLE_ARROW = "// ->";
/** Same shape as grading's snippet imports: `gleam/list` or `gleam/list.{map, type Foo}` (no aliases). */
const IMPORT = /^[a-z][a-z0-9_]*(\/[a-z][a-z0-9_]*)*(\.\{ *((type +)?[A-Za-z_][A-Za-z0-9_]*( *, *(type +)?[A-Za-z_][A-Za-z0-9_]*)* *,? *)?\})?$/;
const PUB_FN_HEADER = /^pub fn [a-z][a-z0-9_]*\(/;

/** Per translated locale, what a complete translation still lacks (empty = complete). */
export type RecallGaps = Readonly<Record<TranslatedLocale, readonly string[]>>;

export interface ParsedRecallDeck {
  readonly deck: StoredRecallDeck;
  readonly translations: Translations<RecallDeckText>;
}

export interface ParsedRecallCard {
  /** Korean learner view; `locales` = "ko" + every locale without gaps. */
  readonly card: RecallCard;
  /** Korean answer key. */
  readonly key: RecallCardKey;
  /** Position in the deck (unique per deck). */
  readonly order: number;
  readonly translations: Translations<RecallCardText>;
  readonly gaps: RecallGaps;
}

export interface ParsedRecall {
  /** By order, then id. */
  readonly decks: readonly ParsedRecallDeck[];
  /** By deck order, then card order, then id. */
  readonly cards: readonly ParsedRecallCard[];
  /** Gaps of decks.<l>.yaml (deck titles and descriptions). */
  readonly deckGaps: RecallGaps;
}

export const EMPTY_RECALL: ParsedRecall = { decks: [], cards: [], deckGaps: { en: [], zh: [] } };

export interface RecallTranslationGap {
  /** Overlay path relative to the content root, e.g. recall/stdlib/list-fold.en.yaml. */
  readonly path: string;
  readonly locale: TranslatedLocale;
  readonly missing: readonly string[];
}

/** Flat list of incomplete recall translations (content CI report). */
export function recallTranslationGaps(recall: ParsedRecall): RecallTranslationGap[] {
  const out: RecallTranslationGap[] = [];
  for (const locale of TRANSLATED_LOCALES) {
    if (recall.deckGaps[locale].length > 0) out.push({ path: `${RECALL_DIR}decks.${locale}.yaml`, locale, missing: recall.deckGaps[locale] });
    for (const c of recall.cards) {
      if (c.gaps[locale].length > 0) out.push({ path: `${RECALL_DIR}${c.card.deckId}/${c.card.id}.${locale}.yaml`, locale, missing: c.gaps[locale] });
    }
  }
  return out;
}

/** True when `code` has Korean outside string literals (i.e. in comments or identifiers). */
export function hangulOutsideStrings(code: string): boolean {
  return HANGUL.test(code.replace(/"(?:[^"\\]|\\.)*"/g, '""'));
}

/** The text after the last `// ->` of an example, or null when there is none (or it is empty). */
export function exampleExpected(example: string): string | null {
  const i = example.lastIndexOf(EXAMPLE_ARROW);
  if (i < 0) return null;
  const value = (example.slice(i + EXAMPLE_ARROW.length).split("\n")[0] ?? "").trim();
  return value === "" ? null : value;
}

export function parseRecall(tree: ContentTree, add: AddIssue): ParsedRecall {
  const all = filesUnder(tree, RECALL_DIR);
  if (all.length === 0) return EMPTY_RECALL;
  const overlayFiles = new Map<TranslatedLocale, TreeFile>();
  let decksFile: TreeFile | undefined;
  for (const f of all) {
    const name = f.path.slice(RECALL_DIR.length);
    if (name.includes("/")) continue;
    const m = FILE_NAME.exec(name);
    if (m?.[1] === "decks" && m[2] === undefined) decksFile = f;
    else if (m?.[1] === "decks" && m[2] !== undefined) {
      if (checkLocale(m[2], f.path, add)) overlayFiles.set(m[2], f);
    } else add(f.path, "unexpected file; content/recall holds decks.yaml, decks.<locale>.yaml and deck directories");
  }
  if (!decksFile) {
    add(DECKS_FILE, "missing recall/decks.yaml");
    return EMPTY_RECALL;
  }
  const raw = parseYaml(decksFile, add);
  const y = raw === undefined ? null : validate(recallDecksSchema, raw, DECKS_FILE, add);
  if (!y) return EMPTY_RECALL;

  const deckById = new Map<string, StoredRecallDeck>();
  const byOrder = new Map<number, string>();
  for (const d of y.decks) {
    if (deckById.has(d.id)) {
      add(DECKS_FILE, `decks: duplicate deck "${d.id}"`);
      continue;
    }
    const other = byOrder.get(d.order);
    if (other !== undefined) add(DECKS_FILE, `decks: order ${d.order} of "${d.id}" is also used by deck "${other}"`);
    else byOrder.set(d.order, d.id);
    deckById.set(d.id, { id: d.id, title: d.title, description: d.description, order: d.order });
  }

  // decks.<l>.yaml
  const deckTranslations = new Map<string, Mutable<Translations<RecallDeckText>>>();
  const deckGaps = {} as Record<TranslatedLocale, string[]>;
  for (const loc of TRANSLATED_LOCALES) {
    deckGaps[loc] = [];
    const f = overlayFiles.get(loc);
    if (!f) {
      if (deckById.size > 0) deckGaps[loc].push(`decks.${loc}.yaml`);
      continue;
    }
    const ovRaw = parseYaml(f, add);
    const ov = ovRaw === undefined ? null : validate(recallDecksOverlaySchema, ovRaw, f.path, add);
    if (!ov) {
      deckGaps[loc].push("valid overlay");
      continue;
    }
    for (const [id, t] of Object.entries(ov.decks)) {
      if (!deckById.has(id)) {
        add(f.path, `decks: unknown deck "${id}" (not in recall/decks.yaml)`);
        continue;
      }
      const entry = deckTranslations.get(id) ?? {};
      entry[loc] = defined({ title: t.title, description: t.description });
      deckTranslations.set(id, entry);
    }
    for (const id of deckById.keys()) {
      const t = own(ov.decks, id);
      const missing: string[] = [];
      if (t?.title === undefined) missing.push("title");
      if (t?.description === undefined) missing.push("description");
      if (t && HANGUL.test(JSON.stringify(t))) missing.push("still contains Korean");
      if (missing.length > 0) deckGaps[loc].push(`deck ${id}: ${missing.join(", ")}`);
    }
  }

  // Deck directories and cards.
  const cards: ParsedRecallCard[] = [];
  const cardDeck = new Map<string, string>();
  for (const dir of subdirs(tree, RECALL_DIR)) {
    if (!deckById.has(dir)) {
      add(`${RECALL_DIR}${dir}`, `unknown deck "${dir}": a directory of content/recall must be a deck id from recall/decks.yaml`);
      continue;
    }
    const deckCards = parseDeckDir(tree, dir, cardDeck, add);
    const orders = new Map<number, string>();
    for (const c of deckCards) {
      const other = orders.get(c.order);
      if (other !== undefined) add(`${RECALL_DIR}${dir}/${c.card.id}.yaml`, `order ${c.order} is also used by card "${other}" (order is unique per deck)`);
      else orders.set(c.order, c.card.id);
    }
    cards.push(...deckCards);
  }

  const decks = [...deckById.values()]
    .sort((a, b) => a.order - b.order || compareStrings(a.id, b.id))
    .map((deck) => ({ deck, translations: deckTranslations.get(deck.id) ?? {} }));
  const deckOrder = new Map(decks.map((d, i) => [d.deck.id, i]));
  cards.sort(
    (a, b) =>
      (deckOrder.get(a.card.deckId) ?? 0) - (deckOrder.get(b.card.deckId) ?? 0) ||
      a.order - b.order ||
      compareStrings(a.card.id, b.card.id),
  );
  return { decks, cards, deckGaps };
}

function parseDeckDir(tree: ContentTree, deckId: string, cardDeck: Map<string, string>, add: AddIssue): ParsedRecallCard[] {
  const dir = `${RECALL_DIR}${deckId}/`;
  const sources = new Map<string, TreeFile>();
  const overlays = new Map<string, Map<TranslatedLocale, TreeFile>>();
  for (const f of filesUnder(tree, dir)) {
    const m = FILE_NAME.exec(f.path.slice(dir.length));
    if (!m) {
      add(f.path, `unexpected file; ${DECK_FILES}`);
      continue;
    }
    const id = m[1] ?? "";
    const loc = m[2];
    if (loc === undefined) {
      sources.set(id, f);
      continue;
    }
    if (!checkLocale(loc, f.path, add)) continue;
    const byLoc = overlays.get(id) ?? new Map<TranslatedLocale, TreeFile>();
    byLoc.set(loc, f);
    overlays.set(id, byLoc);
  }
  for (const [id, byLoc] of overlays) {
    if (sources.has(id)) continue;
    for (const f of byLoc.values()) add(f.path, `translation of unknown card "${id}" (missing ${dir}${id}.yaml)`);
  }
  const out: ParsedRecallCard[] = [];
  for (const [id, file] of sources) {
    if (!KEBAB_ID.test(id)) {
      add(file.path, `card id "${id}" (the file name) is not kebab-case`);
      continue;
    }
    const other = cardDeck.get(id);
    if (other !== undefined) {
      add(file.path, `card id "${id}" is also used in deck "${other}" (card ids are unique across decks)`);
      continue;
    }
    cardDeck.set(id, deckId);
    const c = parseCard(file, deckId, id, overlays.get(id) ?? new Map(), add);
    if (c) out.push(c);
  }
  return out;
}

function parseCard(
  file: TreeFile,
  deckId: string,
  id: string,
  overlayFiles: ReadonlyMap<TranslatedLocale, TreeFile>,
  addOuter: AddIssue,
): ParsedRecallCard | null {
  let issueCount = 0;
  const add: AddIssue = (path, message) => {
    issueCount++;
    addOuter(path, message);
  };
  const raw = parseYaml(file, add);
  const y = raw === undefined ? null : validate(recallCardSchema, raw, file.path, add);
  if (!y) return null;
  checkCard(y, file.path, add);

  const translations: Mutable<Translations<RecallCardText>> = {};
  const gaps = {} as Record<TranslatedLocale, string[]>;
  for (const loc of TRANSLATED_LOCALES) {
    const f = overlayFiles.get(loc);
    if (!f) {
      gaps[loc] = [`${id}.${loc}.yaml`];
      continue;
    }
    const ovRaw = parseYaml(f, add);
    const ov = ovRaw === undefined ? null : validate(recallCardOverlaySchema, ovRaw, f.path, add);
    if (!ov) {
      gaps[loc] = ["valid overlay"];
      continue;
    }
    checkOverlay(y, ov, f.path, add);
    const text = cardText(ov);
    if (Object.keys(text).length > 0) translations[loc] = text;
    gaps[loc] = cardGaps(y, ov);
  }
  if (issueCount > 0) return null;

  const locales: Locale[] = [DEFAULT_LOCALE];
  for (const loc of TRANSLATED_LOCALES) if (gaps[loc].length === 0) locales.push(loc);
  const card: RecallCard = {
    id,
    deckId,
    title: y.title,
    topic: y.topic,
    summary: y.summary,
    example: y.example,
    imports: y.imports,
    ...(y.definitions === undefined ? {} : { definitions: y.definitions }),
    ...(y.signature === undefined ? {} : { signature: y.signature }),
    ...(y.frequency === undefined ? {} : { frequency: y.frequency }),
    recognize: { prompt: y.recognize.prompt, choices: y.recognize.choices },
    cloze: { prompt: y.cloze.prompt, code: y.cloze.code },
    ...(y.predict === undefined ? {} : { predict: { prompt: y.predict.prompt, code: y.predict.code } }),
    produce: {
      prompt: y.produce.prompt,
      header: y.produce.header,
      ...(y.produce.hint === undefined ? {} : { hint: y.produce.hint }),
    },
    locales,
  };
  const choiceFeedback: Record<number, string> = {};
  for (const [index, text] of Object.entries(y.recognize.feedback.choices)) choiceFeedback[Number(index)] = text;
  const key: RecallCardKey = {
    cardId: id,
    recognize: { answer: y.recognize.answer, correctFeedback: y.recognize.feedback.correct, choiceFeedback },
    cloze: { answers: y.cloze.answers, expected: y.cloze.expected },
    ...(y.predict === undefined ? {} : { predict: { expected: y.predict.expected } }),
    produce: { checks: y.produce.checks, expected: y.produce.expected, mustUse: y.produce.mustUse, reference: y.produce.reference },
  };
  return { card, key, order: y.order, translations, gaps };
}

/** Static rules of one Korean card (the sandbox rules are content CI's). */
function checkCard(y: RecallCardYaml, path: string, add: AddIssue): void {
  for (const imp of y.imports) {
    if (!IMPORT.test(imp)) add(path, `imports: ${JSON.stringify(imp)} is not a module path such as gleam/list or gleam/list.{map}`);
  }
  if (exampleExpected(y.example) === null) add(path, `example: needs a "${EXAMPLE_ARROW} value" comment with the expected value`);

  const r = y.recognize;
  const n = r.choices.length;
  const seen = new Set<string>();
  for (const c of r.choices) {
    if (seen.has(c)) add(path, `recognize.choices: duplicate choice ${JSON.stringify(c)}`);
    seen.add(c);
  }
  if (r.answer >= n) add(path, `recognize.answer: ${r.answer} is out of range (0..${n - 1})`);
  for (const key of Object.keys(r.feedback.choices)) {
    const i = Number(key);
    if (i >= n) add(path, `recognize.feedback.choices.${key} is out of range (0..${n - 1})`);
    else if (i === r.answer) add(path, `recognize.feedback.choices.${key} is the answer; it is explained by feedback.correct`);
  }
  for (let i = 0; i < n; i++) {
    if (i !== r.answer && own(r.feedback.choices, String(i)) === undefined) add(path, `recognize.feedback.choices: missing explanation for wrong choice ${i}`);
  }

  const blanks = y.cloze.code.split(CLOZE_BLANK).length - 1;
  if (blanks !== 1) add(path, `cloze.code: needs exactly one "${CLOZE_BLANK}" blank (found ${blanks})`);
  for (const a of y.cloze.answers) if (a.includes(CLOZE_BLANK)) add(path, `cloze.answers: ${JSON.stringify(a)} contains the blank`);

  if (!PUB_FN_HEADER.test(y.produce.header)) add(path, 'produce.header: must start with "pub fn <name>("');
  if (y.produce.header.includes("{")) add(path, "produce.header: only the signature; the body braces are added around the answer");
  for (const token of y.produce.mustUse) {
    if (!usesToken(y.produce.reference, token)) add(path, `produce.reference: does not use the mustUse token ${JSON.stringify(token)}`);
  }
}

const NEVER_TRANSLATED = "never translated; code, answers and expected values come from the Korean card";

/** Overlay issues: keys that are never translated, changed code, different choices, unknown feedback indices. */
function checkOverlay(y: RecallCardYaml, ov: RecallCardOverlayYaml, path: string, add: AddIssue): void {
  const forbidden: [string, object | undefined, readonly string[]][] = [
    ["", ov, ["imports"]],
    ["recognize.", ov.recognize, ["answer"]],
    ["cloze.", ov.cloze, ["code", "answers", "expected"]],
    ["predict.", ov.predict, ["code", "expected"]],
    ["produce.", ov.produce, ["header", "checks", "expected", "mustUse", "reference"]],
  ];
  for (const [prefix, obj, keys] of forbidden) {
    for (const k of keys) if (obj !== undefined && Object.hasOwn(obj, k)) add(path, `${prefix}${k}: ${NEVER_TRANSLATED}`);
  }
  if (ov.example !== undefined && codeOnly(ov.example) !== codeOnly(y.example)) {
    add(path, "example: the code differs from the Korean example (only comments may be translated)");
  }
  if (ov.definitions !== undefined) {
    if (y.definitions === undefined) add(path, "definitions: the Korean card has no definitions");
    else if (codeOnly(ov.definitions) !== codeOnly(y.definitions)) add(path, "definitions: the code differs from the Korean definitions (only comments may be translated)");
  }
  if (ov.predict !== undefined && y.predict === undefined) add(path, "predict: the Korean card has no predict item");
  if (ov.produce?.hint !== undefined && y.produce.hint === undefined) add(path, "produce.hint: the Korean card has no hint");
  const choices = ov.recognize?.choices;
  if (choices !== undefined) {
    const ko = y.recognize.choices;
    if (choices.length !== ko.length) {
      add(path, `recognize.choices: has ${choices.length} entries; the Korean card has ${ko.length} (same order, the answer never changes)`);
    } else {
      ko.forEach((choice, i) => {
        if (HANGUL.test(choice) || choices[i] === choice) return;
        const j = choices.indexOf(choice);
        if (j >= 0) add(path, `recognize.choices: ${JSON.stringify(choice)} moved from index ${i} to ${j}; keep the Korean order (the answer never changes)`);
      });
    }
  }
  for (const key of Object.keys(ov.recognize?.feedback?.choices ?? {})) {
    if (own(y.recognize.feedback.choices, key) === undefined) add(path, `recognize.feedback.choices.${key}: unknown choice explanation (not in the Korean card)`);
  }
}

/** The stored overlay: only the translatable keys. */
function cardText(ov: RecallCardOverlayYaml): RecallCardText {
  const r = ov.recognize;
  const feedback = r?.feedback ? defined({ correct: r.feedback.correct, choices: r.feedback.choices }) : undefined;
  const recognize = r ? defined({ prompt: r.prompt, choices: r.choices, feedback: feedback && Object.keys(feedback).length > 0 ? feedback : undefined }) : undefined;
  const produce = ov.produce ? defined({ prompt: ov.produce.prompt, hint: ov.produce.hint }) : undefined;
  const nonEmpty = <T extends object>(o: T | undefined): T | undefined => (o && Object.keys(o).length > 0 ? o : undefined);
  return defined({
    title: ov.title,
    summary: ov.summary,
    example: ov.example,
    definitions: ov.definitions,
    recognize: nonEmpty(recognize),
    cloze: ov.cloze?.prompt === undefined ? undefined : { prompt: ov.cloze.prompt },
    predict: ov.predict?.prompt === undefined ? undefined : { prompt: ov.predict.prompt },
    produce: nonEmpty(produce),
  });
}

/** What a complete translation still lacks; also "still contains Korean" for Hangul left in prose or comments. */
function cardGaps(y: RecallCardYaml, ov: RecallCardOverlayYaml): string[] {
  const gaps: string[] = [];
  if (ov.title === undefined && HANGUL.test(y.title)) gaps.push("title");
  if (ov.summary === undefined) gaps.push("summary");
  if (ov.recognize?.prompt === undefined) gaps.push("recognize.prompt");
  if (ov.recognize?.choices === undefined) gaps.push("recognize.choices");
  if (ov.recognize?.feedback?.correct === undefined) gaps.push("recognize.feedback.correct");
  for (const key of Object.keys(y.recognize.feedback.choices)) {
    if (own(ov.recognize?.feedback?.choices, key) === undefined) gaps.push(`recognize.feedback.choices.${key}`);
  }
  if (ov.cloze?.prompt === undefined) gaps.push("cloze.prompt");
  if (y.predict !== undefined && ov.predict?.prompt === undefined) gaps.push("predict.prompt");
  if (ov.produce?.prompt === undefined) gaps.push("produce.prompt");
  if (y.produce.hint !== undefined && ov.produce?.hint === undefined) gaps.push("produce.hint");
  if (ov.example === undefined && hangulOutsideStrings(y.example)) gaps.push("example (the Korean example has Korean comments)");
  if (ov.definitions === undefined && y.definitions !== undefined && hangulOutsideStrings(y.definitions)) {
    gaps.push("definitions (the Korean definitions have Korean comments)");
  }
  const text = cardText(ov);
  const { example, definitions, ...prose } = text;
  if (HANGUL.test(JSON.stringify(prose)) || [example, definitions].some((c) => c !== undefined && hangulOutsideStrings(c))) {
    gaps.push("still contains Korean");
  }
  return gaps;
}

const WORD = /[A-Za-z0-9_]/;

/**
 * Same rule as the recall module's grader (modules/recall/src/internal/grade.ts containsToken): the token must
 * appear outside comments and string literals and not glued to a longer identifier (`list.fold` is not in
 * `list.fold_right`, `fold` is not in `list.fold`). Keep the two in sync, or a reference could pass CI while no
 * learner answer can.
 */
export function usesToken(code: string, token: string): boolean {
  let src = "";
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    if (ch === '"') {
      i++;
      while (i < code.length && code[i] !== '"') i += code[i] === "\\" ? 2 : 1;
      src += '""';
    } else if (ch === "/" && code[i + 1] === "/") {
      while (i < code.length && code[i] !== "\n") i++;
      src += "\n";
    } else src += ch;
  }
  if (token === "") return true;
  const startsWord = WORD.test(token[0] as string);
  const endsWord = WORD.test(token[token.length - 1] as string);
  for (let i = src.indexOf(token); i >= 0; i = src.indexOf(token, i + 1)) {
    const before = src[i - 1];
    const after = src[i + token.length];
    if (startsWord && before !== undefined && (WORD.test(before) || before === ".")) continue;
    if (endsWord && after !== undefined && WORD.test(after)) continue;
    return true;
  }
  return false;
}
