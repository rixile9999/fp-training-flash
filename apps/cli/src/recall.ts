import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ApiError } from "@fp/api-contract";
import type { ApiClient, RecallAnswerResult, RecallOverview, RecallResponse, RecallSessionView, RecallSummary } from "@fp/api-contract";
import { plainInline, plainText } from "./course.ts";
import { DEFAULT_LOCALE, translator } from "./messages.ts";
import type { Locale, MessageId, Translate } from "./messages.ts";
import type { Prompter } from "./prompt.ts";

// Recall (memorization) in the terminal: `fp recall status` and the interactive `fp recall` session. Cards arrive
// in the account locale and never contain answers; every answer is checked by the server, which also decides the
// stage and the next review. Only the chrome comes from the catalog.

// Types api-contract does not re-export are derived structurally.
export type RecallItem = RecallSessionView["items"][number];
export type RecallCard = RecallItem["card"];
export type RecallStage = RecallAnswerResult["stage"];
export type DeckProgress = RecallOverview["decks"][number];

/** API methods the recall session uses. */
export type RecallApi = Pick<ApiClient, "startRecall" | "recallAnswer" | "finishRecall">;

/** Opens `template` in the learner's editor and resolves with the saved text, or null when the editor failed. */
export type EditBody = (template: string) => Promise<string | null>;

const RULE = "─".repeat(40);
/** Lines of the editor template starting with this marker are instructions, not part of the body. */
export const TEMPLATE_MARKER = "//fp";

const FORM: Record<RecallItem["form"], MessageId> = {
  recognize: "recallFormRecognize",
  cloze: "recallFormCloze",
  predict: "recallFormPredict",
  produce: "recallFormProduce",
};
const KIND: Record<RecallItem["kind"], MessageId> = {
  new: "recallKindNew",
  review: "recallKindReview",
  mix: "recallKindMix",
  finale: "recallKindFinale",
};

function indent(s: string, pad = "    "): string {
  return s
    .replace(/\n+$/, "")
    .split("\n")
    .map((l) => (l ? pad + l : l))
    .join("\n");
}

function pct(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "-";
}

// ---------- status ----------

function deckLine(t: Translate, d: DeckProgress): string {
  return t("recallDeckLine", { title: d.title, id: d.deckId, seen: d.seen, total: d.total, mastered: d.mastered, due: d.due });
}

export function formatRecallOverview(o: RecallOverview, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  const out = [t("recallHeading"), t("recallStatusLine", { due: o.dueNow, fresh: o.newAvailableToday, perDay: o.newPerDay }), ""];
  for (const d of o.decks) out.push(`  ${deckLine(t, d)}`);
  out.push("", t("recallStartHow", { deck: o.decks[0]?.deckId ?? "stdlib" }));
  return out.join("\n");
}

// ---------- one item ----------

/** The question of one item. Never contains an answer: cards have none. */
export function formatRecallItem(item: RecallItem, position: number, total: number, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  const { card } = item;
  const out = [RULE, `[${position}/${total}] ${card.title} · ${t(KIND[item.kind])} · ${t(FORM[item.form])}`];
  if (item.kind === "new") {
    out.push(plainText(card.summary));
    if (card.signature) out.push(t("recallSignature", { signature: card.signature }));
    out.push(t("recallExampleLabel"), indent(card.example), "");
  }
  const definitions = card.definitions?.trim() ? [t("recallDefinitionsLabel"), indent(card.definitions), ""] : [];
  switch (item.form) {
    case "recognize":
      out.push(plainText(card.recognize.prompt), "", card.recognize.choices.map((c, i) => `  ${i + 1}) ${plainInline(c)}`).join("\n"));
      break;
    case "cloze":
      out.push(plainText(card.cloze.prompt), "", ...definitions, indent(card.cloze.code));
      break;
    case "predict":
      out.push(plainText(card.predict?.prompt ?? ""), "", ...definitions, indent(card.predict?.code ?? ""));
      break;
    case "produce": {
      const imports = card.imports.map((m) => `import ${m}`).join("\n");
      out.push(plainText(card.produce.prompt), "");
      if (imports) out.push(indent(imports), "");
      if (card.definitions?.trim()) out.push(indent(card.definitions), "");
      out.push(indent(`${card.produce.header} {\n  ...\n}`));
      break;
    }
  }
  return out.join("\n");
}

