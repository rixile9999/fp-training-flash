import { describe, expect, it } from "vitest";
import type { PerformanceSpec } from "@fp/content/contract";
import type { PerfMeasurement, RunOutput } from "../src/contract/index.ts";
import { interpretRunOutput, performanceResult, predictEvaluation } from "../src/grading/interpret.ts";
import { buildRunJob } from "../src/grading/run-job.ts";
import { normalizeAnswer } from "../src/grading/predict.ts";
import { completed, couponSpec, FAKE_INFO, fixture } from "./helpers.ts";

const AT = "2026-09-30T00:00:00.000Z";
const spec = couponSpec();
const job = buildRunJob(spec, [{ path: "src/coupon.gleam", content: fixture("reference.gleam") }], true);

describe("buildRunJob", () => {
  it("qualifies test functions by the test module that defines them", () => {
    expect(job.testFunctions).toEqual([
      "coupon_test.empty_list_test",
      "coupon_test.discounts_pending_test",
      "coupon_test.keeps_other_orders_test",
      "coupon_test.keeps_order_test",
      "coupon_test.rounds_down_test",
    ]);
    expect(job.limits).toEqual(spec.limits);
    expect(job.performance).toBeUndefined();
  });

  it("drops hidden tests and performance for trial runs", () => {
    const perf: PerformanceSpec = { sizes: [100], perfModule: "coupon_perf", maxCostRatio: 2, referenceCost: [] };
    const withPerf = couponSpec({ performance: perf });
    const trial = buildRunJob(withPerf, [], false);
    expect(trial.testFunctions).toHaveLength(3);
    expect(trial.performance).toBeUndefined();
    expect(buildRunJob(withPerf, [], true).performance).toEqual({ perfModule: "coupon_perf", sizes: [100] });
  });
});

