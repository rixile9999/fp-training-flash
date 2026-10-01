/**
 * Parses what entry.sh + the Erlang harness print. Only lines starting with "@@FP:<nonce>@@" are
 * trusted; the nonce is random per job and deleted before learner code runs, and learner stdout is
 * captured by the harness (it only ever appears inside a JSON string), so results cannot be forged.
 * Test events carry a structured `failure` (+ captured `output`); the text is rendered per locale by
 * src/grading/failure.ts. system_error messages are English operator diagnostics.
 */
import type { Diagnostic, PerfMeasurement, RawTestResult, RunOutput, RunnerInfo, TestStatus } from "../contract/index.ts";
import { parseFailure, renderTestMessage, type RawTestDetail, type TestFailure } from "../grading/failure.ts";
import type { JobLayout, LearnerInfo } from "./project.ts";

export interface ProcessOutcome {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number | null;
  /** The wall-clock limit fired and the job was killed. */
  readonly timedOut: boolean;
  /** stdout exceeded the size cap and the job was killed. */
  readonly truncated: boolean;
  readonly durationMs: number;
}

interface HarnessEvent {
  readonly type: string;
  readonly [key: string]: unknown;
}

const TEST_STATUSES: readonly TestStatus[] = ["passed", "failed", "error", "timeout"];
const PERF_STATUSES: readonly PerfMeasurement["status"][] = ["ok", "timeout", "error"];

export function markerFor(nonce: string): string {
  return `@@FP:${nonce}@@`;
}

interface Parsed {
  readonly events: HarnessEvent[];
  /** Compiler output printed between build_begin and build_end. */
  readonly buildLog: string;
  readonly buildBegun: boolean;
  readonly buildExit: number | null;
}

export function parseStdout(stdout: string, nonce: string): Parsed {
  const marker = markerFor(nonce);
  const events: HarnessEvent[] = [];
  const buildLines: string[] = [];
  let buildBegun = false;
  let buildExit: number | null = null;
  for (const line of stdout.split("\n")) {
    if (!line.startsWith(marker)) {
      if (buildBegun && buildExit === null) buildLines.push(line);
      continue;
    }
    let event: HarnessEvent;
    try {
      const value: unknown = JSON.parse(line.slice(marker.length));
      if (typeof value !== "object" || value === null || typeof (value as HarnessEvent).type !== "string") continue;
      event = value as HarnessEvent;
    } catch {
      continue;
    }
    if (event.type === "build_begin") buildBegun = true;
    else if (event.type === "build_end") buildExit = typeof event.exitCode === "number" ? event.exitCode : 1;
    else events.push(event);
  }
  return { events, buildLog: buildLines.join("\n"), buildBegun, buildExit };
}

const HEAD = /^(error|warning)(?:\[[^\]]*\])?: (.*)$/;
const LOCATION = /^\s*┌─ (.+?):(\d+):(\d+)\s*$/;
const NOISE = /^\s*(Compiling|Compiled|Downloading|Downloaded|Resolving|Checking) /;

/** Maps `gleam build` output to diagnostics; file paths become project-relative ("src/coupon.gleam"). */
export function parseGleamDiagnostics(log: string, projectDir: string): Diagnostic[] {
  const out: Diagnostic[] = [];
  const root = projectDir.endsWith("/") ? projectDir : `${projectDir}/`;
  const relative = (p: string): string => {
    if (p.startsWith(root)) return p.slice(root.length);
    const m = /(?:^|\/)((?:src|test)\/.+)$/.exec(p);
    return m?.[1] ?? p;
  };
  let current: { severity: "error" | "warning"; title: string; body: string[]; file?: string; line?: number; column?: number } | null =
    null;
  const flush = () => {
    if (!current) return;
    const body = current.body.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    const message = body ? `${current.title}\n${body}` : current.title;
    out.push({
      severity: current.severity,
      message: message.split(root).join(""),
      ...(current.file !== undefined ? { file: current.file } : {}),
      ...(current.line !== undefined ? { line: current.line } : {}),
      ...(current.column !== undefined ? { column: current.column } : {}),
    });
    current = null;
  };
  for (const raw of log.split("\n")) {
    const line = raw.replace(/\r$/, "");
    const head = HEAD.exec(line);
    if (head) {
      flush();
      current = { severity: head[1] as "error" | "warning", title: head[2]!.trim(), body: [] };
      continue;
    }
    if (!current) continue;
    const loc = current.file === undefined ? LOCATION.exec(line) : null;
    if (loc) {
      current.file = relative(loc[1]!);
      current.line = Number(loc[2]);
      current.column = Number(loc[3]);
      continue;
    }
    if (NOISE.test(line)) continue;
    current.body.push(line);
  }
  flush();
  return out;
}

/** Fills RawTestResult.message with the default-locale (ko) rendering, for callers that only read the contract. */
function withMessage(raw: RawTestDetail): RawTestDetail {
  if (!raw.failure && raw.output === undefined) return raw;
  const message = renderTestMessage(raw);
  return message === undefined ? raw : { ...raw, message };
}

function tail(text: string, max = 2000): string {
  const t = text.trim();
  return t.length > max ? `...${t.slice(-max)}` : t;
}

function shortName(qualified: string): string {
  const i = qualified.lastIndexOf(".");
  return i >= 0 ? qualified.slice(i + 1) : qualified;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Splits compile diagnostics into the learner's own (errors in learner files, or errors in test files
 * that mention a learner module or public name, e.g. a renamed function or changed signature) and
 * content bugs (support/test files that do not compile for any other reason).
 */
