/**
 * Grading of one recall answer. Produces a locale-independent `Outcome` (stored with the review, so a repeated
 * answer is re-rendered in the request locale); `renderOutcome` turns it into learner-facing text.
 * The sandbox is used only for cloze fills that are not in the accepted list, and for produce bodies.
 */
import { appError, err, ok } from "@fp/kernel";
import type { AppError, Locale, Result } from "@fp/kernel";
import type { RecallCard, RecallCardKey } from "@fp/content/contract";
import type { Diagnostic, GradingService, SnippetResult } from "@fp/grading/contract";
import type { RecallItemForm, RecallResponse } from "../contract/index.ts";
import { t } from "./messages.ts";

export const MAX_TEXT_CHARS = 1000;
export const MAX_BODY_CHARS = 4000;

export type FeedbackKind =
  | "recognize.correct"
  | "recognize.wrong"
  | "cloze.correct"
  | "cloze.correctByValue"
  | "cloze.empty"
  | "cloze.wrongValue"
  | "cloze.notCompiling"
  | "predict.correct"
  | "predict.wrong"
  | "produce.correct"
  | "produce.empty"
  | "produce.wrongValue"
  | "produce.missing"
  | "produce.compileError"
  | "produce.runtimeError"
  | "produce.timeout"
  | "produce.rejected";

export type StoredDiagnostic =
  | { readonly kind: "line"; readonly line: number; readonly message: string }
  | { readonly kind: "outsideBody"; readonly message: string }
  | { readonly kind: "runtime"; readonly message: string }
  | { readonly kind: "timeout" }
  | { readonly kind: "rejected"; readonly reason: string };

/** Locale-independent grading result (stored as jsonb). */
export interface Outcome {
  readonly correct: boolean;
  readonly feedback: FeedbackKind;
  readonly choice?: number;
  readonly expected?: string;
  readonly actual?: string;
  /** Cloze: the usual accepted fill (shown in feedback). */
  readonly answer?: string;
  /** Cloze: the value the filled code must produce. */
  readonly expectedValue?: string;
  readonly diagnostics?: readonly StoredDiagnostic[];
  readonly missing?: readonly string[];
  readonly reference?: string;
}

export interface Rendered {
  readonly feedback: string;
  readonly expected?: string;
  readonly actual?: string;
  readonly diagnostics?: readonly string[];
  readonly missing?: readonly string[];
  readonly reference?: string;
}

const RESPONSE_KIND: Readonly<Record<RecallItemForm, RecallResponse["kind"]>> = {
  recognize: "choice",
  cloze: "text",
  predict: "text",
  produce: "code",
};

/** Checks the response shape for the item's form. Errors are invalid_input. */
export function validateResponse(form: RecallItemForm, response: unknown, card: RecallCard, locale: Locale): Result<RecallResponse, AppError> {
  const r = response as Partial<{ kind: string; choice: unknown; text: unknown; body: unknown }> | null;
  const kind = RESPONSE_KIND[form];
  if (r === null || typeof r !== "object" || r.kind !== kind) {
    return err(appError("invalid_input", t(locale, "error.wrongResponseKind", { expected: kind })));
  }
  if (kind === "choice") {
    const c = r.choice;
    if (typeof c !== "number" || !Number.isInteger(c) || c < 0 || c >= card.recognize.choices.length) {
      return err(appError("invalid_input", t(locale, "error.invalidChoice", { choice: String(c) })));
    }
    return ok({ kind: "choice", choice: c });
  }
  const value = kind === "text" ? r.text : r.body;
  const max = kind === "text" ? MAX_TEXT_CHARS : MAX_BODY_CHARS;
  if (typeof value !== "string") return err(appError("invalid_input", t(locale, "error.wrongResponseKind", { expected: kind })));
  if (value.length > max) return err(appError("invalid_input", t(locale, "error.answerTooLong", { max })));
  return ok(kind === "text" ? { kind: "text", text: value } : { kind: "code", body: value });
}

/** Removes whitespace outside Gleam string literals (escapes inside literals are kept as typed). */
export function normalizeValue(text: string): string {
  let out = "";
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i] as string;
    if (inString) {
      out += ch;
      if (ch === "\\" && i + 1 < text.length) out += text[++i];
      else if (ch === '"') inString = false;
    } else if (ch === '"') {
      inString = true;
      out += ch;
    } else if (!/\s/.test(ch)) {
      out += ch;
    }
  }
  return out;
}

