/**
 * Content CI checks for one exercise, using only public module APIs:
 * reference passes, runs are deterministic, wrong answers fail their mustFail tests,
 * starter compiles and (except refactor) fails, performance baselines are measured.
 */
import type { ExerciseDetail, GradingSpec, ReferenceMaterial } from "@fp/content/contract";
import type { CodeRunner, Evaluation } from "@fp/grading/contract";
import { buildRunJob, interpretRunOutput, staticChecks } from "@fp/grading";

export interface ExerciseCheck {
  readonly exerciseId: string;
  readonly problems: string[];
  readonly referenceCost?: number[];
  readonly durationMs: number;
}

export interface VerifyInput {
  readonly detail: ExerciseDetail;
  readonly spec: GradingSpec;
  readonly reference: ReferenceMaterial;
  readonly runner: CodeRunner;
  readonly now: () => string;
}

const failedIds = (e: Evaluation) => new Set(e.tests.filter((t) => t.status !== "passed").map((t) => t.id));
const statusKey = (e: Evaluation) => JSON.stringify(e.tests.map((t) => [t.id, t.status]));

function describe(e: Evaluation): string {
  if (e.outcome === "compile_error") return `compile_error: ${e.compileDiagnostics.map((d) => d.message).join(" | ").slice(0, 400)}`;
  if (e.outcome === "rejected") return `rejected: ${(e.rejectionReasons ?? []).join(", ")}`;
  const failing = e.tests.filter((t) => t.status !== "passed").map((t) => `${t.id}(${t.status}${t.message ? `: ${t.message.slice(0, 160)}` : ""})`);
  return `${e.outcome}${failing.length ? ` failing=[${failing.join("; ")}]` : ""}`;
}

async function evaluate(input: VerifyInput, files: ExerciseDetail["starterFiles"]): Promise<Evaluation> {
  const rejections = staticChecks(input.spec, files);
  if (rejections.length) {
    return {
      outcome: "rejected",
      correctness: false,
      compileDiagnostics: [],
      tests: [],
      requirements: [],
      rubricChecks: [],
      rejectionReasons: rejections,
      errorTags: [],
      evaluatedAt: input.now(),
    };
  }
  const job = buildRunJob(input.spec, files, true);
  const out = await input.runner.run(job);
  return interpretRunOutput(input.spec, out, input.now());
}

export async function verifyExercise(input: VerifyInput): Promise<ExerciseCheck> {
  const started = Date.now();
  const { detail, spec, reference } = input;
  const problems: string[] = [];
  let referenceCost: number[] | undefined;

  if (detail.kind === "predict") {
    if (!spec.predict || spec.predict.acceptedAnswers.length === 0) problems.push("predict exercise has no accepted answers");
    return { exerciseId: detail.id, problems, durationMs: Date.now() - started };
  }

  // 1. Reference solution passes everything, twice, identically.
  const ref1 = await evaluate(input, reference.solutionFiles);
  if (ref1.outcome === "system_error") problems.push(`reference: system_error (${describe(ref1)})`);
  else if (!ref1.correctness) problems.push(`reference does not pass: ${describe(ref1)}`);
  const ref2 = await evaluate(input, reference.solutionFiles);
  if (statusKey(ref1) !== statusKey(ref2)) problems.push("non-deterministic: two reference runs differ");
  if (ref1.tests.length !== spec.tests.length) problems.push(`expected ${spec.tests.length} test results, got ${ref1.tests.length}`);

  // 2. Wrong answers fail what they claim to fail.
  for (const wrong of reference.wrongSolutions) {
    const e = await evaluate(input, wrong.files);
    if (e.outcome === "compile_error" || e.outcome === "rejected" || e.outcome === "system_error") {
      problems.push(`wrong/${wrong.key}: ${describe(e)} (wrong answers must compile and fail tests)`);
      continue;
    }
    const failed = failedIds(e);
    const missing = wrong.mustFail.filter((id) => !failed.has(id));
    if (missing.length) problems.push(`wrong/${wrong.key}: expected to fail [${missing.join(", ")}] but passed`);
  }
  if ((detail.kind === "implement" || detail.kind === "fix") && reference.wrongSolutions.length === 0) {
    problems.push("implement/fix exercise needs at least one wrong answer");
  }

  // 3. Starter compiles; it must fail some test unless it is a refactor exercise.
  if (detail.starterFiles.length) {
    const s = await evaluate(input, detail.starterFiles);
    if (s.outcome === "compile_error" || s.outcome === "rejected" || s.outcome === "system_error") {
      problems.push(`starter: ${describe(s)}`);
    } else if (detail.kind === "refactor" && !s.correctness) {
      problems.push(`refactor starter must pass all tests: ${describe(s)}`);
    } else if (detail.kind !== "refactor" && s.correctness) {
      problems.push("starter already passes all tests");
    }
  }

  // 4. Performance baseline.
  if (spec.performance) {
    const perf = ref1.performance;
    if (!perf || perf.measurements.length !== spec.performance.sizes.length || perf.measurements.some((m) => m.status !== "ok")) {
      problems.push(`performance: reference measurement failed (${JSON.stringify(perf?.measurements ?? [])})`);
    } else {
      referenceCost = perf.measurements.map((m) => m.cost);
    }
  }

  const result: ExerciseCheck = { exerciseId: detail.id, problems, durationMs: Date.now() - started };
  return referenceCost ? { ...result, referenceCost } : result;
}
