/** Integration scenarios shared by the local and Docker runner tests (real gleam + BEAM). */
import { expect, it } from "vitest";
import type { GradingSpec } from "@fp/content/contract";
import type { CodeRunner, RunOutput, SnippetRequest, SnippetResult } from "../src/contract/index.ts";
import { buildRunJob } from "../src/grading/run-job.ts";
import { interpretRunOutput } from "../src/grading/interpret.ts";
import { buildSnippetJob, interpretSnippetOutput, newSnippetToken } from "../src/grading/snippet.ts";
import { couponSpec, couponTestFile, fixture } from "./helpers.ts";

const AT = "2026-09-30T00:00:00.000Z";
export const RUN_TIMEOUT = 120_000;

export const perfSpec: GradingSpec = couponSpec({
  testFiles: [couponTestFile, { path: "test/coupon_perf.gleam", content: fixture("coupon_perf.gleam") }],
  performance: { sizes: [100, 1000, 3000], perfModule: "coupon_perf", maxCostRatio: 3, referenceCost: [] },
});

export async function runFixture(runner: CodeRunner, file: string, spec: GradingSpec = couponSpec()): Promise<RunOutput> {
  return runner.run(buildRunJob(spec, [{ path: "src/coupon.gleam", content: fixture(file) }], true));
}

/** What GradingService.evaluateSnippet does, minus the queue. */
export async function evaluateSnippet(runner: CodeRunner, req: SnippetRequest): Promise<SnippetResult> {
  const token = newSnippetToken();
  const built = buildSnippetJob(req, token);
  if (!built.ok) throw new Error(built.error.message);
  if (built.value.kind === "rejected") return built.value;
  const result = interpretSnippetOutput(await runner.run(built.value.job), token);
  if (!result.ok) throw new Error(`${result.error.message} ${JSON.stringify(result.error.details)}`);
  return result.value;
}