/** "in 10 min" / "in 3 h" / "in 4 days" relative to `now`. */
export function dueIn(nextDueAt: string, now: number, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  const ms = Math.max(0, Date.parse(nextDueAt) - now);
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return t("recallDueMinutes", { n: Math.max(1, minutes) });
  const hours = Math.round(ms / 3_600_000);
  if (hours < 24) return t("recallDueHours", { n: hours });
  return t("recallDueDays", { n: Math.round(ms / 86_400_000) });
}

export function formatRecallResult(res: RecallAnswerResult, now: number, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  const out = [res.correct ? `✓ ${t("recallCorrect")}` : `✗ ${t("recallWrong")}`];
  if (res.feedback.trim()) out.push(plainText(res.feedback));
  if (res.expected !== undefined) out.push(t("recallExpected", { value: res.expected }));
  if (res.actual !== undefined) out.push(t("recallActual", { value: res.actual }));
  if (res.missing && res.missing.length > 0) out.push(t("recallMissing", { tokens: res.missing.join(", ") }));
  if (res.diagnostics && res.diagnostics.length > 0) out.push(t("recallDiagnostics"), ...res.diagnostics.map((d) => indent(d)));
  if (res.reference !== undefined) out.push(t("recallReference"), indent(res.reference));
  out.push(t("recallNext", { when: dueIn(res.nextDueAt, now, locale), stage: t(FORM[res.stage]) }));
  return out.join("\n");
}

export function formatRecallSummary(s: RecallSummary, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  const out = [
    RULE,
    t("recallSummaryHeading"),
    t("recallSummaryLine", {
      answered: s.answered,
      correct: s.correct,
      accuracy: pct(s.correct, s.answered),
      learned: s.newLearned,
      tomorrow: s.dueTomorrow,
    }),
  ];
  for (const d of s.decks) out.push(`  ${t("recallSummaryDeck", { title: d.title, mastered: d.mastered, total: d.total, due: d.due })}`);
  return out.join("\n");
}

// ---------- editor ----------

/** The file the learner edits for a produce item: instructions as marker comments, then room for the body. */
export function bodyTemplate(item: RecallItem, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  const { card } = item;
  const lines = [
    `${TEMPLATE_MARKER} ${t("recallEditorTemplate", { marker: TEMPLATE_MARKER })}`,
    ...plainText(card.produce.prompt)
      .split("\n")
      .map((l) => `${TEMPLATE_MARKER} ${l}`),
    ...card.imports.map((m) => `${TEMPLATE_MARKER} import ${m}`),
    ...(card.definitions?.trim() ? card.definitions.trim().split("\n").map((l) => `${TEMPLATE_MARKER} ${l}`) : []),
    `${TEMPLATE_MARKER} ${card.produce.header} {`,
    "",
    `${TEMPLATE_MARKER} }`,
  ];
  return lines.join("\n") + "\n";
}

/** The body from an edited template: marker lines dropped, surrounding blank lines trimmed. */
export function bodyFromTemplate(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((l) => !l.trimStart().startsWith(TEMPLATE_MARKER))
    .join("\n")
    .replace(/^\s*\n/, "")
    .trimEnd();
}

