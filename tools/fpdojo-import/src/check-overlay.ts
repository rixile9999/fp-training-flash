#!/usr/bin/env node
/**
 * Checks lesson overlays for a locale against the Korean source.
 *   node tools/fpdojo-import/src/check-overlay.ts --locale zh [--unit <id>]...
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { parse } from "yaml";

const root = resolve(fileURLToPath(new URL("../../..", import.meta.url)), "content/lessons");
const { values } = parseArgs({ options: { locale: { type: "string", default: "zh" }, unit: { type: "string", multiple: true } } });
const loc = values.locale;
const HANGUL = /[가-힣]/;
const problems: string[] = [];
let blocksChecked = 0;
for (const unit of readdirSync(root).filter((u) => !values.unit?.length || values.unit.includes(u))) {
  const dir = join(root, unit);
  const u = parse(readFileSync(join(dir, "unit.yaml"), "utf8"));
  const uo = join(dir, `unit.${loc}.yaml`);
  if (!existsSync(uo) || !parse(readFileSync(uo, "utf8"))?.title) problems.push(`${unit}/unit.${loc}.yaml: missing title`);
  for (const lessonId of u.lessons as string[]) {
    const ko = parse(readFileSync(join(dir, `${lessonId}.yaml`), "utf8"));
    const p = join(dir, `${lessonId}.${loc}.yaml`);
    if (!existsSync(p)) {
      problems.push(`${unit}/${lessonId}.${loc}.yaml missing`);
      continue;
    }
    const ov = parse(readFileSync(p, "utf8")) ?? {};
    if (!ov.title) problems.push(`${unit}/${lessonId}.${loc}.yaml: missing title`);
    const ids = new Set<string>();
    for (const b of ko.blocks) {
      const id = b.exercise ?? b.prose;
      ids.add(id);
      blocksChecked++;
      const o = ov.blocks?.[id];
      const where = `${unit}/${lessonId}/${id}`;
      if (!o) {
        problems.push(`${where}: missing overlay block`);
        continue;
      }
      if (b.prose !== undefined) {
        if (!o.markdown) problems.push(`${where}: missing markdown`);
      } else {
        if (!o.prompt) problems.push(`${where}: missing prompt`);
        if (!Array.isArray(o.choices) || o.choices.length !== b.choices.length) problems.push(`${where}: choices must have ${b.choices.length} entries`);
        if (!o.feedback?.correct) problems.push(`${where}: missing feedback.correct`);
        const koFb = Object.keys(b.feedback?.choices ?? {}).sort().join(",");
        const ovFb = Object.keys(o.feedback?.choices ?? {}).sort().join(",");
        if (koFb !== ovFb) problems.push(`${where}: feedback.choices keys ${ovFb} != ${koFb}`);
        if ("answer" in o) problems.push(`${where}: answer must not be overlaid`);
      }
      const text = JSON.stringify(o);
      if (HANGUL.test(text)) problems.push(`${where}: contains Korean`);
    }
    for (const id of Object.keys(ov.blocks ?? {})) if (!ids.has(id)) problems.push(`${unit}/${lessonId}: unknown block ${id}`);
  }
}
for (const p of problems) console.log(`✗ ${p}`);
console.log(`\n${blocksChecked} blocks checked for ${loc}; ${problems.length} problem(s)`);
process.exit(problems.length ? 1 : 0);
