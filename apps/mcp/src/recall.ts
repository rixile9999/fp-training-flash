import type { RecallAnswerResult, RecallDeckCards, RecallOverview, RecallSessionView, RecallSummary } from "@fp/api-contract";
import { DEFAULT_LOCALE, translator } from "./messages.ts";
import type { Locale, MessageId, Translate } from "./messages.ts";

// Markdown rendering of recall (memorization) for MCP hosts. Cards arrive in the learner's locale and never contain
// answers (no accepted fills, expected values, checks or reference bodies); the server checks every answer.
// Recognize choices are labelled with their 0-based index because recall_answer takes that index.

// Types api-contract does not re-export are derived structurally.
type RecallItem = RecallSessionView["items"][number];
type DeckProgress = RecallOverview["decks"][number];

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

function fence(code: string): string {
  return "```gleam\n" + code.replace(/\n+$/, "") + "\n```";
}

function pct(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "-";
}

/** "2026-10-05 09:30 UTC". */
function when(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : `${d.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

function deckLine(t: Translate, d: DeckProgress): string {
  return `- ${t("recallDeckLine", { title: d.title, id: d.deckId, seen: d.seen, total: d.total, mastered: d.mastered, due: d.due })}`;
}

export function renderRecallOverview(o: RecallOverview, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  return [
    `## ${t("recallHeading")}`,
    t("recallStatusLine", { due: o.dueNow, fresh: o.newAvailableToday, perDay: o.newPerDay }),
    o.decks.map((d) => deckLine(t, d)).join("\n"),
    t("recallStartHow"),
  ].join("\n\n");
}

/** One item for the host to present. Contains no answer. */
export function renderRecallItem(item: RecallItem, position: number, total: number, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  const { card } = item;
  const parts = [`### ${t("recallItemHeading", { position, total, id: item.itemId })} · ${card.title} · ${t(KIND[item.kind])} · ${t(FORM[item.form])}`];
  if (item.kind === "new") {
    parts.push(`${t("recallNewCardIntro")}\n\n${card.summary.trim()}`);
    if (card.signature) parts.push(t("recallSignature", { signature: card.signature }));
    parts.push(fence(card.example));
  }
  const definitions = card.definitions?.trim() ? [`${t("recallDefinitionsLabel")}\n\n${fence(card.definitions)}`] : [];
  switch (item.form) {
    case "recognize":
      parts.push(card.recognize.prompt.trim(), card.recognize.choices.map((c, i) => `- [${i}] ${c}`).join("\n"));
      break;
    case "cloze":
      parts.push(card.cloze.prompt.trim(), ...definitions, fence(card.cloze.code), t("recallAnswerWithText"));
      break;
    case "predict":
      parts.push((card.predict?.prompt ?? "").trim(), ...definitions, fence(card.predict?.code ?? ""), t("recallAnswerWithText"));
      break;
    case "produce": {
      const head = [...card.imports.map((m) => `import ${m}`), ...(card.definitions?.trim() ? ["", card.definitions.trim()] : [])];
      const code = [...head, ...(head.length > 0 ? [""] : []), `${card.produce.header} {`, "  ...", "}"].join("\n");
      parts.push(card.produce.prompt.trim(), fence(code), t("recallAnswerWithBody"));
      if (card.produce.hint) parts.push(t("recallHintOnRequest", { hint: card.produce.hint.trim() }));
      break;
    }
  }
  return parts.join("\n\n");
}

export function renderRecallSession(view: RecallSessionView, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  if (view.items.length === 0) return t("recallNothingToDo");
  return [
    `## ${t("recallSessionHeader", { count: view.items.length })}`,
    t("recallSessionIdLine", { id: view.sessionId }),
    ...view.items.map((item, i) => renderRecallItem(item, i + 1, view.items.length, locale)),
    t("recallFinishHow", { id: view.sessionId }),
  ].join("\n\n");
}

export function renderRecallResult(res: RecallAnswerResult, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  const out = [res.correct ? `✓ ${t("recallCorrect")}` : `✗ ${t("recallWrong")}`];
  if (res.feedback.trim()) out.push(res.feedback.trim());
  const values: string[] = [];
  if (res.expected !== undefined) values.push(t("recallExpected", { value: res.expected }));
  if (res.actual !== undefined) values.push(t("recallActual", { value: res.actual }));
  if (res.missing && res.missing.length > 0) values.push(t("recallMissing", { tokens: res.missing.map((m) => `\`${m}\``).join(", ") }));
  if (values.length > 0) out.push(values.join("\n"));
  if (res.diagnostics && res.diagnostics.length > 0) out.push(`${t("recallDiagnostics")}\n\n${"```\n" + res.diagnostics.join("\n") + "\n```"}`);
  if (res.reference !== undefined) out.push(`${t("recallReference")}\n\n${fence(res.reference)}`);
  out.push(t("recallNext", { when: when(res.nextDueAt), stage: t(FORM[res.stage]) }));
  return out.join("\n\n");
}

export function renderRecallSummary(s: RecallSummary, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  const out = [
    `## ${t("recallSummaryHeading")}`,
    t("recallSummaryLine", { answered: s.answered, correct: s.correct, accuracy: pct(s.correct, s.answered), learned: s.newLearned, tomorrow: s.dueTomorrow }),
  ];
  if (s.decks.length > 0) out.push(s.decks.map((d) => deckLine(t, d)).join("\n"));
  return out.join("\n\n");
}

/** A deck's cards with the learner's state (summaries and examples only; never answers). */
export function renderRecallCards(deckId: string, cards: RecallDeckCards, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  const rows = cards.map((c) => {
    const state = c.state
      ? t("recallCardState", { stage: t(FORM[c.state.stage]), reps: c.state.reps, due: c.state.dueAt ? when(c.state.dueAt) : "-" })
      : t("recallCardNew");
    return `- **${c.title}** (\`${c.id}\`) · ${state}\n  ${c.summary.trim().replace(/\n/g, "\n  ")}`;
  });
  return [`## ${t("recallCardsHeading", { deck: deckId, count: cards.length })}`, rows.join("\n") || t("recallNoCards")].join("\n\n");
}
