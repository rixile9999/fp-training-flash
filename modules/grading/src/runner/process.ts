/** Spawns a child with a wall-clock limit and an output cap; `kill` decides how the job is stopped. */
import { spawn } from "node:child_process";
import type { ProcessOutcome } from "./protocol.ts";

export interface SpawnSpec {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd?: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly stdin?: Buffer;
  readonly timeoutMs: number;
  readonly maxStdoutBytes: number;
  readonly maxStderrBytes: number;
  /** Start the child in its own process group (so `kill` can signal the whole group). */
  readonly detached?: boolean;
  /** Called on timeout/overflow; must make the child exit. Defaults to SIGKILL of the child. */
  readonly kill?: (pid: number | undefined) => void | Promise<void>;
}

export function runProcess(spec: SpawnSpec): Promise<ProcessOutcome> {
  const started = performance.now();
  return new Promise((resolve) => {
    const child = spawn(spec.command, [...spec.args], {
      cwd: spec.cwd,
      env: spec.env,
      detached: spec.detached ?? false,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const out: Buffer[] = [];
    const errOut: Buffer[] = [];
    let outBytes = 0;
    let errBytes = 0;
    let timedOut = false;
    let truncated = false;
    let killing = false;
    let settled = false;
    const stop = () => {
      if (killing) return;
      killing = true;
      const k = spec.kill ?? ((pid) => pid !== undefined && child.kill("SIGKILL"));
      Promise.resolve(k(child.pid)).catch(() => {
        child.kill("SIGKILL");
      });
    };
    const timer = setTimeout(() => {
      timedOut = true;
      stop();
    }, spec.timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => {
      if (truncated) return;
      const room = spec.maxStdoutBytes - outBytes;
      if (chunk.length > room) {
        out.push(chunk.subarray(0, Math.max(room, 0)));
        outBytes = spec.maxStdoutBytes;
        truncated = true;
        stop();
        return;
      }
      out.push(chunk);
      outBytes += chunk.length;
    });
    child.stderr.on("data", (chunk: Buffer) => {
      const room = spec.maxStderrBytes - errBytes;
      if (room <= 0) return;
      errOut.push(chunk.subarray(0, room));
      errBytes += Math.min(chunk.length, room);
    });
    const finish = (exitCode: number | null, extraErr = "") => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        stdout: Buffer.concat(out).toString("utf8"),
        stderr: Buffer.concat(errOut).toString("utf8") + extraErr,
        exitCode,
        timedOut,
        truncated,
        durationMs: Math.round(performance.now() - started),
      });
    };
    child.on("error", (e) => finish(null, `\n${e.message}`));
    child.on("close", (code) => finish(code));
    child.stdin.on("error", () => {});
    child.stdin.end(spec.stdin ?? Buffer.alloc(0));
  });
}
