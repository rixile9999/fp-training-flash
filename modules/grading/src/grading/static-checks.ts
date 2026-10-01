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
import { DEFAULT_LOCALE } from "@fp/kernel";
import type { Locale } from "@fp/kernel";
import type { FileContent, GradingSpec } from "@fp/content/contract";
import { blankCommentsAndStrings, importedModules, moduleNameFromPath } from "../gleam/source.ts";
import { msg, type MessageId } from "../messages.ts";

export const MAX_SOURCE_BYTES = 64 * 1024;

const FORBIDDEN_IMPORTS: readonly { readonly test: (m: string) => boolean; readonly why: MessageId }[] = [
  { test: (m) => /^fp_internal($|[/_])/.test(m), why: "static.why.graderInternal" },
  { test: (m) => /^fp_runner($|\/)/.test(m), why: "static.why.graderInternal" },
  { test: (m) => m === "gleeunit" || m.startsWith("gleeunit/internal"), why: "static.why.testRunner" },
  { test: (m) => /(^|\/)[a-z0-9_]*_test$/.test(m), why: "static.why.testModule" },
];

/** One rejection reason; `file` is absent for submission-level reasons. */
export interface SourceIssue {
  readonly file?: string;
  readonly text: string;
}

export function staticChecks(
  spec: GradingSpec,
  sourceFiles: readonly FileContent[],
  locale: Locale = DEFAULT_LOCALE,
): readonly string[] {
  return checkSources(sourceFiles, new Set(spec.testFiles.map((f) => moduleNameFromPath(f.path))), locale);
}

/** The same checks without an exercise (snippets): `testModules` are extra forbidden imports. "<file>: <reason>" each. */
export function checkSources(
  sourceFiles: readonly FileContent[],
  testModules: ReadonlySet<string>,
  locale: Locale = DEFAULT_LOCALE,
): readonly string[] {
  return sourceIssues(sourceFiles, testModules, locale).map((i) =>
    i.file === undefined ? i.text : msg("static.fileReason", locale, { file: i.file, reason: i.text }),
  );
}

export function sourceIssues(
  sourceFiles: readonly FileContent[],
  testModules: ReadonlySet<string>,
  locale: Locale = DEFAULT_LOCALE,
): readonly SourceIssue[] {
  const issues: SourceIssue[] = [];
  if (sourceFiles.length === 0) issues.push({ text: msg("static.noCode", locale) });
  for (const f of sourceFiles) {
    const file = f.path;
    const add = (text: string) => issues.push({ file, text });
    if (!f.path.endsWith(".gleam")) add(msg("static.notGleam", locale));
    if (Buffer.byteLength(f.content, "utf8") > MAX_SOURCE_BYTES) {
      add(msg("static.tooLarge", locale, { maxKb: MAX_SOURCE_BYTES / 1024 }));
      continue;
    }
    if (f.content.includes("\u0000")) add(msg("static.nul", locale));
    const code = blankCommentsAndStrings(f.content);
    if (/@\s*external\b/.test(code)) add(msg("static.external", locale));
    for (const m of importedModules(f.content)) {
      const hit = FORBIDDEN_IMPORTS.find((x) => x.test(m));
      const why: MessageId | undefined = hit ? hit.why : testModules.has(m) ? "static.why.testModule" : undefined;
      if (why) add(msg("static.forbiddenImport", locale, { module: m, why: msg(why, locale) }));
    }
  }
  return issues;
}
