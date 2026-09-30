/**
 * Static pre-checks on learner files, run before any code reaches a runner. A non-empty result means
 * the submission is "rejected". The list (keep CLAUDE.md in sync):
 *  1. `@external` anywhere in code (FFI is the only way out of Gleam's pure stdlib: files, sockets, os).
 *  2. Imports of grader-internal modules: `fp_internal*` (the harness) and `fp_runner*`.
 *  3. Imports of `gleeunit` itself or `gleeunit/internal/*` (gleeunit.main runs eunit and halts the VM);
 *     `gleeunit/should` is allowed.
 *  4. Imports of test modules (`*_test` or any module from the exercise's test files).
 *  5. File shape: `.gleam` files only, at most 64 KB each, no NUL bytes.
 * Comments and string literals are ignored, so `"@external"` in a string is fine.
 */
import type { FileContent, GradingSpec } from "@fp/content/contract";
import { blankCommentsAndStrings, importedModules, moduleNameFromPath } from "../gleam/source.ts";

export const MAX_SOURCE_BYTES = 64 * 1024;

const FORBIDDEN_IMPORTS: readonly { readonly test: (m: string) => boolean; readonly why: string }[] = [
  { test: (m) => /^fp_internal($|[/_])/.test(m), why: "채점기 내부 모듈" },
  { test: (m) => /^fp_runner($|\/)/.test(m), why: "채점기 내부 모듈" },
  { test: (m) => m === "gleeunit" || m.startsWith("gleeunit/internal"), why: "테스트 실행기 모듈" },
  { test: (m) => /(^|\/)[a-z0-9_]*_test$/.test(m), why: "테스트 모듈" },
];

export function staticChecks(spec: GradingSpec, sourceFiles: readonly FileContent[]): readonly string[] {
  const reasons: string[] = [];
  const testModules = new Set(spec.testFiles.map((f) => moduleNameFromPath(f.path)));
  if (sourceFiles.length === 0) reasons.push("제출된 코드가 없습니다.");
  for (const file of sourceFiles) {
    const name = file.path;
    if (!file.path.endsWith(".gleam")) reasons.push(`${name}: Gleam 소스 파일(.gleam)만 제출할 수 있습니다.`);
    if (Buffer.byteLength(file.content, "utf8") > MAX_SOURCE_BYTES) {
      reasons.push(`${name}: 코드가 너무 깁니다 (최대 ${MAX_SOURCE_BYTES / 1024}KB).`);
      continue;
    }
    if (file.content.includes("\u0000")) reasons.push(`${name}: 코드에 NUL 문자가 있습니다.`);
    const code = blankCommentsAndStrings(file.content);
    if (/@\s*external\b/.test(code)) {
      reasons.push(`${name}: @external(외부 함수 연결)은 사용할 수 없습니다. Gleam 표준 라이브러리만 사용하세요.`);
    }
    for (const m of importedModules(file.content)) {
      const hit = FORBIDDEN_IMPORTS.find((f) => f.test(m));
      if (hit) reasons.push(`${name}: ${m} 모듈(${hit.why})은 import할 수 없습니다.`);
      else if (testModules.has(m)) reasons.push(`${name}: ${m} 모듈(테스트 모듈)은 import할 수 없습니다.`);
    }
  }
  return reasons;
}
