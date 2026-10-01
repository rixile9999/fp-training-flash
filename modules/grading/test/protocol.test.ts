import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildRunJob } from "../src/grading/run-job.ts";
import { layoutJob, type JobLayout } from "../src/runner/project.ts";
import { classifyDiagnostics, parseGleamDiagnostics, parseStdout, toRunOutput, type ProcessOutcome } from "../src/runner/protocol.ts";
import { createTar } from "../src/runner/tar.ts";
import { dockerRunArgs } from "../src/runner/docker.ts";
import { couponSpec, FAKE_INFO, fixture } from "./helpers.ts";

const NONCE = "0123456789abcdef";
const M = `@@FP:${NONCE}@@`;
const spec = couponSpec();
const job = buildRunJob(spec, [{ path: "src/coupon.gleam", content: fixture("reference.gleam") }], true);
const layout = layoutJob(job, NONCE) as { ok: true } & JobLayout;

const proc = (stdout: string, extra: Partial<ProcessOutcome> = {}): ProcessOutcome => ({
  stdout,
  stderr: "",
  exitCode: 0,
  timedOut: false,
  truncated: false,
  durationMs: 100,
  ...extra,
});
const ev = (o: object) => `\n${M}${JSON.stringify(o)}\n`;
const built = `${ev({ type: "build_begin" })}  Compiling fp_runner\n${ev({ type: "build_end", exitCode: 0 })}${ev({ type: "hello", otp: "29" })}`;

const ROOT = "/work/project";
const TEST_FILE_ERROR = `error: Type mismatch
  ┌─ ${ROOT}/test/coupon_test.gleam:5:20
  │
5 │   apply_coupon([], 10)
  │                    ^^

Expected type:

    Float
`;
const LEARNER_ERROR = `  Compiling fp_runner
warning: Unused variable
  ┌─ ${ROOT}/src/coupon.gleam:3:7
  │
3 │   let x = 1
  │       ^

error: Unknown variable
  ┌─ ${ROOT}/src/coupon.gleam:9:3
  │
9 │   nope
  │   ^^^^
`;
const SUPPORT_ERROR = `error: Unknown module value
  ┌─ ${ROOT}/test/fixtures_helper.gleam:2:19
  │
2 │ pub fn x() { list.nope() }
  │                   ^^^^

The module \`gleam/list\` does not have a \`nope\` value.
`;

describe("layoutJob", () => {
  it("places files and writes the harness job", () => {
    expect(layout.ok).toBe(true);
    expect(layout.files.map((f) => f.path)).toEqual(["src/coupon.gleam", "test/coupon_test.gleam", ".fp/nonce", ".fp/job.json"]);
    expect(JSON.parse(layout.files[3]!.content)).toMatchObject({ tests: job.testFunctions, timeMs: 10000, memoryMb: 256, perf: null });
    expect(layout.learner.modules).toEqual(["coupon"]);
    expect(layout.learner.names).toContain("apply_coupon");
  });

  it("rejects path traversal, reserved harness paths and bad test names", () => {
    const bad = (patch: object) => layoutJob({ ...job, ...patch }, NONCE).ok;
    expect(bad({ sourceFiles: [{ path: "../etc/x.gleam", content: "" }] })).toBe(false);
    expect(bad({ supportFiles: [{ path: "src/fp_internal/harness.gleam", content: "" }] })).toBe(false);
    expect(bad({ supportFiles: [{ path: "fp_internal_harness_ffi.erl", content: "" }] })).toBe(false);
    expect(bad({ testFunctions: ["coupon_test.x'); os:cmd(\"id"] })).toBe(false);
    expect(bad({ sourceFiles: [{ path: "src/coupon.gleam", content: "" }, { path: "coupon.gleam", content: "" }] })).toBe(false);
  });
});

