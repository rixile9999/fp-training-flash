/** Integration: the development runner with the locally installed gleam + Erlang/OTP. */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { asId, InMemoryEventBus, runMigrations, silentLogger } from "@fp/kernel";
import type { UserId } from "@fp/kernel";
import { createFixedClock, createTestDb } from "@fp/kernel/testing";
import { createGradingModule, createLocalGleamRunner, GLEAM_TEMPLATE_DIR, migrations } from "../src/index.ts";
import { buildRunJob } from "../src/grading/run-job.ts";
import { couponSpec, EXERCISE_ID, fakeCatalog, fixture, NO_HELP } from "./helpers.ts";
import { RUN_TIMEOUT, sharedRunnerScenarios } from "./runner-scenarios.ts";

const hasGleam = spawnSync("gleam", ["--version"]).status === 0;
if (!hasGleam) console.warn("[grading] local runner tests skipped: `gleam` is not on PATH");

describe.skipIf(!hasGleam)("local gleam runner", () => {
  const workRoot = mkdtempSync(join(tmpdir(), "fp-grading-local-test-"));
  const runner = createLocalGleamRunner({ templateDir: GLEAM_TEMPLATE_DIR, workRoot, logger: silentLogger });

  afterAll(() => {
    rmSync(workRoot, { recursive: true, force: true });
  });

  it("reports versions", { timeout: RUN_TIMEOUT }, async () => {
    const info = await runner.info();
    expect(info).toMatchObject({ runner: "local", languageVersion: "1.18.1" });
    expect(info.runtimeVersion).toMatch(/^OTP \d+/);
  });

  sharedRunnerScenarios(() => runner);

  it("end to end: submit through the service with the real runner", { timeout: RUN_TIMEOUT }, async () => {
    const db = await createTestDb();
    try {
      await runMigrations(db, "grading", migrations);
      const events = new InMemoryEventBus(silentLogger);
      const service = createGradingModule({
        db,
        clock: createFixedClock(),
        events,
        logger: silentLogger,
        catalog: fakeCatalog([couponSpec()]),
        runner,
      }).service;
      const req = { userId: asId<UserId>("u"), exerciseId: EXERCISE_ID, helpUsed: NO_HELP };
      const pass = await service.submit({ ...req, code: fixture("reference.gleam"), idempotencyKey: "a" });
      expect(pass.ok && pass.value.evaluation?.outcome).toBe("passed");
      expect(pass.ok && pass.value.evaluation?.runner?.runner).toBe("local");
      const ext = await service.submit({ ...req, code: fixture("external.gleam"), idempotencyKey: "b" });
      expect(ext.ok && ext.value.evaluation?.outcome).toBe("rejected");
      const trial = await service.trialRun({ exerciseId: EXERCISE_ID, code: fixture("wrong-filter-drops.gleam") });
      expect(trial.ok && trial.value.tests.map((t) => [t.id, t.status])).toEqual([
        ["T1", "passed"],
        ["T2", "passed"],
        ["T3", "failed"],
      ]);
    } finally {
      await db.close();
    }
  });

  it("kills the process group when the wall-clock limit fires", { timeout: RUN_TIMEOUT }, async () => {
    const killer = createLocalGleamRunner({ templateDir: GLEAM_TEMPLATE_DIR, workRoot, logger: silentLogger, wallClockMs: 4000 });
    const spec = couponSpec({ limits: { timeMs: 60_000, memoryMb: 128 } });
    const started = performance.now();
    const out = await killer.run(buildRunJob(spec, [{ path: "src/coupon.gleam", content: fixture("infinite-loop.gleam") }], true));
    expect(out.kind).toBe("timeout");
    expect(performance.now() - started).toBeLessThan(20_000);
  });

  it("leaves no job directories behind", () => {
    expect(readdirSync(workRoot).filter((d) => d.startsWith("fp-gleam-job-"))).toEqual([]);
  });
});
