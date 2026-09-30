/**
 * Deterministic rubric checks (`RubricItem.automatedCheck`). They only annotate the evaluation
 * ("flagged"/"ok") for coaching; they never change correctness or the outcome.
 */
import type { FileContent, RubricItem } from "@fp/content/contract";
import type { RubricCheckResult } from "../contract/index.ts";
import { stripComments, topLevelFunctions } from "../gleam/source.ts";

export function rubricChecks(rubric: readonly RubricItem[], sourceFiles: readonly FileContent[]): RubricCheckResult[] {
  const results: RubricCheckResult[] = [];
  const code = sourceFiles.map((f) => stripComments(f.content)).join("\n");
  for (const item of rubric) {
    const check = item.automatedCheck;
    if (!check) continue;
    if (check.kind === "max_function_lines") {
      const long = sourceFiles
        .flatMap((f) => topLevelFunctions(f.content))
        .filter((fn) => fn.endLine - fn.startLine + 1 > check.max);
      results.push(
        long.length === 0
          ? { rubricId: item.id, status: "ok" }
          : {
              rubricId: item.id,
              status: "flagged",
              message: `함수가 ${check.max}줄을 넘습니다: ${long.map((f) => `${f.name}(${f.endLine - f.startLine + 1}줄)`).join(", ")}`,
            },
      );
      continue;
    }
    let re: RegExp;
    try {
      re = new RegExp(check.pattern, "m");
    } catch {
      // Invalid pattern is a content bug; do not flag the learner for it.
      results.push({ rubricId: item.id, status: "ok", message: `잘못된 검사 패턴: ${check.pattern}` });
      continue;
    }
    const matched = re.test(code);
    const flagged = check.kind === "forbid_pattern" ? matched : !matched;
    results.push(flagged ? { rubricId: item.id, status: "flagged", message: check.message } : { rubricId: item.id, status: "ok" });
  }
  return results;
}