describe("parseStdout / toRunOutput", () => {
  it("only trusts lines with this job's nonce", () => {
    const forged = `@@FP:ffffffffffffffff@@${JSON.stringify({ type: "test", name: "coupon_test.rounds_down_test", status: "passed" })}`;
    const out = toRunOutput(proc(`${built}${forged}\n  ${M}{"type":"test"}\n${ev({ type: "done" })}`), NONCE, layout, FAKE_INFO, ROOT);
    expect(out.kind).toBe("completed");
    if (out.kind !== "completed") return;
    // Nothing trusted was reported, so every requested test is an error.
    expect(out.tests.map((t) => t.status)).toEqual(["error", "error", "error", "error", "error"]);
  });

  it("maps harness events to raw results and perf measurements", () => {
    const stdout =
      built +
      job.testFunctions.map((t, i) => ev({ type: "test", name: t, status: i === 2 ? "failed" : "passed", message: i === 2 ? "기대값" : undefined, durationMs: 1 })).join("") +
      ev({ type: "perf", size: 10, cost: 123, status: "ok" }) +
      ev({ type: "done" });
    const out = toRunOutput(proc(stdout), NONCE, layout, FAKE_INFO, ROOT);
    expect(out.kind).toBe("completed");
    if (out.kind !== "completed") return;
    expect(out.tests[2]).toEqual({ functionName: "keeps_other_orders_test", status: "failed", message: "기대값", durationMs: 1 });
    expect(out.performance).toEqual([{ size: 10, cost: 123, status: "ok" }]);
  });

  it("keeps structured failures and output, and fills message with the Korean rendering", () => {
    const stdout =
      built +
      ev({
        type: "test",
        name: job.testFunctions[2],
        status: "failed",
        durationMs: 3,
        failure: { kind: "should_equal", expected: "[1]", actual: "[]", location: { file: "test/coupon_test.gleam", line: 16 } },
        output: "debug",
        outputTruncated: false,
      }) +
      ev({ type: "done" });
    const out = toRunOutput(proc(stdout), NONCE, layout, FAKE_INFO, ROOT);
    if (out.kind !== "completed") throw new Error(out.kind);
    expect(out.tests[2]).toEqual({
      functionName: "keeps_other_orders_test",
      status: "failed",
      durationMs: 3,
      failure: { kind: "should_equal", expected: "[1]", actual: "[]", location: { file: "test/coupon_test.gleam", line: 16 } },
      output: "debug",
      message: "값이 기대와 다릅니다.\n  기대값: [1]\n  실제값: [] (test/coupon_test.gleam:16)\n\n출력:\ndebug",
    });
    // Unreported tests get a structured failure too (rendered per locale later).
    expect(out.tests[0]).toMatchObject({ status: "error", failure: { kind: "not_reported" }, message: "테스트 결과가 보고되지 않았습니다." });
  });

  it("reports missing results after a crash as errors, and a wall-clock kill as timeout", () => {
    const crashed = toRunOutput(proc(built + ev({ type: "test", name: job.testFunctions[0], status: "passed" }), { exitCode: 137 }), NONCE, layout, FAKE_INFO, ROOT);
    expect(crashed.kind === "completed" && crashed.tests.map((t) => t.status)).toEqual(["passed", "error", "error", "error", "error"]);
    expect(crashed.kind === "completed" && crashed.tests[1]).toMatchObject({ failure: { kind: "aborted" } });
    expect(toRunOutput(proc(built, { timedOut: true, exitCode: null }), NONCE, layout, FAKE_INFO, ROOT).kind).toBe("timeout");
    expect(toRunOutput(proc("", { exitCode: 1, stderr: "no image" }), NONCE, layout, FAKE_INFO, ROOT).kind).toBe("system_error");
  });

  it("learner compile errors -> compile_error with project-relative locations", () => {
    const stdout = `${ev({ type: "build_begin" })}${LEARNER_ERROR}${ev({ type: "build_end", exitCode: 1 })}`;
    const out = toRunOutput(proc(stdout), NONCE, layout, FAKE_INFO, ROOT);
    expect(out.kind).toBe("compile_error");
    if (out.kind !== "compile_error") return;
    expect(out.compileDiagnostics.map((d) => [d.severity, d.file, d.line, d.column])).toEqual([
      ["warning", "src/coupon.gleam", 3, 7],
      ["error", "src/coupon.gleam", 9, 3],
    ]);
    expect(out.compileDiagnostics[1]?.message).toMatch(/^Unknown variable\n/);
    expect(out.compileDiagnostics[1]?.message).not.toContain(ROOT);
  });

  it("test-file errors caused by the learner's API -> compile_error; other content errors -> system_error", () => {
    const mismatch = toRunOutput(proc(`${ev({ type: "build_begin" })}${TEST_FILE_ERROR}${ev({ type: "build_end", exitCode: 1 })}`), NONCE, layout, FAKE_INFO, ROOT);
    expect(mismatch.kind).toBe("compile_error");
    const content = toRunOutput(proc(`${ev({ type: "build_begin" })}${SUPPORT_ERROR}${ev({ type: "build_end", exitCode: 1 })}`), NONCE, layout, FAKE_INFO, ROOT);
    expect(content.kind).toBe("system_error");
    expect(content.kind === "system_error" && content.message).toContain("test/fixtures_helper.gleam:2");
  });

  it("parses diagnostics without a location and classifies them as the learner's", () => {
    const d = parseGleamDiagnostics("error: Invalid module name\n\nsomething odd\n", ROOT);
    expect(d).toEqual([{ severity: "error", message: "Invalid module name\nsomething odd" }]);
    expect(classifyDiagnostics(d, layout.learner).learner).toHaveLength(1);
  });

  it("ignores compiler output outside the build markers", () => {
    const p = parseStdout(`error: fake\n${ev({ type: "build_begin" })}ok\n${ev({ type: "build_end", exitCode: 0 })}error: late\n`, NONCE);
    expect(p.buildLog.trim()).toBe("ok");
  });
});

describe("createTar", () => {
  it("produces an archive that tar can extract", () => {
    const dir = mkdtempSync(join(tmpdir(), "fp-tar-test-"));
    try {
      const archive = join(dir, "job.tar");
      writeFileSync(archive, createTar(layout.files, 1_700_000_000));
      const listing = execFileSync("tar", ["-tf", archive], { encoding: "utf8" }).trim().split("\n");
      expect(listing).toEqual(expect.arrayContaining(["src/", "src/coupon.gleam", "test/coupon_test.gleam", ".fp/nonce", ".fp/job.json"]));
      execFileSync("tar", ["-xf", archive, "-C", dir]);
      expect(execFileSync("cat", [join(dir, "src/coupon.gleam")], { encoding: "utf8" })).toBe(fixture("reference.gleam"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("dockerRunArgs", () => {
  it("applies every sandbox flag", () => {
    const args = dockerRunArgs({ image: "img:1" }, "fp-gleam-x", 256).join(" ");
    for (const flag of [
      "--network none",
      "--read-only",
      "--user 10001:10001",
      "--memory 768m",
      "--memory-swap 768m",
      "--pids-limit 128",
      "--cpus 1",
      "--security-opt no-new-privileges",
      "--cap-drop ALL",
      "--rm",
    ]) {
      expect(args).toContain(flag);
    }
    expect(args).toMatch(/--tmpfs \/work:rw,nosuid,nodev,noexec/);
    expect(args.endsWith("img:1")).toBe(true);
  });
});