export function classifyDiagnostics(
  diagnostics: readonly Diagnostic[],
  learner: LearnerInfo,
): { readonly learner: Diagnostic[]; readonly content: Diagnostic[] } {
  const words = [...learner.modules, ...learner.names].filter((w) => w.length > 0);
  const mentions = words.length
    ? new RegExp(`(?<![A-Za-z0-9_])(${words.map(escapeRe).join("|")})(?![A-Za-z0-9_])`)
    : null;
  const own: Diagnostic[] = [];
  const content: Diagnostic[] = [];
  for (const d of diagnostics) {
    if (d.file === undefined || learner.paths.includes(d.file)) own.push(d);
    else if (d.severity === "warning") continue; // warnings in exercise files are not the learner's concern
    else if (d.file.startsWith("test/") && mentions?.test(d.message)) own.push(d);
    else content.push(d);
  }
  return { learner: own, content };
}

function compileFailure(diagnostics: readonly Diagnostic[], layout: JobLayout, runner: RunnerInfo, durationMs: number): RunOutput {
  const split = classifyDiagnostics(diagnostics, layout.learner);
  if (split.learner.some((d) => d.severity === "error")) {
    return { kind: "compile_error", compileDiagnostics: split.learner, runner, durationMs };
  }
  const first = split.content[0];
  const where = first?.file ? ` (${first.file}${first.line ? `:${first.line}` : ""})` : "";
  return {
    kind: "system_error",
    message: `exercise test/support code does not compile (content bug)${where}: ${first?.message ?? "unknown error"}`,
    runner,
  };
}

/**
 * Turns the process result into a RunOutput. `runner` describes the adapter; `projectDir` is where the
 * project lived when it was compiled (used to shorten diagnostic paths).
 */
export function toRunOutput(
  proc: ProcessOutcome,
  nonce: string,
  layout: JobLayout,
  runner: RunnerInfo,
  projectDir: string,
): RunOutput {
  const durationMs = proc.durationMs;
  const parsed = parseStdout(proc.stdout, nonce);
  const diagnostics = parseGleamDiagnostics(parsed.buildLog, projectDir);
  const systemError = (message: string): RunOutput => ({ kind: "system_error", message, runner });

  if (!parsed.buildBegun) {
    if (proc.timedOut) return { kind: "timeout", runner, durationMs };
    return systemError(`grading environment did not start (exit ${proc.exitCode}). ${tail(proc.stderr || proc.stdout)}`);
  }
  if (parsed.buildExit === null) {
    if (diagnostics.some((d) => d.severity === "error")) return compileFailure(diagnostics, layout, runner, durationMs);
    if (proc.timedOut) return { kind: "timeout", runner, durationMs };
    if (proc.truncated) return systemError("compiler output exceeded the size limit");
    return systemError(`grading environment exited during compilation (exit ${proc.exitCode}). ${tail(proc.stderr)}`);
  }
  if (parsed.buildExit !== 0) {
    if (diagnostics.some((d) => d.severity === "error")) return compileFailure(diagnostics, layout, runner, durationMs);
    return systemError(`gleam build failed: ${tail(parsed.buildLog || proc.stderr)}`);
  }

  const harnessError = parsed.events.find((e) => e.type === "harness_error");
  if (harnessError) return systemError(`grading harness error: ${String(harnessError.message ?? "")}`);
  const hello = parsed.events.find((e) => e.type === "hello");
  if (!hello) {
    if (proc.timedOut) return { kind: "timeout", runner, durationMs };
    return systemError(`test harness did not start (exit ${proc.exitCode}). ${tail(proc.stderr)}`);
  }
  const done = parsed.events.some((e) => e.type === "done");
  if (!done && proc.timedOut) return { kind: "timeout", runner, durationMs };

  const reported = new Map<string, RawTestResult>();
  for (const e of parsed.events) {
    if (e.type !== "test" || typeof e.name !== "string") continue;
    const status = TEST_STATUSES.includes(e.status as TestStatus) ? (e.status as TestStatus) : "error";
    const failure = parseFailure(e.failure);
    const output = typeof e.output === "string" && e.output !== "" ? e.output : undefined;
    const detail: RawTestDetail = {
      functionName: shortName(e.name),
      status,
      // Older harness images sent a pre-rendered (Korean) message instead of `failure`.
      ...(typeof e.message === "string" ? { message: e.message } : {}),
      ...(typeof e.durationMs === "number" ? { durationMs: e.durationMs } : {}),
      ...(failure ? { failure } : {}),
      ...(output !== undefined ? { output, ...(e.outputTruncated === true ? { outputTruncated: true } : {}) } : {}),
    };
    reported.set(e.name, withMessage(detail));
  }
  const missing: TestFailure = { kind: done ? "not_reported" : "aborted" };
  const tests: RawTestResult[] = layout.harness.tests.map(
    (name) => reported.get(name) ?? withMessage({ functionName: shortName(name), status: "error", failure: missing }),
  );
  const performance: PerfMeasurement[] = [];
  for (const e of parsed.events) {
    if (e.type !== "perf" || typeof e.size !== "number") continue;
    const status = PERF_STATUSES.includes(e.status as PerfMeasurement["status"])
      ? (e.status as PerfMeasurement["status"])
      : "error";
    performance.push({ size: e.size, cost: typeof e.cost === "number" ? e.cost : 0, status });
  }
  const learnerWarnings = classifyDiagnostics(diagnostics, layout.learner).learner.filter((d) => d.severity === "warning");
  const info: RunnerInfo = typeof hello.otp === "string" && runner.runtimeVersion === "unknown"
    ? { ...runner, runtimeVersion: `OTP ${hello.otp}` }
    : runner;
  return { kind: "completed", compileDiagnostics: learnerWarnings, tests, performance, runner: info, durationMs };
}