/** Runs `$EDITOR <file>` (the command may carry arguments, e.g. "code -w") on a temporary .gleam file. */
export function externalEditor(command: string): EditBody {
  return async (template) => {
    const dir = await mkdtemp(join(tmpdir(), "fp-recall-"));
    const file = join(dir, "body.gleam");
    try {
      await writeFile(file, template, "utf8");
      const r = spawnSync(`${command} "${file}"`, { shell: true, stdio: "inherit" });
      if (r.error || r.status !== 0) return null;
      return await readFile(file, "utf8");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  };
}

// ---------- interactive session ----------

export interface RecallSessionDeps {
  readonly api: RecallApi;
  /** Creates a prompter; called again after the editor ran, because the editor needs the terminal alone. */
  readonly prompter: () => Prompter;
  readonly out: (text: string) => void;
  readonly locale: Locale;
  readonly now: () => number;
  /** Set when $EDITOR is: produce bodies are written there instead of line by line. */
  readonly editBody?: EditBody | undefined;
  readonly editorName?: string | undefined;
}

export interface RecallSessionOptions {
  readonly minutes?: number;
  readonly deckIds?: readonly string[];
}

/** Errors that only affect one answer; the session goes on with the next item. */
const PER_ITEM_ERRORS = new Set(["rate_limited", "unavailable", "internal", "invalid_input", "conflict"]);

/** null = the learner stopped (EOF / Ctrl-C / Ctrl-D). */
type Answer = RecallResponse | null;

/**
 * Starts a session and asks one item at a time. Stopping early still finishes the session (answers are already
 * recorded per item). Returns the summary, or null when there was nothing to do.
 */
export async function runRecallSession(
  deps: RecallSessionDeps,
  opts: RecallSessionOptions,
): Promise<{ readonly view: RecallSessionView; readonly summary: RecallSummary | null; readonly stopped: boolean }> {
  const { api, out, locale, now } = deps;
  const t = translator(locale);
  const view = await api.startRecall({
    ...(opts.minutes === undefined ? {} : { minutes: opts.minutes }),
    ...(opts.deckIds === undefined ? {} : { deckIds: opts.deckIds }),
  });
  if (view.items.length === 0) {
    out(t("recallNothingToDo"));
    return { view, summary: null, stopped: false };
  }

  let prompter = deps.prompter();
  const ask = async (q: string) => prompter.ask(q);

  const askChoice = async (max: number): Promise<Answer> => {
    for (;;) {
      const line = await ask(t("recallAskChoice", { max }));
      if (line === null) return null;
      const v = line.trim();
      if (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= max) return { kind: "choice", choice: Number(v) - 1 };
      out(t("recallInvalidChoice", { max }));
    }
  };

  const askLines = async (item: RecallItem): Promise<Answer> => {
    out(t("recallProduceHow"));
    const lines: string[] = [];
    for (;;) {
      const line = await ask(lines.length === 0 ? t("recallBodyFirst") : t("recallBodyMore"));
      if (line === null) return null;
      if (lines.length === 0 && line.trim() === "?") {
        out(item.card.produce.hint ? t("recallHint", { hint: plainInline(item.card.produce.hint) }) : t("recallNoHint"));
        continue;
      }
      if (line.trim() === "") break;
      lines.push(line);
    }
    return { kind: "code", body: lines.join("\n") };
  };

  const askBody = async (item: RecallItem): Promise<Answer> => {
    if (!deps.editBody) return askLines(item);
    out(t("recallProduceEditorHow", { editor: deps.editorName ?? "$EDITOR" }));
    if (item.card.produce.hint) out(t("recallHint", { hint: plainInline(item.card.produce.hint) }));
    // The editor needs the terminal: release readline while it runs.
    prompter.close();
    let edited: string | null;
    try {
      edited = await deps.editBody(bodyTemplate(item, locale));
    } finally {
      prompter = deps.prompter();
    }
    if (edited === null) {
      out(t("recallEditorFailed"));
      return askLines(item);
    }
    const body = bodyFromTemplate(edited);
    if (body) out(indent(body));
    return { kind: "code", body };
  };

  const askItem = async (item: RecallItem): Promise<Answer> => {
    switch (item.form) {
      case "recognize":
        return askChoice(item.card.recognize.choices.length);
      case "cloze":
      case "predict": {
        const line = await ask(t(item.form === "cloze" ? "recallAskBlank" : "recallAskValue"));
        return line === null ? null : { kind: "text", text: line.trim() };
      }
      case "produce":
        return askBody(item);
    }
  };

  let stopped = false;
  try {
    out(t("recallSessionHeader", { count: view.items.length }));
    for (const [i, item] of view.items.entries()) {
      out(`\n${formatRecallItem(item, i + 1, view.items.length, locale)}\n`);
      const shownAt = now();
      const response = await askItem(item);
      if (response === null) {
        stopped = true;
        break;
      }
      try {
        const res = await api.recallAnswer(view.sessionId, { itemId: item.itemId, response, elapsedMs: Math.max(0, now() - shownAt) });
        out(formatRecallResult(res, now(), locale));
      } catch (e) {
        if (!(e instanceof ApiError) || !PER_ITEM_ERRORS.has(e.code)) throw e;
        out(t("recallAnswerFailed", { message: e.message }));
      }
    }
  } finally {
    prompter.close();
  }
  if (stopped) out(`\n${t("recallStopped")}`);
  const summary = await api.finishRecall(view.sessionId);
  out(`\n${formatRecallSummary(summary, locale)}`);
  return { view, summary, stopped };
}
