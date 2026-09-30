/**
 * Pure mapping from runner output (or a static rejection / predict answer) to an Evaluation.
 * Outcome precedence: rejected > compile_error > timeout > failed_tests > too_slow > passed.
 * system_error is an infrastructure failure and never a learning failure.
 */
import type { GradingSpec, PerformanceSpec, TestCaseSpec } from "@fp/content/contract";
import type {
  Evaluation,
  EvaluationOutcome,
  PerfMeasurement,
  PerformanceResult,
  RawTestResult,
  RequirementResult,
  RunOutput,
  TestResult,
} from "../contract/index.ts";
import { extractFunction } from "../gleam/source.ts";
import { isAcceptedAnswer } from "./predict.ts";

function base(spec: GradingSpec, evaluatedAt: string) {
  return {
    compileDiagnostics: [],
    tests: [],
    requirements: requirementsUndetermined(spec),
    rubricChecks: [],
    errorTags: [],
    evaluatedAt,
  };
}

function requirementsUndetermined(spec: GradingSpec): RequirementResult[] {
  return spec.requirements.map((r) => ({ id: r.id, description: r.description, status: "undetermined" }));
}

export function rejectedEvaluation(spec: GradingSpec, reasons: readonly string[], evaluatedAt: string): Evaluation {
  return { ...base(spec, evaluatedAt), outcome: "rejected", correctness: false, rejectionReasons: [...reasons] };
}

export function systemErrorEvaluation(spec: GradingSpec, message: string, evaluatedAt: string): Evaluation {
  return { ...base(spec, evaluatedAt), outcome: "system_error", correctness: false, rejectionReasons: [message] };
}

export function predictEvaluation(spec: GradingSpec, answer: string, evaluatedAt: string): Evaluation {
  const correct = spec.predict ? isAcceptedAnswer(spec.predict, answer) : false;
  return {
    ...base(spec, evaluatedAt),
    outcome: correct ? "passed" : "failed_tests",
    correctness: correct,
    tests: [
      {
        id: "predict",
        name: "예측한 결과",
        status: correct ? "passed" : "failed",
        visibility: "public",
        ...(correct ? {} : { message: "예상한 값이 실제 결과와 다릅니다." }),
      },
    ],
    requirements: spec.requirements.map((r) => ({ id: r.id, description: r.description, status: correct ? "met" : "unmet" })),
  };
}

function testCode(spec: GradingSpec, functionName: string): string | undefined {
  for (const f of spec.testFiles) {
    const code = extractFunction(f.content, functionName);
    if (code) return code;
  }
  return undefined;
}

function toTestResult(spec: GradingSpec, raw: RawTestResult): TestResult {
  const tc: TestCaseSpec | undefined = spec.tests.find((t) => t.functionName === raw.functionName);
  const failed = raw.status !== "passed";
  const code = failed ? testCode(spec, raw.functionName) : undefined;
  return {
    id: tc?.id ?? raw.functionName,
    name: tc?.name ?? raw.functionName,
    status: raw.status,
    // Unknown tests are treated as hidden (never reveal more than needed).
    visibility: tc?.visibility ?? "hidden",
    ...(raw.message !== undefined ? { message: raw.message } : {}),
    // Test code is revealed only for tests that did not pass (hidden ones included).
    ...(code !== undefined ? { code } : {}),
    ...(tc?.errorTag !== undefined ? { errorTag: tc.errorTag } : {}),
  };
}

function requirementResults(spec: GradingSpec, raw: readonly RawTestResult[]): RequirementResult[] {
  const statusOf = new Map(raw.map((r) => [r.functionName, r.status]));
  return spec.requirements.map((req) => {
    const linked = spec.tests.filter((t) => t.requirementIds?.includes(req.id) && statusOf.has(t.functionName));
    const status: RequirementResult["status"] =
      linked.length === 0
        ? "undetermined"
        : linked.every((t) => statusOf.get(t.functionName) === "passed")
          ? "met"
          : "unmet";
    return { id: req.id, description: req.description, status };
  });
}

export function performanceResult(perf: PerformanceSpec, measurements: readonly PerfMeasurement[]): PerformanceResult {
  const common = { measurements: [...measurements], referenceCost: [...perf.referenceCost] };
  if (perf.referenceCost.length === 0 || measurements.length === 0) return { ...common, verdict: "not_measured" };
  if (measurements.some((m) => m.status === "timeout")) return { ...common, verdict: "too_slow" };
  // Largest size measured ok that also has a reference cost.
  let ratio: number | undefined;
  for (let i = perf.sizes.length - 1; i >= 0 && ratio === undefined; i--) {
    const size = perf.sizes[i];
    const ref = perf.referenceCost[i];
    const m = measurements.find((x) => x.size === size && x.status === "ok");
    if (m && ref !== undefined && ref > 0) ratio = m.cost / ref;
  }
  if (ratio === undefined) return { ...common, verdict: "not_measured" };
  return { ...common, ratio, verdict: ratio > perf.maxCostRatio ? "too_slow" : "ok" };
}

/** Pure mapping from runner output to an Evaluation (rubric checks are added by the caller). */
export function interpretRunOutput(spec: GradingSpec, output: RunOutput, evaluatedAt: string): Evaluation {
  switch (output.kind) {
    case "system_error":
      return {
        ...systemErrorEvaluation(spec, output.message, evaluatedAt),
        ...(output.runner ? { runner: output.runner } : {}),
      };
    case "compile_error":
      return {
        ...base(spec, evaluatedAt),
        outcome: "compile_error",
        correctness: false,
        compileDiagnostics: output.compileDiagnostics,
        runner: output.runner,
        durationMs: output.durationMs,
      };
    case "timeout":
      return {
        ...base(spec, evaluatedAt),
        outcome: "timeout",
        correctness: false,
        runner: output.runner,
        durationMs: output.durationMs,
      };
    case "completed": {
      const tests = output.tests.map((t) => toTestResult(spec, t));
      const allPassed = tests.length > 0 && tests.every((t) => t.status === "passed");
      // Performance only counts once the code is correct (the harness skips it otherwise).
      const performance: PerformanceResult | undefined = !spec.performance
        ? undefined
        : allPassed
          ? performanceResult(spec.performance, output.performance)
          : { verdict: "not_measured", measurements: [...output.performance], referenceCost: [...spec.performance.referenceCost] };
      const outcome: EvaluationOutcome = tests.some((t) => t.status === "timeout")
        ? "timeout"
        : !allPassed
          ? "failed_tests"
          : performance?.verdict === "too_slow"
            ? "too_slow"
            : "passed";
      const errorTags = [...new Set(tests.filter((t) => t.status !== "passed" && t.errorTag).map((t) => t.errorTag!))];
      return {
        outcome,
        correctness: allPassed,
        compileDiagnostics: output.compileDiagnostics,
        tests,
        requirements: requirementResults(spec, output.tests),
        rubricChecks: [],
        ...(performance ? { performance } : {}),
        errorTags,
        runner: output.runner,
        durationMs: output.durationMs,
        evaluatedAt,
      };
    }
  }
}
