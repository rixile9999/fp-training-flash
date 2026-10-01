/**
 * Deterministic rubric checks (`RubricItem.automatedCheck`). They only annotate the evaluation
 * ("flagged"/"ok") for coaching; they never change correctness or the outcome.
 * pattern checks carry the content's own message (already localized by the catalog); the others are rendered
 * in `locale`.
 */
import { DEFAULT_LOCALE } from "@fp/kernel";
import type { Locale } from "@fp/kernel";
import type { FileContent, RubricItem } from "@fp/content/contract";
import type { RubricCheckResult } from "../contract/index.ts";
import { stripComments, topLevelFunctions } from "../gleam/source.ts";
import { msg } from "../messages.ts";

export function rubricChecks(
  rubric: readonly RubricItem[],
  sourceFiles: readonly FileContent[],
  locale: Locale = DEFAULT_LOCALE,
): RubricCheckResult[] {
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
              message: msg("rubric.functionsTooLong", locale, {
                max: check.max,
                functions: long
                  .map((f) => msg("rubric.functionLines", locale, { name: f.name, lines: f.endLine - f.startLine + 1 }))
                  .join(msg("rubric.listSeparator", locale)),
              }),
            },
      );
      continue;
    }
    let re: RegExp;
    try {
      re = new RegExp(check.pattern, "m");
    } catch {
      // Invalid pattern is a content bug; do not flag the learner for it.
      results.push({ rubricId: item.id, status: "ok", message: msg("rubric.invalidPattern", locale, { pattern: check.pattern }) });
      continue;
    }
    const matched = re.test(code);
    const flagged = check.kind === "forbid_pattern" ? matched : !matched;
    results.push(flagged ? { rubricId: item.id, status: "flagged", message: check.message } : { rubricId: item.id, status: "ok" });
  }
  return results;
}
