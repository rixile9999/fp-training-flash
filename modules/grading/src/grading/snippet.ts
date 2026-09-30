/**
 * Snippet evaluation (GradingService.evaluateSnippet): a one-off job through the ordinary runner + harness.
 *
 * Job: learner-like module `src/fp_snippet.gleam`
 *     import gleam/string            (replaced by the request's own gleam/string import, if any)
 *     import <each req.imports>
 *     <blank line>
 *     <req.definitions>
 *     <blank line>
 *     pub fn value() {
 *     <req.expression>
 *     }
 * plus a generated test module `test/fp_snippet_test.gleam` whose only test, `value_test`, panics with
 *     "<token>:<utf-8 byte length of v>:<v>"   where v = string.inspect(fp_snippet.value())
 * The harness reports a panic raised in the test module as status "failed" with message
 * "panic: <that text> (test/fp_snippet_test.gleam:N)" (optionally followed by captured output). The value is
 * accepted only from that result: status "failed", prefix "panic: <token>:" where the token is random per job
 * and lives only in the test module source (snippet code cannot read it: no FFI, no file access), and exactly
 * <length> bytes are taken, so trailing location/output text never leaks into the value. Result lines
 * themselves are protected by the runner nonce, so snippet stdout cannot forge them. If the harness truncated
 * the message (MAX_MESSAGE 3000 bytes), the available prefix is returned followed by "…".
 * A panic/assert/todo in the snippet module is status "error" (runtime_error); timeout -> timeout.
 */
import { randomBytes } from "node:crypto";
import { appError, err, ok } from "@fp/kernel";
import type { AppError, Result } from "@fp/kernel";
import type { RunJob, RunOutput, SnippetRequest, SnippetResult } from "../contract/index.ts";
import { checkSources } from "./static-checks.ts";

export const SNIPPET_LIMITS = { timeMs: 5000, memoryMb: 128 } as const;
export const MAX_SNIPPET_CHARS = 4000;
export const MAX_SNIPPET_IMPORTS = 10;

export const SNIPPET_MODULE = "fp_snippet";
export const SNIPPET_PATH = `src/${SNIPPET_MODULE}.gleam`;
const TEST_MODULE = `${SNIPPET_MODULE}_test`;
export const SNIPPET_TEST = `${TEST_MODULE}.value_test`;

const MODULE = "[a-z][a-z0-9_]*(?:/[a-z][a-z0-9_]*)*";
const ITEM = "(?:type +)?[A-Za-z_][A-Za-z0-9_]*";
/** `gleam/list` or `gleam/list.{map, type Foo}`; no aliases, no newlines. */
const IMPORT = new RegExp(`^(${MODULE})(?:\\.\\{ *(?:${ITEM}(?: *, *${ITEM})* *,? *)?\\})?$`);

export function newSnippetToken(): string {
  return `fpv${randomBytes(12).toString("hex")}`;
}

export type SnippetJob =
  | { readonly kind: "job"; readonly job: RunJob; readonly module: string }
  | { readonly kind: "rejected"; readonly reasons: readonly string[] };

