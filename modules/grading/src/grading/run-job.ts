import type { FileContent, GradingSpec, TestCaseSpec } from "@fp/content/contract";
import type { RunJob } from "../contract/index.ts";
import { moduleNameFromPath, topLevelFunctions } from "../gleam/source.ts";

/** Test module that defines `pub fn <functionName>`, falling back to the first test module. */
export function testModuleOf(spec: GradingSpec, functionName: string): string | null {
  for (const f of spec.testFiles) {
    if (!f.path.endsWith(".gleam")) continue;
    if (topLevelFunctions(f.content).some((fn) => fn.isPublic && fn.name === functionName)) return moduleNameFromPath(f.path);
  }
  const first = spec.testFiles.find((f) => f.path.endsWith(".gleam"));
  return first ? moduleNameFromPath(first.path) : null;
}

export function qualifiedTestName(spec: GradingSpec, test: TestCaseSpec): string {
  const module = testModuleOf(spec, test.functionName);
  return module ? `${module}.${test.functionName}` : test.functionName;
}

/** Learner code of a code exercise as runner files: one file, `src/<moduleName>.gleam`. */
export function learnerFiles(spec: GradingSpec, code: string): FileContent[] {
  return [{ path: `src/${spec.moduleName}.gleam`, content: code }];
}

/** Build the runner job for learner files. `includeHidden=false` for trial runs (public tests, no perf). */
export function buildRunJob(spec: GradingSpec, sourceFiles: readonly FileContent[], includeHidden: boolean): RunJob {
  const tests = spec.tests.filter((t) => includeHidden || t.visibility === "public");
  const perf = includeHidden ? spec.performance : undefined;
  return {
    language: spec.language,
    sourceFiles,
    supportFiles: spec.supportFiles,
    testFiles: spec.testFiles,
    testFunctions: tests.map((t) => qualifiedTestName(spec, t)),
    ...(perf ? { performance: { perfModule: perf.perfModule, sizes: perf.sizes } } : {}),
    limits: spec.limits,
  };
}