/** Replaces comments with a newline and string literals with `""`, so tokens inside them do not count. */
export function stripCommentsAndStrings(code: string): string {
  let out = "";
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    if (ch === '"') {
      i++;
      while (i < code.length && code[i] !== '"') i += code[i] === "\\" ? 2 : 1;
      out += '""';
    } else if (ch === "/" && code[i + 1] === "/") {
      while (i < code.length && code[i] !== "\n") i++;
      out += "\n";
    } else {
      out += ch;
    }
  }
  return out;
}

const WORD = /[A-Za-z0-9_]/;

/** True when `token` occurs in `code` not glued to a longer identifier (e.g. `list.fold` is not in `list.fold_right`). */
export function containsToken(code: string, token: string): boolean {
  if (token === "") return true;
  const startsWord = WORD.test(token[0] as string);
  const endsWord = WORD.test(token[token.length - 1] as string);
  for (let i = code.indexOf(token); i >= 0; i = code.indexOf(token, i + 1)) {
    const before = code[i - 1];
    const after = code[i + token.length];
    if (startsWord && before !== undefined && (WORD.test(before) || before === ".")) continue;
    if (endsWord && after !== undefined && WORD.test(after)) continue;
    return true;
  }
  return false;
}

/**
 * Number of module lines before the produce body's first line, following the snippet module layout of the
 * grading contract: `import gleam/string` + distinct other imports, a blank line, then our definitions
 * (card definitions, newline, header line), then the body.
 */
export function bodyLineOffset(card: RecallCard): number {
  const others = new Set<string>();
  for (const raw of card.imports) {
    const imp = raw.trim();
    const mod = imp.split(".{")[0];
    if (mod !== "gleam/string") others.add(imp);
  }
  const importLines = 1 + others.size;
  const definitionLines = (card.definitions ?? "").split("\n").length;
  return importLines + 1 + definitionLines + 1;
}

export function produceDefinitions(card: RecallCard, body: string): string {
  return `${card.definitions ?? ""}\n${card.produce.header} {\n${body}\n}`;
}

export function clozeCode(card: RecallCard, fill: string): string {
  return card.cloze.code.replace("____", fill);
}

type Sandbox = Result<SnippetResult, AppError>;

async function runSnippet(grading: GradingService, imports: readonly string[], definitions: string | undefined, expression: string, locale: Locale): Promise<Sandbox> {
  try {
    const r = await grading.evaluateSnippet({ imports, ...(definitions !== undefined ? { definitions } : {}), expression });
    if (!r.ok && r.error.code === "unavailable") {
      return err(appError("unavailable", t(locale, "error.sandboxUnavailable"), { cause: r.error.message, ...r.error.details }));
    }
    return r;
  } catch (e) {
    return err(appError("unavailable", t(locale, "error.sandboxUnavailable"), { message: e instanceof Error ? e.message : String(e) }));
  }
}

function errorDiagnostics(diags: readonly Diagnostic[], offset: number, bodyLines: number): StoredDiagnostic[] {
  return diags
    .filter((d) => d.severity === "error")
    .map((d) => {
      const rel = d.line === undefined ? undefined : d.line - offset;
      return rel !== undefined && rel >= 1 && rel <= bodyLines
        ? { kind: "line" as const, line: rel, message: d.message }
        : { kind: "outsideBody" as const, message: d.message };
    });
}

/**
 * Grades a validated response. Err only when the sandbox is unavailable (or refuses the request as invalid):
 * the caller then stores nothing so the learner can retry.
 */
