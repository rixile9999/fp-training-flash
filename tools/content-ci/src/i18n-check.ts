#!/usr/bin/env node
/**
 * Translation self-check (structure only). The content module loader validates the same overlays (unknown keys,
 * locales, starter code) as ContentIssues and computes ExerciseSummary.locales with the same completeness rule;
 * content CI (main.ts) compiles localized starters. This script adds a readable per-locale progress report.
 *   node tools/content-ci/src/i18n-check.ts [--family <id>]... [--locale en|zh]... [--notes]
 * Reports per variant and locale: missing files for a complete translation, overlay keys that do not exist in the
 * Korean source, and localized starters whose code differs from the Korean starter apart from comments.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { parse } from "yaml";
import { codeOnly } from "@fp/content";

const root = resolve(fileURLToPath(new URL("../../..", import.meta.url)), "content");
const { values } = parseArgs({
  options: { family: { type: "string", multiple: true }, locale: { type: "string", multiple: true }, notes: { type: "boolean", default: false } },
});
const locales = values.locale?.length ? values.locale : ["en", "zh"];
const HANGUL = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/;
const problems: string[] = [];
const yamlOf = (p: string): Record<string, unknown> => (existsSync(p) ? ((parse(readFileSync(p, "utf8")) ?? {}) as Record<string, unknown>) : {});
const keysOf = (v: unknown): string[] => (v && typeof v === "object" ? Object.keys(v as object) : []);


/**
 * Hangul inside Gleam string literals is test data (graded code compares those strings), so it is allowed in
 * localized starters and in code blocks of translated Markdown. Everything else must be translated.
 */
function stripStringLiterals(code: string): string {
  return code.replace(/"(?:[^"\\]|\\.)*"/g, '""');
}
function translatableText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, (block) => stripStringLiterals(block))
    .replace(/`[^`\n]*`/g, "``"); // inline code quotes exact strings the tests expect
}

const families = readdirSync(join(root, "exercises")).filter((f) => !values.family?.length || values.family.includes(f));
let complete = 0;
let total = 0;
for (const fam of families) {
  const famDir = join(root, "exercises", fam);
  const famYaml = yamlOf(join(famDir, "family.yaml"));
  const famRubric = new Set((famYaml.rubric as { id: string }[] | undefined)?.map((r) => r.id) ?? []);
  const variants = readdirSync(famDir).filter((v) => statSync(join(famDir, v)).isDirectory());
  for (const loc of locales) {
    const famOverlay = yamlOf(join(famDir, `family.${loc}.yaml`));
    if (!famOverlay.title) problems.push(`${fam}: family.${loc}.yaml missing title`);
    for (const k of keysOf(famOverlay.rubric)) if (!famRubric.has(k)) problems.push(`${fam}/family.${loc}.yaml: unknown rubric id ${k}`);
  }
  for (const v of variants) {
    const dir = join(famDir, v);
    const ex = yamlOf(join(dir, "exercise.yaml"));
    const isPredict = ex.kind === "predict";
    const testFns = new Set(((ex.tests as { fn: string }[]) ?? []).map((t) => t.fn));
    const reqIds = new Set(((ex.requirements as { id: string }[]) ?? []).map((r) => r.id));
    // The variant's rubric replaces the family's (same merge as the loader).
    const rubricIds = ex.rubric ? new Set((ex.rubric as { id: string }[]).map((r) => r.id)) : famRubric;
    const module = ex.module as string | undefined;
    const starterPath = module ? join(dir, "starter", `${module}.gleam`) : null;
    const starter = starterPath && existsSync(starterPath) ? readFileSync(starterPath, "utf8") : null;
    for (const loc of locales) {
      total++;
      const missing: string[] = [];
      for (const f of [`prompt.${loc}.md`, `explanation.${loc}.md`, `exercise.${loc}.yaml`]) if (!existsSync(join(dir, f))) missing.push(f);
      const ov = yamlOf(join(dir, `exercise.${loc}.yaml`));
      const tests = keysOf(ov.tests);
      const hints = keysOf(ov.hints).map(Number);
      for (const fn of tests) if (!testFns.has(fn)) problems.push(`${fam}/${v}/exercise.${loc}.yaml: unknown test fn ${fn}`);
      for (const id of keysOf(ov.requirements)) if (!reqIds.has(id)) problems.push(`${fam}/${v}/exercise.${loc}.yaml: unknown requirement ${id}`);
      for (const id of keysOf(ov.rubric)) if (!rubricIds.has(id)) problems.push(`${fam}/${v}/exercise.${loc}.yaml: unknown rubric id ${id}`);
      if (!isPredict) for (const fn of testFns) if (!tests.includes(fn)) missing.push(`test name ${fn}`);
      for (const level of [1, 2, 3, 4, 5]) if (!hints.includes(level)) missing.push(`hint ${level}`);
      // A variant that overrides the Korean title needs its own translated title.
      if (ex.title !== undefined && !ov.title) missing.push(`title in exercise.${loc}.yaml`);
      if (starter && HANGUL.test(starter) && module) {
        const loc_starter = join(dir, `starter.${loc}`, `${module}.gleam`);
        if (!existsSync(loc_starter)) missing.push(`starter.${loc}/${module}.gleam`);
        else {
          const translated = readFileSync(loc_starter, "utf8");
          if (codeOnly(translated) !== codeOnly(starter)) problems.push(`${fam}/${v}/starter.${loc}: code differs from the Korean starter (only comments may change)`);
          if (HANGUL.test(stripStringLiterals(translated))) problems.push(`${fam}/${v}/starter.${loc}: still contains Korean outside string literals`);
        }
      }
      for (const f of [`prompt.${loc}.md`, `explanation.${loc}.md`]) {
        const p = join(dir, f);
        if (existsSync(p) && HANGUL.test(translatableText(readFileSync(p, "utf8")))) problems.push(`${fam}/${v}/${f}: still contains Korean outside code string literals`);
      }
      if (missing.length) problems.push(`${fam}/${v} [${loc}] incomplete: ${missing.join(", ")}`);
      else complete++;
    }
  }
}

if (values.notes) {
  for (const kind of ["concepts", "theory"]) {
    for (const f of readdirSync(join(root, kind)).filter((n) => /^[a-z0-9-]+\.md$/.test(n))) {
      const id = f.replace(/\.md$/, "");
      for (const loc of locales) {
        const p = join(root, kind, `${id}.${loc}.md`);
        if (!existsSync(p)) problems.push(`${kind}/${id}.${loc}.md missing`);
        else if (HANGUL.test(readFileSync(p, "utf8").replace(/^---[\s\S]*?---/, ""))) problems.push(`${kind}/${id}.${loc}.md: body still contains Korean`);
      }
    }
  }
  const skills = (yamlOf(join(root, "skills.yaml")).skills as { id: string }[]).map((s) => s.id);
  for (const loc of locales) {
    const ov = yamlOf(join(root, `skills.${loc}.yaml`));
    for (const id of skills) if (!keysOf(ov.skills).includes(id)) problems.push(`skills.${loc}.yaml: missing ${id}`);
  }
}

for (const p of problems) console.log(`✗ ${p}`);
console.log(`\n${complete}/${total} variant-locale pairs complete; ${problems.length} problem(s)`);
process.exit(problems.length ? 1 : 0);
