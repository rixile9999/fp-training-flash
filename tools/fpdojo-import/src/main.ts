#!/usr/bin/env node
/**
 * Converts the fpdojo dump into content/lessons/ (see docs/design/lessons.md).
 *   node tools/fpdojo-import/src/main.ts --dump <fpdojo.json> [--fixes <fixes.json>] [--out content/lessons]
 * fixes.json: [{ unit, lesson, exercise, answer?: number, choices?: { ko?: string[], en?: string[] }, drop?: true, note? }]
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { stringify } from "yaml";

interface Step {
  id: string;
  type: "Predict" | "Mcq";
  prompt: string;
  code: string;
  choices: string[];
  answer: string | null;
  feedback: Record<string, string>;
  tags: string[];
}
type Block = { kind: "prose"; id: string; markdown: string } | { kind: "exercise"; step: Step };
interface Lesson {
  id: string;
  unitId: string;
  title: string;
  tags: string[];
  blocks: Block[];
}
interface Unit {
  id: string;
  title: string;
  order: number;
  level: number;
  prerequisites: string[];
  lessons: Lesson[];
}
interface Fix {
  unit: string;
  lesson: string;
  exercise: string;
  answer?: number;
  choices?: { ko?: string[]; en?: string[] };
  prompt?: { ko?: string; en?: string };
  drop?: boolean;
  note?: string;
}

export const SKILL_OF_UNIT: Record<string, string> = {
  "u01-values": "gleam-basics",
  "u02-functions-pipes": "gleam-basics",
  "u03-case-branching": "gleam-basics",
  "u13-intentional-crash": "gleam-basics",
  "u14-gleam-omits": "gleam-basics",
  "u15-capstone": "gleam-basics",
  "u04-custom-types": "gleam-types",
  "u11-generics": "gleam-types",
  "u12-opaque-types": "gleam-types",
  "u05-lists-recursion": "gleam-lists-recursion",
  "u06-tail-recursion": "gleam-lists-recursion",
  "u07-functions-as-values": "gleam-lists-recursion",
  "u08-list-module": "gleam-lists-recursion",
  "u09-option-result": "explicit-failure",
  "u10-result-use": "explicit-failure",
};

const SOURCE = {
  kind: "original",
  upstream: "fpdojo (~/workspace/fp-training, same author), gleam 1.17 JS; re-verified on gleam 1.18.1 Erlang",
};

/** Comment-insensitive code comparison (overlays may only translate comments). */
export function codeOnly(src: string): string {
  return src
    .split("\n")
    .map((line) => {
      let inString = false;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"' && line[i - 1] !== "\\") inString = !inString;
        if (!inString && line[i] === "/" && line[i + 1] === "/") return line.slice(0, i).trimEnd();
      }
      return line.trimEnd();
    })
    .filter((l) => l.trim() !== "")
    .join("\n");
}

function feedbackOf(step: Step) {
  const choices: Record<number, string> = {};
  for (const [k, v] of Object.entries(step.feedback)) {
    const m = k.match(/^choice:(\d+)$/);
    if (m) choices[Number(m[1])] = v;
  }
  return { correct: step.feedback.correct ?? "", choices };
}