/** Validates the request and builds the job. Size caps are invalid_input; malformed or forbidden code is rejected. */
export function buildSnippetJob(req: SnippetRequest, token: string): Result<SnippetJob, AppError> {
  const definitions = req.definitions ?? "";
  if (typeof req.expression !== "string" || req.expression.trim() === "") {
    return err(appError("invalid_input", "평가할 식이 비어 있습니다."));
  }
  if (req.expression.length > MAX_SNIPPET_CHARS || definitions.length > MAX_SNIPPET_CHARS) {
    return err(appError("invalid_input", `식과 정의는 각각 최대 ${MAX_SNIPPET_CHARS}자입니다.`));
  }
  if (!Array.isArray(req.imports) || req.imports.length > MAX_SNIPPET_IMPORTS) {
    return err(appError("invalid_input", `import는 최대 ${MAX_SNIPPET_IMPORTS}개입니다.`));
  }
  const reasons: string[] = [];
  const imports: string[] = [];
  let stringImport = "gleam/string";
  for (const raw of req.imports) {
    const imp = typeof raw === "string" ? raw.trim() : "";
    const m = IMPORT.exec(imp);
    if (!m) {
      reasons.push(`잘못된 import: ${JSON.stringify(raw).slice(0, 120)} (예: gleam/list 또는 gleam/list.{map, fold})`);
      continue;
    }
    if (m[1] === "gleam/string") stringImport = imp;
    else if (!imports.includes(imp)) imports.push(imp);
  }
  if (reasons.length > 0) return ok({ kind: "rejected", reasons });

  const module = [
    ...[stringImport, ...imports].map((i) => `import ${i}`),
    "",
    definitions,
    "",
    "pub fn value() {",
    req.expression,
    "}",
    "",
  ].join("\n");
  const checked = checkSources([{ path: SNIPPET_PATH, content: module }], new Set([TEST_MODULE]));
  if (checked.length > 0) {
    return ok({ kind: "rejected", reasons: checked.map((r) => r.replace(`${SNIPPET_PATH}: `, "")) });
  }
  const test = [
    `import ${SNIPPET_MODULE}`,
    "import gleam/int",
    "import gleam/string",
    "",
    "pub fn value_test() {",
    `  let v = string.inspect(${SNIPPET_MODULE}.value())`,
    `  panic as { "${token}:" <> int.to_string(string.byte_size(v)) <> ":" <> v }`,
    "}",
    "",
  ].join("\n");
  return ok({
    kind: "job",
    module,
    job: {
      language: "gleam",
      sourceFiles: [{ path: SNIPPET_PATH, content: module }],
      supportFiles: [],
      testFiles: [{ path: `test/${TEST_MODULE}.gleam`, content: test }],
      testFunctions: [SNIPPET_TEST],
      limits: SNIPPET_LIMITS,
    },
  });
}

/** Extracts the inspected value from the value_test failure message, or null when it is not ours. */
export function parseSnippetValue(message: string, token: string): string | null {
  const prefix = `panic: ${token}:`;
  if (!message.startsWith(prefix)) return null;
  const m = /^(\d{1,9}):/.exec(message.slice(prefix.length));
  if (!m) return null;
  const length = Number(m[1]);
  const rest = Buffer.from(message.slice(prefix.length + m[0].length), "utf8");
  if (rest.length >= length) return rest.subarray(0, length).toString("utf8");
  // Truncated by the harness: drop a trailing partial character (decoded as U+FFFD) and mark it.
  return `${rest.toString("utf8").replace(/�$/, "")}…`;
}

/** Maps a runner result to a SnippetResult; runner system errors (and unexpected shapes) are `unavailable`. */
export function interpretSnippetOutput(output: RunOutput, token: string): Result<SnippetResult, AppError> {
  const unavailable = (message: string) =>
    err(appError("unavailable", "실행 환경 오류로 코드를 평가하지 못했습니다. 잠시 후 다시 시도하세요.", { message }));
  switch (output.kind) {
    case "system_error":
      return unavailable(output.message);
    case "timeout":
      return ok({ kind: "timeout" });
    case "compile_error":
      return ok({ kind: "compile_error", diagnostics: output.compileDiagnostics.filter((d) => d.severity === "error") });
    case "completed": {
      const test = output.tests.find((t) => t.functionName === "value_test");
      if (!test) return unavailable("value_test 결과가 없습니다.");
      const message = test.message ?? "";
      if (test.status === "timeout") return ok({ kind: "timeout" });
      if (test.status === "failed") {
        const value = parseSnippetValue(message, token);
        if (value !== null) return ok({ kind: "value", value });
      }
      if (test.status === "passed") return unavailable("value_test가 값을 보고하지 않았습니다.");
      return ok({ kind: "runtime_error", message: message || "실행 중 오류가 발생했습니다." });
    }
  }
}
