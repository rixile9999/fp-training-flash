/**
 * Integration: the production Docker sandbox. Builds the image first (layer cache makes this fast).
 * Set FP_SKIP_DOCKER_TESTS=1 to skip on machines without Docker.
 */
import { spawnSync } from "node:child_process";
import { beforeAll, describe, expect, it } from "vitest";
import { buildRunJob } from "../src/grading/run-job.ts";
import { createDockerGleamRunner, DEFAULT_GLEAM_IMAGE, GLEAM_RUNNER_DIR } from "../src/index.ts";
import { couponSpec, couponTestFile, fixture } from "./helpers.ts";
import { RUN_TIMEOUT, sharedRunnerScenarios } from "./runner-scenarios.ts";

const skip = process.env.FP_SKIP_DOCKER_TESTS === "1";
if (skip) console.warn("[grading] Docker runner tests skipped (FP_SKIP_DOCKER_TESTS=1)");
const image = process.env.FP_GLEAM_IMAGE ?? DEFAULT_GLEAM_IMAGE;

const leftoverContainers = (): string[] =>
  spawnSync("docker", ["ps", "-aq", "--filter", "label=fp.grading=job"], { encoding: "utf8" }).stdout.trim().split("\n").filter(Boolean);

describe.skipIf(skip)("docker gleam runner", () => {
  const runner = createDockerGleamRunner({ image });

  beforeAll(() => {
    const ping = spawnSync("docker", ["info", "--format", "{{.ServerVersion}}"], { encoding: "utf8" });
    if (ping.status !== 0) throw new Error("Docker is not available. Start Docker or set FP_SKIP_DOCKER_TESTS=1 to skip these tests.");
    const build = spawnSync("sh", [`${GLEAM_RUNNER_DIR}/build-image.sh`, image], { encoding: "utf8", timeout: 590_000 });
    if (build.status !== 0) throw new Error(`building ${image} failed:\n${build.stderr || build.stdout}`);
  }, 600_000);

  it("reports versions", { timeout: RUN_TIMEOUT }, async () => {
    expect(await runner.info()).toEqual({ runner: "docker", image, languageVersion: "1.18.1", runtimeVersion: "OTP 29" });
  });

  sharedRunnerScenarios(() => runner);

  it("the sandbox blocks /etc/passwd, network, writes outside /work and root", { timeout: RUN_TIMEOUT }, async () => {
    const spec = couponSpec({
      testFiles: [
        couponTestFile,
        { path: "test/sandbox_test.gleam", content: fixture("sandbox_test.gleam") },
        { path: "test/sandbox_ffi.erl", content: fixture("sandbox_ffi.erl") },
      ],
    });
    const job = {
      ...buildRunJob(spec, [{ path: "src/coupon.gleam", content: fixture("reference.gleam") }], true),
      testFunctions: ["read_passwd_test", "network_test", "write_outside_test", "root_user_test"].map((t) => `sandbox_test.${t}`),
    };
    const out = await runner.run(job);
    expect(out.kind, JSON.stringify(out)).toBe("completed");
    if (out.kind !== "completed") return;
    const byName = Object.fromEntries(out.tests.map((t) => [t.functionName, t]));
    for (const t of out.tests) expect(t.status, `${t.functionName}: ${t.message}`).toBe("failed");
    expect(byName.read_passwd_test?.message).toContain("eacces");
    expect(byName.network_test?.message).toMatch(/enetunreach|ehostunreach|econnrefused|timeout/);
    expect(byName.write_outside_test?.message).toMatch(/erofs|eacces/);
    expect(byName.root_user_test?.message).toContain('"10001"');
  });

  it("an unavailable image is a system error, not a learning failure", { timeout: RUN_TIMEOUT }, async () => {
    const broken = createDockerGleamRunner({ image: "fp-gleam-runner:does-not-exist" });
    const out = await broken.run(buildRunJob(couponSpec(), [{ path: "src/coupon.gleam", content: fixture("reference.gleam") }], true));
    expect(out.kind).toBe("system_error");
  });

  it("kills and removes the container when the wall-clock limit fires", { timeout: RUN_TIMEOUT }, async () => {
    const killer = createDockerGleamRunner({ image, wallClockMs: 6000 });
    const spec = couponSpec({ limits: { timeMs: 60_000, memoryMb: 128 } });
    const started = performance.now();
    const out = await killer.run(buildRunJob(spec, [{ path: "src/coupon.gleam", content: fixture("infinite-loop.gleam") }], true));
    expect(out.kind).toBe("timeout");
    expect(performance.now() - started).toBeLessThan(30_000);
    expect(leftoverContainers()).toEqual([]);
  });

  it("leaves no containers behind", () => {
    expect(leftoverContainers()).toEqual([]);
  });
});
