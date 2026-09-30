/**
 * Project layout shared by the Docker and local Gleam runners: which files a job writes into the
 * template project and the harness job description (.fp/job.json, .fp/nonce).
 */
import { randomBytes } from "node:crypto";
import type { FileContent } from "@fp/content/contract";
import type { RunJob } from "../contract/index.ts";
import { moduleNameFromPath, publicNames } from "../gleam/source.ts";

export interface ProjectFile {
  /** Relative to the project root, e.g. "src/coupon.gleam". */
  readonly path: string;
  readonly content: string;
}

/** Everything the harness needs, written to .fp/job.json (deleted by the harness before learner code runs). */
export interface HarnessJob {
  readonly tests: readonly string[];
  readonly timeMs: number;
  readonly memoryMb: number;
  readonly perf: { readonly module: string; readonly sizes: readonly number[] } | null;
}

const SAFE_PATH = /^(src|test)\/[A-Za-z0-9_]+(\/[A-Za-z0-9_]+)*\.(gleam|erl|hrl)$/;
const QUALIFIED_TEST = /^[a-z][a-z0-9_]*(\/[a-z][a-z0-9_]*)*\.[a-z][a-z0-9_]*$/;
const MODULE = /^[a-z][a-z0-9_]*(\/[a-z][a-z0-9_]*)*$/;

/** Grader-owned paths that job files must never overwrite. */
const RESERVED = [/^src\/fp_internal(\/|\.|_)/, /^src\/fp_runner(\/|\.)/];

export function newNonce(): string {
  return randomBytes(16).toString("hex");
}

/** "support.gleam" -> "src/support.gleam"; keeps an explicit "src/" or "test/" prefix. */
export function placeFile(file: FileContent, dir: "src" | "test"): ProjectFile {
  const path = file.path.replace(/^\.\//, "");
  const placed = path.startsWith(`${dir}/`) ? path : `${dir}/${path.replace(/^(src|test|support)\//, "")}`;
  return { path: placed, content: file.content };
}

/** What the learner owns, used to attribute compile errors (learner mistake vs. content bug). */
export interface LearnerInfo {
  readonly paths: readonly string[];
  readonly modules: readonly string[];
  /** Public functions, constants, types and constructors defined by the learner files. */
  readonly names: readonly string[];
}

export interface JobLayout {
  readonly files: readonly ProjectFile[];
  readonly harness: HarnessJob;
  readonly learner: LearnerInfo;
}

export type LayoutResult = ({ ok: true } & JobLayout) | { ok: false; message: string };

/** Validates a job and maps it to project files. Invalid jobs are grader/content bugs (system_error). */
export function layoutJob(job: RunJob, nonce: string): LayoutResult {
  const learnerFiles = job.sourceFiles.map((f) => placeFile(f, "src"));
  const files = [
    ...learnerFiles,
    ...job.supportFiles.map((f) => placeFile(f, "src")),
    ...job.testFiles.map((f) => placeFile(f, "test")),
  ];
  const seen = new Set<string>();
  for (const f of files) {
    if (!SAFE_PATH.test(f.path) || f.path.length > 100) return { ok: false, message: `허용되지 않는 파일 경로: ${f.path}` };
    if (RESERVED.some((r) => r.test(f.path))) return { ok: false, message: `채점기 내부 경로와 겹칩니다: ${f.path}` };
    if (seen.has(f.path)) return { ok: false, message: `파일 경로가 중복됩니다: ${f.path}` };
    seen.add(f.path);
  }
  for (const f of job.sourceFiles) {
    if (!f.path.endsWith(".gleam")) return { ok: false, message: `학습자 파일은 .gleam이어야 합니다: ${f.path}` };
  }
  for (const t of job.testFunctions) {
    if (!QUALIFIED_TEST.test(t)) return { ok: false, message: `잘못된 테스트 이름: ${t}` };
  }
  if (job.performance && !MODULE.test(job.performance.perfModule)) {
    return { ok: false, message: `잘못된 성능 측정 모듈: ${job.performance.perfModule}` };
  }
  const timeMs = Math.max(100, Math.floor(job.limits.timeMs));
  const memoryMb = Math.max(16, Math.floor(job.limits.memoryMb));
  const harness: HarnessJob = {
    tests: [...job.testFunctions],
    timeMs,
    memoryMb,
    perf: job.performance
      ? { module: job.performance.perfModule, sizes: job.performance.sizes.map((s) => Math.floor(s)) }
      : null,
  };
  const learner: LearnerInfo = {
    paths: learnerFiles.map((f) => f.path),
    modules: learnerFiles.map((f) => moduleNameFromPath(f.path)),
    names: learnerFiles.flatMap((f) => publicNames(f.content)),
  };
  return {
    ok: true,
    harness,
    learner,
    files: [
      ...files,
      { path: ".fp/nonce", content: nonce },
      { path: ".fp/job.json", content: JSON.stringify(harness) },
    ],
  };
}

/** Wall-clock budget for the whole job: compile + tests + one timeMs per perf size + startup slack. */
export function wallClockMs(harness: HarnessJob, compileBudgetMs: number): number {
  const perf = harness.perf ? harness.perf.sizes.length * harness.timeMs : 0;
  return compileBudgetMs + harness.timeMs + perf + 5_000;
}