describe("interpretRunOutput", () => {
  it("passes when every test passes", () => {
    const e = interpretRunOutput(spec, completed(job), AT);
    expect(e.outcome).toBe("passed");
    expect(e.correctness).toBe(true);
    expect(e.errorTags).toEqual([]);
    expect(e.requirements.map((r) => r.status)).toEqual(["met", "met", "met"]);
    expect(e.tests.every((t) => t.code === undefined)).toBe(true);
    expect(e.performance).toBeUndefined();
    expect(e.evaluatedAt).toBe(AT);
  });

  it("maps failures to spec metadata, error tags and unmet requirements; reveals failed test code only", () => {
    const e = interpretRunOutput(spec, completed(job, { keeps_other_orders_test: "failed", keeps_order_test: "failed" }), AT);
    expect(e.outcome).toBe("failed_tests");
    expect(e.correctness).toBe(false);
    expect(e.errorTags).toEqual(["drops_items_with_filter", "reorders_items"]);
    expect(e.requirements.map((r) => [r.id, r.status])).toEqual([
      ["R1", "met"],
      ["R2", "unmet"],
      ["R3", "unmet"],
    ]);
    const hidden = e.tests.find((t) => t.id === "T4")!;
    expect(hidden).toMatchObject({ name: "원래 순서를 유지한다", visibility: "hidden", status: "failed", errorTag: "reorders_items" });
    expect(hidden.code).toContain("pub fn keeps_order_test()");
    const passedHidden = e.tests.find((t) => t.id === "T5")!;
    expect(passedHidden.status).toBe("passed");
    expect(passedHidden.code).toBeUndefined();
    expect(passedHidden.errorTag).toBe("wrong_rounding");
  });

  it("marks requirements undetermined when their tests did not run (trial run)", () => {
    const trial = buildRunJob(spec, [], false);
    const e = interpretRunOutput(spec, completed(trial), AT);
    expect(e.requirements.map((r) => r.status)).toEqual(["met", "met", "undetermined"]);
  });

  it("a timed-out test makes the outcome timeout even with other failures", () => {
    const e = interpretRunOutput(spec, completed(job, { empty_list_test: "failed", rounds_down_test: "timeout" }), AT);
    expect(e.outcome).toBe("timeout");
    expect(e.correctness).toBe(false);
    expect(e.errorTags).toEqual(["wrong_rounding"]);
  });

  it("maps compile errors, whole-job timeouts and system errors", () => {
    const diag = { severity: "error", message: "Type mismatch", file: "src/coupon.gleam", line: 3, column: 5 } as const;
    const ce = interpretRunOutput(spec, { kind: "compile_error", compileDiagnostics: [diag], runner: FAKE_INFO, durationMs: 5 }, AT);
    expect(ce).toMatchObject({ outcome: "compile_error", correctness: false, compileDiagnostics: [diag], tests: [] });
    expect(ce.requirements.every((r) => r.status === "undetermined")).toBe(true);
    const to = interpretRunOutput(spec, { kind: "timeout", runner: FAKE_INFO, durationMs: 60_000 }, AT);
    expect(to).toMatchObject({ outcome: "timeout", correctness: false, errorTags: [] });
    const se = interpretRunOutput(spec, { kind: "system_error", message: "docker down" }, AT);
    expect(se).toMatchObject({ outcome: "system_error", correctness: false, errorTags: [], tests: [] });
  });

  describe("performance", () => {
    const perf: PerformanceSpec = { sizes: [100, 1000], perfModule: "coupon_perf", maxCostRatio: 3, referenceCost: [1000, 10_000] };
    const perfSpec = couponSpec({ performance: perf });
    const perfJob = buildRunJob(perfSpec, [], true);
    const withPerf = (costs: PerfMeasurement[]): RunOutput => ({ ...(completed(perfJob) as RunOutput & { kind: "completed" }), performance: costs });

    it("is ok within the allowed ratio at the largest size", () => {
      const e = interpretRunOutput(perfSpec, withPerf([{ size: 100, cost: 5000, status: "ok" }, { size: 1000, cost: 25_000, status: "ok" }]), AT);
      expect(e.outcome).toBe("passed");
      expect(e.performance).toMatchObject({ verdict: "ok", ratio: 2.5, referenceCost: [1000, 10_000] });
    });

    it("is too_slow beyond the ratio or on a perf timeout; correctness stays true", () => {
      const slow = interpretRunOutput(perfSpec, withPerf([{ size: 100, cost: 1000, status: "ok" }, { size: 1000, cost: 40_000, status: "ok" }]), AT);
      expect(slow).toMatchObject({ outcome: "too_slow", correctness: true, performance: { verdict: "too_slow", ratio: 4 } });
      const timeout = interpretRunOutput(perfSpec, withPerf([{ size: 100, cost: 1000, status: "ok" }, { size: 1000, cost: 0, status: "timeout" }]), AT);
      expect(timeout.outcome).toBe("too_slow");
    });

    it("is not_measured without reference costs or when tests failed", () => {
      expect(performanceResult({ ...perf, referenceCost: [] }, [{ size: 100, cost: 1, status: "ok" }]).verdict).toBe("not_measured");
      const failed = interpretRunOutput(perfSpec, completed(perfJob, { empty_list_test: "failed" }), AT);
      expect(failed.outcome).toBe("failed_tests");
      expect(failed.performance?.verdict).toBe("not_measured");
    });

    it("failed tests win over too_slow", () => {
      const out = { ...(completed(perfJob, { rounds_down_test: "failed" }) as RunOutput & { kind: "completed" }), performance: [{ size: 1000, cost: 1e9, status: "ok" as const }] };
      expect(interpretRunOutput(perfSpec, out, AT).outcome).toBe("failed_tests");
    });
  });
});

describe("predict", () => {
  const predictSpec = couponSpec({ kind: "predict", tests: [], predict: { code: "1 + 1", acceptedAnswers: ["[1, 2,  3]", "Ok(2)"] } });

  it("normalizes whitespace before comparing", () => {
    expect(normalizeAnswer("  Ok(2) \n")).toBe("Ok(2)");
    expect(predictEvaluation(predictSpec, " [1,   2, 3]\n", AT)).toMatchObject({ outcome: "passed", correctness: true });
    expect(predictEvaluation(predictSpec, "[1,2,3]", AT)).toMatchObject({ outcome: "failed_tests", correctness: false });
    expect(predictEvaluation(predictSpec, "   ", AT).correctness).toBe(false);
  });
});
