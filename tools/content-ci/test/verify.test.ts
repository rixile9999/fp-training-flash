import { describe, expect, it } from "vitest";
import type { ExerciseDetail, GradingSpec, ReferenceMaterial } from "@fp/content/contract";
import type { CodeRunner, RunJob, RunOutput } from "@fp/grading/contract";
import { verifyExercise } from "../src/verify.ts";

const runnerInfo = { runner: "local" as const, languageVersion: "test", runtimeVersion: "test" };

type Statuses = Partial<Record<string, "passed" | "failed">>;

function fakeRunner(decide: (job: RunJob) => Statuses): CodeRunner {
  return {
    language: "gleam",
    info: async () => runnerInfo,
    run: async (job): Promise<RunOutput> => {
      const statuses = decide(job);
      return {
        kind: "completed",
        compileDiagnostics: [],
        tests: job.testFunctions.map((fq) => {
          const fn = fq.split(".").pop() ?? fq;
          return { functionName: fn, status: statuses[fn] ?? "passed" };
        }),
        performance: [],
        runner: runnerInfo,
        durationMs: 1,
      };
    },
  };
}

const file = (content: string) => [{ path: "src/m.gleam", content }];
const spec = {
  exerciseId: "fam/base@1",
  language: "gleam",
  kind: "implement",
  moduleName: "m",
  testFiles: [{ path: "test/m_test.gleam", content: "pub fn a_test() { Nil }\npub fn b_test() { Nil }" }],
  supportFiles: [],
  tests: [
    { id: "a_test", functionName: "a_test", name: "a", visibility: "public" },
    { id: "b_test", functionName: "b_test", name: "b", visibility: "hidden" },
  ],
  requirements: [],
  rubric: [],
  limits: { timeMs: 1000, memoryMb: 64 },
} as unknown as GradingSpec;
const detail = { id: "fam/base@1", kind: "implement", starterFiles: file("STARTER") } as unknown as ExerciseDetail;
const reference = {
  exerciseId: "fam/base@1",
  solutionFiles: file("REFERENCE"),
  explanationMarkdown: "",
  wrongSolutions: [{ key: "w", files: file("WRONG"), mustFail: ["b_test"] }],
} as unknown as ReferenceMaterial;

const source = (job: RunJob) => job.sourceFiles[0]?.content ?? "";
const now = () => "2026-09-30T00:00:00.000Z";

describe("verifyExercise", () => {
  it("accepts a consistent exercise", async () => {
    const runner = fakeRunner((job): Statuses => {
      const s = source(job);
      if (s === "WRONG") return { b_test: "failed" };
      if (s === "STARTER") return { a_test: "failed", b_test: "failed" };
      return {};
    });
    const r = await verifyExercise({ detail, spec, reference, runner, now });
    expect(r.problems).toEqual([]);
  });

  it("reports a wrong answer that passes its mustFail test and a starter that already passes", async () => {
    const runner = fakeRunner(() => ({}));
    const r = await verifyExercise({ detail, spec, reference, runner, now });
    expect(r.problems.some((p) => p.includes("wrong/w") && p.includes("b_test"))).toBe(true);
    expect(r.problems).toContain("starter already passes all tests");
  });

  it("reports a failing reference solution", async () => {
    const runner = fakeRunner((job): Statuses => (source(job) === "REFERENCE" ? { a_test: "failed" } : { a_test: "failed", b_test: "failed" }));
    const r = await verifyExercise({ detail, spec, reference, runner, now });
    expect(r.problems.some((p) => p.startsWith("reference does not pass"))).toBe(true);
  });
});
