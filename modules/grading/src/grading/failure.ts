/**
 * Structured test failures. The Erlang harness reports *what* happened as language-neutral fields
 * (kind, expected, actual, raw message, location, limits); the text is rendered here per locale.
 *
 * Runner adapters attach the structure to their RawTestResult objects as extra fields (RawTestDetail) and
 * still fill `message` with the Korean rendering, so RawTestResult.message stays backward compatible for
 * callers that only read the contract. interpretRunOutput re-renders in the request locale when the structure
 * is present and falls back to `message` otherwise (fake runners, old images).
 */
import { DEFAULT_LOCALE } from "@fp/kernel";
import type { Locale } from "@fp/kernel";
import type { RawTestResult } from "../contract/index.ts";
import { msg } from "../messages.ts";

export const FAILURE_KINDS = [
  /** Not started: the whole test phase budget was used by earlier tests. */
  "budget_exhausted",
  "timeout",
  "memory",
  "crashed",
  "test_not_found",
  "module_not_found",
  "bad_test_name",
  /** Gleam `assert`; see assertKind. */
  "assert",
  /** gleeunit/should.equal: expected / actual. */
  "should_equal",
  "should_not_equal",
  /** Any other assertion library message (gleeunit/should, qcheck), shown as is. */
  "assertion_message",
  "panic",
  "todo",
  "let_assert",
  /** Another Gleam runtime error kind (gleamKind). */
  "gleam_error",
  /** A plain Erlang exception (errorClass, reason, frame). */
  "exception",
  /** Synthesised by the adapter: the harness finished without reporting this test. */
  "not_reported",
  /** Synthesised by the adapter: the harness died before reporting this test. */
  "aborted",
] as const;

export type FailureKind = (typeof FAILURE_KINDS)[number];

export interface FailureLocation {
  readonly file: string;
  readonly line: number;
}

export interface FailureFrame {
  readonly module: string;
  readonly function: string;
  readonly arity: number;
  readonly line?: number;
}

/** Flat on purpose: it is parsed from harness JSON. Which fields are set depends on `kind`. */
export interface TestFailure {
  readonly kind: FailureKind;
  /** Raw message (panic/todo text, assertion library message, Gleam error message). */
  readonly message?: string;
  readonly expected?: string;
  readonly actual?: string;
  /** let_assert: the value that did not match. */
  readonly value?: string;
  readonly assertKind?: "binary_operator" | "function_call" | "expression";
  readonly operator?: string;
  /** null = not evaluated (short-circuit). */
  readonly left?: string | null;
  readonly right?: string | null;
  readonly arguments?: readonly (string | null)[];
  readonly limitMs?: number;
  readonly limitMb?: number;
  /** crashed / exception: printed Erlang term. */
  readonly reason?: string;
  readonly errorClass?: string;
  readonly gleamKind?: string;
  /** test_not_found / bad_test_name: qualified test name. */
  readonly name?: string;
  /** module_not_found */
  readonly module?: string;
  readonly location?: FailureLocation;
  readonly frame?: FailureFrame;
}

/** RawTestResult plus the structured failure and captured learner output (internal to grading). */
export interface RawTestDetail extends RawTestResult {
  readonly failure?: TestFailure;
  /** Learner stdout captured while the test ran (failed tests only). */
  readonly output?: string;
  readonly outputTruncated?: boolean;
}

const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
/** null stays null (not evaluated); anything else that is not a string becomes "?". */
const operandOf = (v: unknown): string | null => (v === null ? null : (str(v) ?? "?"));

function pick<T>(entries: readonly (readonly [string, T | undefined])[]): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [k, v] of entries) if (v !== undefined) out[k] = v;
  return out;
}

/** Validates a harness `failure` object; unknown kinds and malformed fields are dropped. */
export function parseFailure(value: unknown): TestFailure | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const o = value as Record<string, unknown>;
  const kind = o.kind;
  if (typeof kind !== "string" || !(FAILURE_KINDS as readonly string[]).includes(kind)) return undefined;
  const loc = o.location as Record<string, unknown> | null | undefined;
  const location =
    loc && typeof loc === "object" && str(loc.file) !== undefined && num(loc.line) !== undefined
      ? { file: loc.file as string, line: loc.line as number }
      : undefined;
  const fr = o.frame as Record<string, unknown> | null | undefined;
  const frame =
    fr && typeof fr === "object" && str(fr.module) !== undefined && str(fr.function) !== undefined && num(fr.arity) !== undefined
      ? {
          module: fr.module as string,
          function: fr.function as string,
          arity: fr.arity as number,
          ...(num(fr.line) !== undefined ? { line: fr.line as number } : {}),
        }
      : undefined;
  const assertKind =
    o.assertKind === "binary_operator" || o.assertKind === "function_call" || o.assertKind === "expression"
      ? o.assertKind
      : undefined;
  const args = Array.isArray(o.arguments) ? o.arguments.map(operandOf) : undefined;
  return {
    kind: kind as FailureKind,
    ...pick<string>([
      ["message", str(o.message)],
      ["expected", str(o.expected)],
      ["actual", str(o.actual)],
      ["value", str(o.value)],
      ["operator", str(o.operator)],
      ["reason", str(o.reason)],
      ["errorClass", str(o.errorClass)],
      ["gleamKind", str(o.gleamKind)],
      ["name", str(o.name)],
      ["module", str(o.module)],
    ]),
    ...pick<number>([
      ["limitMs", num(o.limitMs)],
      ["limitMb", num(o.limitMb)],
    ]),
    ...("left" in o ? { left: operandOf(o.left) } : {}),
    ...("right" in o ? { right: operandOf(o.right) } : {}),
    ...(assertKind ? { assertKind } : {}),
    ...(args ? { arguments: args } : {}),
    ...(location ? { location } : {}),
    ...(frame ? { frame } : {}),
  };
}

