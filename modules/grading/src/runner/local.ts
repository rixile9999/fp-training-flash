/**
 * DEVELOPMENT ONLY. Runs learner code with the local `gleam` and `erl` as the current OS user,
 * without any sandbox (no network, filesystem or memory isolation beyond the BEAM heap limit).
 */
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Logger } from "@fp/kernel";
import type { CodeRunner, RunJob, RunOutput, RunnerInfo } from "../contract/index.ts";
import { runProcess } from "./process.ts";
import { layoutJob, newNonce, wallClockMs } from "./project.ts";
import { toRunOutput } from "./protocol.ts";

export interface LocalGleamRunnerOptions {
  /** Directory with the template project (runners/gleam/template). Its build/ dir is used as the dependency cache. */
  readonly templateDir: string;
  /** Where per-job temp dirs are created (default: OS temp dir). */
  readonly workRoot?: string;
  readonly gleamBin?: string;
  /** Wall-clock budget for `gleam build` (default 120 s). */
  readonly compileBudgetMs?: number;
  /** Overrides the computed wall-clock kill limit of a whole job (tests). */
  readonly wallClockMs?: number;
  readonly logger?: Logger;
}

/** runners/gleam in this package. */
export const GLEAM_RUNNER_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../runners/gleam");
export const GLEAM_TEMPLATE_DIR = join(GLEAM_RUNNER_DIR, "template");
const ENTRY = join(GLEAM_RUNNER_DIR, "entry.sh");

const MAX_STDOUT = 1024 * 1024;
const MAX_STDERR = 64 * 1024;

const killGroup = (pid: number | undefined): void => {
  if (pid === undefined) return;
  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    // group already gone
  }
};

export function createLocalGleamRunner(opts: LocalGleamRunnerOptions): CodeRunner {
  const gleam = opts.gleamBin ?? "gleam";
  const templateDir = resolve(opts.templateDir);
  const workRoot = opts.workRoot ?? tmpdir();
  let warned = false;
  let prepared: Promise<void> | null = null;
  let cachedInfo: Promise<RunnerInfo> | null = null;
  const env = { ...process.env, ERL_CRASH_DUMP_BYTES: "0" };

  /** Downloads and compiles the template's dependencies once; later jobs copy the build dir. */
  const prepare = (): Promise<void> => {
    prepared ??= (async () => {
      const proc = await runProcess({
        command: gleam,
        args: ["build", "--target", "erlang"],
        cwd: templateDir,
        env,
        timeoutMs: 10 * 60_000,
        maxStdoutBytes: MAX_STDOUT,
        maxStderrBytes: MAX_STDERR,
        detached: true,
        kill: killGroup,
      });
      if (proc.exitCode !== 0) throw new Error(`template build failed: ${(proc.stderr || proc.stdout).trim().slice(-2000)}`);
    })().catch((e: unknown) => {
      prepared = null;
      throw e;
    });
    return prepared;
  };

  const loadInfo = async (): Promise<RunnerInfo> => {
    const g = await runProcess({ command: gleam, args: ["--version"], env, timeoutMs: 30_000, maxStdoutBytes: 4096, maxStderrBytes: 4096 });
    const e = await runProcess({
      command: "erl",
      args: ["-noshell", "-eval", 'io:format("~s", [erlang:system_info(otp_release)]), halt().'],
      env,
      timeoutMs: 30_000,
      maxStdoutBytes: 4096,
      maxStderrBytes: 4096,
    });
    if (g.exitCode !== 0 || e.exitCode !== 0) throw new Error("gleam/erl not available");
    return {
      runner: "local",
      languageVersion: g.stdout.trim().replace(/^gleam\s+/, ""),
      runtimeVersion: `OTP ${e.stdout.trim()}`,
    };
  };
  const info = (): Promise<RunnerInfo> => {
    cachedInfo ??= loadInfo().catch((err: unknown) => {
      cachedInfo = null;
      throw err;
    });
    return cachedInfo;
  };
  const unknownInfo: RunnerInfo = { runner: "local", languageVersion: "unknown", runtimeVersion: "unknown" };

  return {
    language: "gleam",
    info: () => info().catch(() => unknownInfo),
    async run(job: RunJob): Promise<RunOutput> {
      if (!warned) {
        warned = true;
        const msg = "LocalGleamRunner is UNSANDBOXED: learner code runs as the current OS user. Development only.";
        if (opts.logger) opts.logger.warn(msg);
        else console.warn(`[grading] WARNING: ${msg}`);
      }
      let runner: RunnerInfo;
      try {
        runner = await info();
        await prepare();
      } catch (e) {
        return { kind: "system_error", message: `could not prepare the local Gleam environment: ${String(e)}`, runner: unknownInfo };
      }
      if (job.language !== "gleam") return { kind: "system_error", message: `unsupported language: ${job.language}`, runner };
      const nonce = newNonce();
      const layout = layoutJob(job, nonce);
      if (!layout.ok) return { kind: "system_error", message: layout.message, runner };
      if (!existsSync(workRoot)) await mkdir(workRoot, { recursive: true });
      const jobDir = await mkdtemp(join(workRoot, "fp-gleam-job-"));
      try {
        // preserveTimestamps keeps the dependency build cache valid, so only job files get compiled.
        await cp(templateDir, jobDir, { recursive: true, preserveTimestamps: true });
        for (const f of layout.files) {
          const target = join(jobDir, f.path);
          await mkdir(dirname(target), { recursive: true });
          await writeFile(target, f.content, { mode: 0o600 });
        }
        const proc = await runProcess({
          command: "sh",
          args: [ENTRY, jobDir],
          cwd: jobDir,
          env,
          timeoutMs: opts.wallClockMs ?? wallClockMs(layout.harness, opts.compileBudgetMs ?? 120_000),
          maxStdoutBytes: MAX_STDOUT,
          maxStderrBytes: MAX_STDERR,
          detached: true,
          kill: killGroup,
        });
        return toRunOutput(proc, nonce, layout, runner, jobDir);
      } finally {
        await rm(jobDir, { recursive: true, force: true });
      }
    },
  };
}
