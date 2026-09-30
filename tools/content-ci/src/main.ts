#!/usr/bin/env node
/**
 * Content CI. Usage:
 *   node tools/content-ci/src/main.ts [--content <dir>] [--family <id>]... [--runner docker|local]
 *        [--image <tag>] [--template <dir>] [--jobs N] [--write-baselines] [--json]
 * Exit code 1 when any check fails.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { parseDocument } from "yaml";
import { InMemoryEventBus, runMigrations, silentLogger, systemClock, createPgliteDb } from "@fp/kernel";
import type { ExerciseId } from "@fp/kernel";
import { createContentModule, migrations as contentMigrations } from "@fp/content";
import { createDockerGleamRunner, createLocalGleamRunner } from "@fp/grading";
import { verifyExercise, type ExerciseCheck } from "./verify.ts";

const repoRoot = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const { values } = parseArgs({
  options: {
    content: { type: "string", default: join(repoRoot, "content") },
    family: { type: "string", multiple: true },
    runner: { type: "string", default: "docker" },
    image: { type: "string", default: process.env.FP_RUNNER_IMAGE ?? "fp-gleam-runner:1.18.1" },
    template: { type: "string", default: join(repoRoot, "modules/grading/runners/gleam/template") },
    jobs: { type: "string", default: "4" },
    "write-baselines": { type: "boolean", default: false },
    json: { type: "boolean", default: false },
  },
});

const contentDir = resolve(values.content);
const db = await createPgliteDb();
await runMigrations(db, "content", contentMigrations);
const content = createContentModule({ db, clock: systemClock, events: new InMemoryEventBus(silentLogger), logger: silentLogger });

const loaded = await content.admin.loadDirectory(contentDir);
if (!loaded.ok) {
  console.error(`content validation failed (${loaded.error.length} issues):`);
  for (const i of loaded.error) console.error(`  ${i.path}: ${i.message}`);
  process.exit(1);
}
const imported = await content.admin.importBundle(loaded.value);
if (!imported.ok) {
  console.error(`import failed: ${imported.error.message}`);
  process.exit(1);
}

const runner =
  values.runner === "local"
    ? createLocalGleamRunner({ templateDir: resolve(values.template) })
    : createDockerGleamRunner({ image: values.image });

const families = new Set(values.family ?? []);
const exercises = (await content.catalog.listExercises()).filter((e) => families.size === 0 || families.has(e.familyId));
const results: ExerciseCheck[] = [];
const queue = [...exercises];
const jobs = Math.max(1, Number(values.jobs) || 1);

await Promise.all(
  Array.from({ length: jobs }, async () => {
    for (let ex = queue.shift(); ex; ex = queue.shift()) {
      const id = ex.id as ExerciseId;
      const [detail, spec, reference] = await Promise.all([
        content.catalog.getExercise(id),
        content.catalog.getGradingSpec(id),
        content.catalog.getReferenceMaterial(id),
      ]);
      if (!detail || !spec || !reference) {
        results.push({ exerciseId: id, problems: ["missing detail/spec/reference after import"], durationMs: 0 });
        continue;
      }
      const r = await verifyExercise({ detail, spec, reference, runner, now: () => new Date().toISOString() });
      results.push(r);
      if (!values.json) console.log(`${r.problems.length ? "✗" : "✓"} ${id} (${r.durationMs}ms)${r.problems.map((p) => `\n    - ${p}`).join("")}`);
      if (values["write-baselines"] && r.referenceCost) {
        const file = join(contentDir, "exercises", detail.familyId, detail.variantKey, "exercise.yaml");
        const doc = parseDocument(readFileSync(file, "utf8"));
        doc.setIn(["performance", "referenceCost"], r.referenceCost);
        writeFileSync(file, doc.toString());
      }
    }
  }),
);

const failed = results.filter((r) => r.problems.length);
if (values.json) console.log(JSON.stringify({ checked: results.length, failed: failed.length, results }, null, 2));
else console.log(`\n${results.length - failed.length}/${results.length} exercises passed content CI`);
await db.close();
process.exit(failed.length ? 1 : 0);
