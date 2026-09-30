/**
 * Parses what entry.sh + the Erlang harness print. Only lines starting with "@@FP:<nonce>@@" are
 * trusted; the nonce is random per job and deleted before learner code runs, and learner stdout is
 * captured by the harness (it only ever appears inside a JSON string), so results cannot be forged.
 */
import type { Diagnostic, PerfMeasurement, RawTestResult, RunOutput, RunnerInfo, TestStatus } from "../contract/index.ts";
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
    message: `문제의 테스트/지원 코드가 컴파일되지 않습니다(콘텐츠 오류)${where}: ${first?.message ?? "알 수 없는 오류"}`,
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
    return systemError(`채점 환경을 시작하지 못했습니다 (exit ${proc.exitCode}). ${tail(proc.stderr || proc.stdout)}`);
  }
  if (parsed.buildExit === null) {
    if (diagnostics.some((d) => d.severity === "error")) return compileFailure(diagnostics, layout, runner, durationMs);
    if (proc.timedOut) return { kind: "timeout", runner, durationMs };
    if (proc.truncated) return systemError("컴파일 출력이 크기 제한을 넘었습니다.");
    return systemError(`컴파일 도중 채점 환경이 종료되었습니다 (exit ${proc.exitCode}). ${tail(proc.stderr)}`);
  }
  if (parsed.buildExit !== 0) {
    if (diagnostics.some((d) => d.severity === "error")) return compileFailure(diagnostics, layout, runner, durationMs);
    return systemError(`gleam build가 실패했습니다: ${tail(parsed.buildLog || proc.stderr)}`);
  }

  const harnessError = parsed.events.find((e) => e.type === "harness_error");
  if (harnessError) return systemError(`채점 하네스 오류: ${String(harnessError.message ?? "")}`);
  const hello = parsed.events.find((e) => e.type === "hello");
  if (!hello) {
    if (proc.timedOut) return { kind: "timeout", runner, durationMs };
    return systemError(`테스트 하네스가 시작되지 않았습니다 (exit ${proc.exitCode}). ${tail(proc.stderr)}`);
  }
  const done = parsed.events.some((e) => e.type === "done");
  if (!done && proc.timedOut) return { kind: "timeout", runner, durationMs };

  const reported = new Map<string, RawTestResult>();
  for (const e of parsed.events) {
    if (e.type !== "test" || typeof e.name !== "string") continue;
    const status = TEST_STATUSES.includes(e.status as TestStatus) ? (e.status as TestStatus) : "error";
    reported.set(e.name, {
      functionName: shortName(e.name),
      status,
      ...(typeof e.message === "string" ? { message: e.message } : {}),
      ...(typeof e.durationMs === "number" ? { durationMs: e.durationMs } : {}),
    });
  }
  const aborted = done
    ? "테스트 결과가 보고되지 않았습니다."
    : "테스트 실행이 비정상적으로 중단되었습니다. 메모리를 지나치게 많이 쓰거나 VM을 종료시키는 코드가 있는지 확인하세요.";
  const tests: RawTestResult[] = layout.harness.tests.map(
    (name) => reported.get(name) ?? { functionName: shortName(name), status: "error", message: aborted },
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