export function convert(dump: { ko: Unit[]; en: Unit[] }, fixes: Fix[]) {
  const files = new Map<string, string>();
  const warnings: string[] = [];
  const fixFor = (u: string, l: string, e: string) => fixes.find((f) => f.unit === u && f.lesson === l && f.exercise === e);
  const enUnits = new Map(dump.en.map((u) => [u.id, u]));
  for (const unit of dump.ko) {
    const en = enUnits.get(unit.id);
    if (!en) warnings.push(`no English unit for ${unit.id}`);
    const base = `${unit.id}`;
    files.set(
      `${base}/unit.yaml`,
      stringify({
        title: unit.title,
        order: unit.order,
        level: unit.level,
        skill: SKILL_OF_UNIT[unit.id] ?? "gleam-basics",
        prerequisites: unit.prerequisites,
        lessons: unit.lessons.map((l) => l.id),
        source: SOURCE,
      }),
    );
    if (en) files.set(`${base}/unit.en.yaml`, stringify({ title: en.title }));
    for (const lesson of unit.lessons) {
      const enLesson = en?.lessons.find((l) => l.id === lesson.id);
      if (en && !enLesson) warnings.push(`no English lesson ${lesson.id}`);
      const blocks: unknown[] = [];
      const overlay: Record<string, unknown> = {};
      for (const b of lesson.blocks) {
        const enBlock = enLesson?.blocks.find((x) => (x.kind === "prose" ? x.id : x.step.id) === (b.kind === "prose" ? b.id : b.step.id));
        if (b.kind === "prose") {
          blocks.push({ prose: b.id, markdown: b.markdown });
          if (enBlock?.kind === "prose") overlay[b.id] = { markdown: enBlock.markdown };
          continue;
        }
        const s = b.step;
        const fix = fixFor(unit.id, lesson.id, s.id);
        if (fix?.drop) {
          warnings.push(`dropped ${unit.id}/${lesson.id}/${s.id}: ${fix.note ?? ""}`);
          continue;
        }
        const answer = fix?.answer ?? Number(s.answer ?? "0");
        const choices = fix?.choices?.ko ?? s.choices;
        const block: Record<string, unknown> = {
          exercise: s.id,
          type: s.type === "Predict" ? "predict" : "choice",
          prompt: fix?.prompt?.ko ?? s.prompt,
        };
        if (s.code.trim()) block.code = s.code;
        Object.assign(block, { choices, answer, feedback: feedbackOf(s) });
        blocks.push(block);
        if (enBlock?.kind === "exercise") {
          const e = enBlock.step;
          if (Number(e.answer ?? "0") !== Number(s.answer ?? "0")) warnings.push(`answer index differs ko/en: ${lesson.id}/${s.id}`);
          if (codeOnly(e.code) !== codeOnly(s.code)) warnings.push(`code differs ko/en beyond comments: ${lesson.id}/${s.id}`);
          const ov: Record<string, unknown> = { prompt: fix?.prompt?.en ?? e.prompt, choices: fix?.choices?.en ?? e.choices, feedback: feedbackOf(e) };
          if (e.code.trim() && e.code !== s.code) ov.code = e.code;
          overlay[s.id] = ov;
        }
      }
      files.set(`${base}/${lesson.id}.yaml`, stringify({ title: lesson.title, tags: lesson.tags, blocks }, { lineWidth: 0 }));
      if (enLesson) files.set(`${base}/${lesson.id}.en.yaml`, stringify({ title: enLesson.title, blocks: overlay }, { lineWidth: 0 }));
    }
  }
  return { files, warnings };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("fpdojo-import/src/main.ts")) {
  const repo = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
  const { values } = parseArgs({ options: { dump: { type: "string" }, fixes: { type: "string" }, out: { type: "string", default: join(repo, "content/lessons") } } });
  if (!values.dump) {
    console.error("usage: --dump <fpdojo.json> [--fixes <fixes.json>] [--out content/lessons]");
    process.exit(2);
  }
  const dump = JSON.parse(readFileSync(values.dump, "utf8"));
  const fixes: Fix[] = values.fixes ? JSON.parse(readFileSync(values.fixes, "utf8")) : [];
  const { files, warnings } = convert(dump, fixes);
  rmSync(values.out, { recursive: true, force: true });
  for (const [rel, text] of files) {
    const p = join(values.out, rel);
    mkdirSync(join(p, ".."), { recursive: true });
    writeFileSync(p, text);
  }
  for (const w of warnings) console.warn(`! ${w}`);
  console.log(`wrote ${files.size} files to ${values.out}`);
}