export async function gradeResponse(
  form: RecallItemForm,
  response: RecallResponse,
  card: RecallCard,
  key: RecallCardKey,
  grading: GradingService,
  locale: Locale,
): Promise<Result<Outcome, AppError>> {
  switch (form) {
    case "recognize": {
      const choice = response.kind === "choice" ? response.choice : -1;
      const correct = choice === key.recognize.answer;
      const expected = card.recognize.choices[key.recognize.answer];
      return ok({ correct, feedback: correct ? "recognize.correct" : "recognize.wrong", choice, ...(expected !== undefined ? { expected } : {}) });
    }
    case "predict": {
      const typed = response.kind === "text" ? response.text : "";
      const expected = key.predict?.expected ?? "";
      const correct = typed.trim() !== "" && normalizeValue(typed) === normalizeValue(expected);
      return ok({ correct, feedback: correct ? "predict.correct" : "predict.wrong", expected });
    }
    case "cloze": {
      const fill = (response.kind === "text" ? response.text : "").trim();
      const answer = key.cloze.answers[0] ?? "";
      const base = { expected: answer, answer, expectedValue: key.cloze.expected };
      if (fill === "") return ok({ correct: false, feedback: "cloze.empty", ...base });
      if (key.cloze.answers.some((a) => a.trim() === fill)) return ok({ correct: true, feedback: "cloze.correct", ...base });
      const r = await runSnippet(grading, card.imports, card.definitions, clozeCode(card, fill), locale);
      if (!r.ok) return r;
      if (r.value.kind === "value") {
        const correct = r.value.value === key.cloze.expected;
        return ok({ correct, feedback: correct ? "cloze.correctByValue" : "cloze.wrongValue", ...base, actual: r.value.value });
      }
      return ok({ correct: false, feedback: "cloze.notCompiling", ...base });
    }
    case "produce": {
      const body = response.kind === "code" ? response.body : "";
      const reference = key.produce.reference;
      const expected = key.produce.expected;
      if (body.trim() === "") return ok({ correct: false, feedback: "produce.empty", expected, reference });
      const r = await runSnippet(grading, card.imports, produceDefinitions(card, body), key.produce.checks, locale);
      if (!r.ok) return r;
      const res = r.value;
      const stripped = stripCommentsAndStrings(body);
      const missing = key.produce.mustUse.filter((tok) => !containsToken(stripped, tok));
      const common = { expected, reference, ...(missing.length > 0 ? { missing } : {}) };
      switch (res.kind) {
        case "value": {
          const valueOk = res.value === expected;
          const correct = valueOk && missing.length === 0;
          const feedback: FeedbackKind = correct ? "produce.correct" : valueOk ? "produce.missing" : "produce.wrongValue";
          return ok({ correct, feedback, ...common, actual: res.value });
        }
        case "compile_error": {
          const diagnostics = errorDiagnostics(res.diagnostics, bodyLineOffset(card), body.split("\n").length);
          return ok({ correct: false, feedback: "produce.compileError", ...common, diagnostics });
        }
        case "runtime_error":
          return ok({ correct: false, feedback: "produce.runtimeError", ...common, diagnostics: [{ kind: "runtime", message: res.message }] });
        case "timeout":
          return ok({ correct: false, feedback: "produce.timeout", ...common, diagnostics: [{ kind: "timeout" }] });
        case "rejected":
          return ok({
            correct: false,
            feedback: "produce.rejected",
            ...common,
            diagnostics: res.reasons.map((reason) => ({ kind: "rejected" as const, reason })),
          });
      }
    }
  }
}

function renderDiagnostic(d: StoredDiagnostic, locale: Locale): string {
  switch (d.kind) {
    case "line":
      return t(locale, "diag.line", { line: d.line, message: d.message });
    case "outsideBody":
      return t(locale, "diag.outsideBody", { message: d.message });
    case "runtime":
      return t(locale, "diag.runtime", { message: d.message });
    case "timeout":
      return t(locale, "diag.timeout");
    case "rejected":
      return t(locale, "diag.rejected", { reason: d.reason });
  }
}

/** Learner-facing text of an outcome. Recognize feedback comes from the card key in `locale`. */
export function renderOutcome(o: Outcome, key: RecallCardKey | null, locale: Locale): Rendered {
  const params = {
    answer: o.answer ?? "",
    expected: o.expected ?? "",
    expectedValue: o.expectedValue ?? "",
    actual: o.actual ?? "",
    value: o.actual ?? "",
    tokens: (o.missing ?? []).map((x) => `\`${x}\``).join(", "),
  };
  let feedback: string;
  if (o.feedback === "recognize.correct") feedback = key?.recognize.correctFeedback || t(locale, "recognize.correct");
  else if (o.feedback === "recognize.wrong") feedback = (o.choice !== undefined ? key?.recognize.choiceFeedback[o.choice] : undefined) || t(locale, "recognize.wrong", params);
  else feedback = t(locale, o.feedback, params);
  return {
    feedback,
    ...(o.expected !== undefined ? { expected: o.expected } : {}),
    ...(o.actual !== undefined ? { actual: o.actual } : {}),
    ...(o.diagnostics !== undefined ? { diagnostics: o.diagnostics.map((d) => renderDiagnostic(d, locale)) } : {}),
    ...(o.missing !== undefined ? { missing: o.missing } : {}),
    ...(o.reference !== undefined ? { reference: o.reference } : {}),
  };
}
