/**
 * Production Gleam runner: one throwaway container per job (see runners/gleam/Dockerfile).
 * Job files travel to the container as a tar on stdin, so nothing is bind-mounted from the host.
 */
import type { CodeRunner, RunJob, RunOutput, RunnerInfo } from "../contract/index.ts";
import { runProcess } from "./process.ts";
import { layoutJob, newNonce, wallClockMs } from "./project.ts";
import { toRunOutput } from "./protocol.ts";
import { createTar } from "./tar.ts";

export interface DockerGleamRunnerOptions {
  /** Docker image tag built from runners/gleam/Dockerfile, e.g. "fp-gleam-runner:1.18.1". */
  readonly image: string;
  /** CPU quota per job (default 1). */
  readonly cpus?: number;
  /** docker CLI binary (default "docker"). */
  readonly dockerBin?: string;
  /** Container memory on top of the job's memoryMb, for the compiler and the tmpfs (default 512). */
  readonly overheadMemoryMb?: number;
  /** Wall-clock budget for `gleam build` inside the container (default 60 s). */
  readonly compileBudgetMs?: number;
  /** Overrides the computed wall-clock kill limit of a whole job (tests). */
  readonly wallClockMs?: number;
}

/** Fixed uid/gid of the image's unprivileged "runner" user. */
const RUNNER_UID = 10001;
const MAX_STDOUT = 1024 * 1024;
const MAX_STDERR = 64 * 1024;
const DOCKER_EXIT_CODES = new Set([125, 126, 127]);

/** `docker run` arguments of one sandboxed job (exported for tests). */
export function dockerRunArgs(opts: DockerGleamRunnerOptions, name: string, memoryMb: number): string[] {
  const containerMb = memoryMb + (opts.overheadMemoryMb ?? 512);
  const owner = `uid=${RUNNER_UID},gid=${RUNNER_UID}`;
  return [
    "run",
    "--rm",
    "-i",
    "--name",
    name,
    "--network",
    "none",
    "--read-only",
    "--tmpfs",
    `/work:rw,nosuid,nodev,noexec,size=256m,mode=0700,${owner}`,
    "--tmpfs",
    "/tmp:rw,nosuid,nodev,noexec,size=16m,mode=1777",
    "--user",
    `${RUNNER_UID}:${RUNNER_UID}`,
    "--memory",
    `${containerMb}m`,
    "--memory-swap",
    `${containerMb}m`,
    "--pids-limit",
    "128",
    "--cpus",
    String(opts.cpus ?? 1),
    "--security-opt",
    "no-new-privileges",
    "--cap-drop",
    "ALL",
    "--ulimit",
    "nofile=512:512",
    "--ulimit",
    "core=0",
    "--label",
    "fp.grading=job",
    opts.image,
  ];
}

export function createDockerGleamRunner(opts: DockerGleamRunnerOptions): CodeRunner {
  const docker = opts.dockerBin ?? "docker";
  let cachedInfo: Promise<RunnerInfo> | null = null;
  const unknownInfo: RunnerInfo = { runner: "docker", image: opts.image, languageVersion: "unknown", runtimeVersion: "unknown" };

  const removeContainer = async (name: string): Promise<void> => {
    await runProcess({
      command: docker,
      args: ["rm", "-f", name],
      timeoutMs: 30_000,
      maxStdoutBytes: 4096,
      maxStderrBytes: 4096,
    });
  };

  const loadInfo = async (): Promise<RunnerInfo> => {
    const proc = await runProcess({
      command: docker,
      args: ["run", "--rm", "--network", "none", "--read-only", "--cap-drop", "ALL", opts.image, "--info"],
      timeoutMs: 60_000,
      maxStdoutBytes: 4096,
      maxStderrBytes: 4096,
    });
    if (proc.exitCode !== 0) throw new Error(`docker runner info failed: ${proc.stderr.trim()}`);
    const v = JSON.parse(proc.stdout.trim()) as { gleam?: string; otp?: string };
    return {
      runner: "docker",
      image: opts.image,
      languageVersion: v.gleam ?? "unknown",
      runtimeVersion: v.otp ? `OTP ${v.otp}` : "unknown",
    };
  };

  const info = (): Promise<RunnerInfo> => {
    if (!cachedInfo) {
      cachedInfo = loadInfo().catch((e: unknown) => {
        cachedInfo = null; // retry next time
        throw e;
      });
    }
    return cachedInfo;
  };

  return {
    language: "gleam",
    info: () => info().catch(() => unknownInfo),
    async run(job: RunJob): Promise<RunOutput> {
      let runner: RunnerInfo;
      try {
        runner = await info();
      } catch (e) {
        return { kind: "system_error", message: `Docker 채점 환경을 사용할 수 없습니다: ${String(e)}`, runner: unknownInfo };
      }
      if (job.language !== "gleam") return { kind: "system_error", message: `지원하지 않는 언어: ${job.language}`, runner };
      const nonce = newNonce();
      const layout = layoutJob(job, nonce);
      if (!layout.ok) return { kind: "system_error", message: layout.message, runner };
      const name = `fp-gleam-${nonce.slice(0, 16)}`;
      // Job files are newer than the pre-compiled template build, so gleam compiles exactly them.
      const tar = createTar(layout.files, Math.floor(Date.now() / 1000));
      try {
        const proc = await runProcess({
          command: docker,
          args: dockerRunArgs(opts, name, layout.harness.memoryMb),
          stdin: tar,
          timeoutMs: opts.wallClockMs ?? wallClockMs(layout.harness, opts.compileBudgetMs ?? 60_000),
          maxStdoutBytes: MAX_STDOUT,
          maxStderrBytes: MAX_STDERR,
          // Killing the docker client does not stop the container; remove it (kills it) first.
          kill: async (pid) => {
            await removeContainer(name);
            if (pid !== undefined) process.kill(pid, "SIGKILL");
          },
        });
        if (proc.exitCode !== null && DOCKER_EXIT_CODES.has(proc.exitCode) && !proc.stdout.includes(`@@FP:${nonce}@@`)) {
          return { kind: "system_error", message: `docker run 실패 (exit ${proc.exitCode}): ${proc.stderr.trim().slice(0, 1000)}`, runner };
        }
        return toRunOutput(proc, nonce, layout, runner, "/work/project");
      } finally {
        // --rm covers normal exits; this covers kills and client crashes. Never leave containers behind.
        await removeContainer(name).catch(() => {});
      }
    },
  };
}