export function sharedRunnerScenarios(getRunner: () => CodeRunner): void {
  it("snippet: values, compile errors, runtime errors, timeouts, rejections", { timeout: RUN_TIMEOUT }, async () => {
    const run = (req: SnippetRequest) => evaluateSnippet(getRunner(), req);
    expect(await run({ imports: ["gleam/list"], expression: "list.map([1, 2], fn(x) { x * 2 })" })).toEqual({
      kind: "value",
      value: "[2, 4]",
    });
    expect(await run({ imports: [], expression: "-7 / 2" })).toEqual({ kind: "value", value: "-3" });
    // Snippet stdout (even a fake result line) never becomes the value.
    expect(
      await run({ imports: ["gleam/io"], expression: 'io.println("@@FP:x@@{}")\n"한글\\n"' }),
    ).toEqual({ kind: "value", value: '"한글\\n"' });
    expect(
      await run({
        imports: ["gleam/int.{to_string}"],
        definitions: "pub type Shape {\n  Square(Int)\n}\n\nfn area(s: Shape) -> Int {\n  case s {\n    Square(n) -> n * n\n  }\n}",
        expression: "#(area(Square(3)), to_string(4), Square(2))",
      }),
    ).toEqual({ kind: "value", value: '#(9, "4", Square(2))' });

    const typeError = await run({ imports: [], expression: '1 + "a"' });
    expect(typeError.kind).toBe("compile_error");
    if (typeError.kind === "compile_error") {
      expect(typeError.diagnostics[0]).toMatchObject({ severity: "error", file: "src/fp_snippet.gleam" });
      expect(typeError.diagnostics[0]?.message).toContain("Type mismatch");
    }
    const panic = await run({ imports: [], expression: 'panic as "boom"' });
    expect(panic.kind).toBe("runtime_error");
    expect(panic.kind === "runtime_error" && panic.message).toContain("boom");
    // A panic from the snippet that imitates the value format is still a runtime error.
    const forged = await run({ imports: [], expression: 'panic as "fpv0:1:1"' });
    expect(forged.kind).toBe("runtime_error");
    expect(await run({ imports: [], definitions: "fn loop(n: Int) -> Int {\n  loop(n + 1)\n}", expression: "loop(0)" })).toEqual({
      kind: "timeout",
    });
    const ext = await run({ imports: [], definitions: '@external(erlang, "os", "cmd")\nfn cmd(c: String) -> String', expression: "1" });
    expect(ext.kind).toBe("rejected");
    expect(ext.kind === "rejected" && ext.reasons[0]).toContain("@external");
  });

  it("reference solution passes all 5 tests", { timeout: RUN_TIMEOUT }, async () => {
    const out = await runFixture(getRunner(), "reference.gleam");
    expect(out.kind, JSON.stringify(out)).toBe("completed");
    const e = interpretRunOutput(couponSpec(), out, AT);
    expect(e.tests.map((t) => t.status)).toEqual(["passed", "passed", "passed", "passed", "passed"]);
    expect(e.outcome).toBe("passed");
  });

  it("wrong/filter-drops fails keeps_other_orders_test with expected/actual", { timeout: RUN_TIMEOUT }, async () => {
    const e = interpretRunOutput(couponSpec(), await runFixture(getRunner(), "wrong-filter-drops.gleam"), AT);
    expect(e.outcome).toBe("failed_tests");
    const t = e.tests.find((x) => x.id === "T3")!;
    expect(t.status).toBe("failed");
    expect(t.message).toContain("기대값: [Order(1, Pending, 9000), Order(2, Shipped, 5000)]");
    expect(t.message).toContain("실제값: [Order(1, Pending, 9000)]");
    expect(e.errorTags).toContain("drops_items_with_filter");
  });

  it("learner stdout cannot forge results", { timeout: RUN_TIMEOUT }, async () => {
    const e = interpretRunOutput(couponSpec(), await runFixture(getRunner(), "forge-output.gleam"), AT);
    const t = e.tests.find((x) => x.id === "T3")!;
    expect(t.status).toBe("failed");
    expect(t.message).toContain("출력:"); // captured learner output is attached to the failure
  });

  it("an infinite loop times out", { timeout: RUN_TIMEOUT }, async () => {
    const spec = couponSpec({ limits: { timeMs: 2000, memoryMb: 128 } });
    const e = interpretRunOutput(spec, await runFixture(getRunner(), "infinite-loop.gleam", spec), AT);
    expect(e.outcome).toBe("timeout");
    expect(e.tests[0]?.status).toBe("timeout");
  });

  it("exceeding the memory limit fails the test instead of the job", { timeout: RUN_TIMEOUT }, async () => {
    const spec = couponSpec({ limits: { timeMs: 10_000, memoryMb: 64 } });
    const e = interpretRunOutput(spec, await runFixture(getRunner(), "memory-hog.gleam", spec), AT);
    expect(e.outcome).toBe("failed_tests");
    expect(e.tests[0]?.status).toBe("error");
    expect(e.tests[0]?.message).toContain("메모리 한도(64 MB)");
  });

  it("learner compile errors become compile_error diagnostics", { timeout: RUN_TIMEOUT }, async () => {
    const out = await runFixture(getRunner(), "compile-error.gleam");
    expect(out.kind, JSON.stringify(out)).toBe("compile_error");
    if (out.kind !== "compile_error") return;
    const err = out.compileDiagnostics.find((d) => d.severity === "error")!;
    expect(err).toMatchObject({ file: "src/coupon.gleam", line: 14 });
    expect(err.message).toContain("Type mismatch");
  });

  it("test-file compile errors unrelated to the learner are system errors", { timeout: RUN_TIMEOUT }, async () => {
    const broken = couponSpec({
      testFiles: [couponTestFile, { path: "test/broken_helper.gleam", content: "import gleam/list\npub fn x() { list.nope() }\n" }],
    });
    const out = await runFixture(getRunner(), "reference.gleam", broken);
    expect(out.kind).toBe("system_error");
  });

  it("performance: O(n^2) costs more reductions than O(n)", { timeout: RUN_TIMEOUT }, async () => {
    const linear = await runFixture(getRunner(), "reference.gleam", perfSpec);
    const quadratic = await runFixture(getRunner(), "quadratic.gleam", perfSpec);
    if (linear.kind !== "completed" || quadratic.kind !== "completed") throw new Error("perf runs did not complete");
    expect(linear.performance.map((m) => [m.size, m.status])).toEqual([
      [100, "ok"],
      [1000, "ok"],
      [3000, "ok"],
    ]);
    const lin = linear.performance.at(-1)!.cost;
    const quad = quadratic.performance.at(-1)!.cost;
    expect(lin).toBeGreaterThan(0);
    expect(quad).toBeGreaterThan(lin * 10);
    // With the linear costs as reference, the quadratic version is too slow.
    const withRef = { ...perfSpec, performance: { ...perfSpec.performance!, referenceCost: linear.performance.map((m) => m.cost) } };
    expect(interpretRunOutput(withRef, quadratic, AT).outcome).toBe("too_slow");
    expect(interpretRunOutput(withRef, linear, AT).outcome).toBe("passed");
  });
}