function where(f: TestFailure): string {
  return f.location ? ` (${f.location.file}:${f.location.line})` : "";
}

function operand(v: string | null | undefined, locale: Locale): string {
  return v === null ? msg("failure.unevaluated", locale) : (v ?? "?");
}

/** The failure description in `locale` (without captured output). */
export function renderFailure(f: TestFailure, locale: Locale = DEFAULT_LOCALE): string {
  const w = where(f);
  const message = f.message ?? "";
  switch (f.kind) {
    case "budget_exhausted":
      return msg("failure.budgetExhausted", locale, { limitMs: f.limitMs ?? "?" });
    case "timeout":
      return msg("failure.timeout", locale, { limitMs: f.limitMs ?? "?" });
    case "memory":
      return msg("failure.memory", locale, { limitMb: f.limitMb ?? "?" });
    case "crashed":
      return msg("failure.crashed", locale, { reason: f.reason ?? "?" });
    case "test_not_found":
      return msg("failure.testNotFound", locale, { name: f.name ?? "?" });
    case "module_not_found":
      return msg("failure.moduleNotFound", locale, { module: f.module ?? "?" });
    case "bad_test_name":
      return msg("failure.badTestName", locale, { name: f.name ?? "?" });
    case "assert": {
      const detail =
        f.assertKind === "binary_operator"
          ? msg("failure.assert.binaryOperator", locale, {
              operator: f.operator ?? "?",
              left: operand(f.left, locale),
              right: operand(f.right, locale),
            })
          : f.assertKind === "function_call"
            ? msg("failure.assert.functionCall", locale, {
                arguments: (f.arguments ?? []).map((a) => operand(a, locale)).join(", "),
              })
            : msg("failure.assert.expression", locale);
      return msg("failure.assert", locale, { detail, where: w });
    }
    case "should_equal":
      return msg("failure.shouldEqual", locale, { expected: f.expected ?? "?", actual: f.actual ?? "?", where: w });
    case "should_not_equal":
      return msg("failure.shouldNotEqual", locale, { actual: f.actual ?? "?", where: w });
    case "assertion_message":
      return `${message}${w}`;
    case "panic":
      // Same in every locale: `panic` is Gleam syntax, and snippets parse this exact prefix.
      return `panic: ${message}${w}`;
    case "todo":
      return msg("failure.todo", locale, { message, where: w });
    case "let_assert":
      return msg("failure.letAssert", locale, { value: f.value ?? "?", where: w });
    case "gleam_error":
      return `${f.gleamKind ?? "error"}: ${message}${w}`;
    case "exception": {
      const fr = f.frame;
      const frame = !fr
        ? ""
        : fr.line === undefined
          ? ` (${fr.module}:${fr.function}/${fr.arity})`
          : msg("failure.frameLine", locale, { module: fr.module, function: fr.function, arity: fr.arity, line: fr.line });
      return msg("failure.exception", locale, { errorClass: f.errorClass ?? "error", reason: f.reason ?? "?", frame });
    }
    case "not_reported":
      return msg("failure.notReported", locale);
    case "aborted":
      return msg("failure.aborted", locale);
  }
}

/**
 * The learner-facing message of a raw test result in `locale`: the rendered failure plus captured output when
 * the structure is present, else the adapter's own `message` (unchanged).
 */
export function renderTestMessage(raw: RawTestDetail, locale: Locale = DEFAULT_LOCALE): string | undefined {
  const hasOutput = raw.output !== undefined && raw.output !== "";
  if (!raw.failure && !hasOutput) return raw.message;
  const body = raw.failure ? renderFailure(raw.failure, locale) : raw.message;
  if (!hasOutput) return body;
  const output = raw.outputTruncated ? `${raw.output}${msg("failure.outputTruncated", locale)}` : raw.output!;
  return body ? msg("failure.withOutput", locale, { message: body, output }) : msg("failure.outputOnly", locale, { output });
}
