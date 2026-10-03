#!/usr/bin/env node
/**
 * Content CI. Usage:
 *   node tools/content-ci/src/main.ts [--content <dir>] [--family <id>]... [--runner docker|local]
 *        [--image <tag>] [--template <dir>] [--jobs N] [--write-baselines] [--json] [--lessons-only]
 *        [--recall-only] [--card <id>]...
 * The default run (no --family) also checks content/lessons (src/lessons.ts) and evaluates every content/recall card
 * in the sandbox (src/recall.ts); --lessons-only skips the grader; --recall-only skips the exercises (lessons are still
 * walked; they are cheap) and --card limits the recall check to those card ids.
 * Exit code 1 when any check fails.
 */
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { parseDocument } from "yaml";
import { InMemoryEventBus, runMigrations, silentLogger, systemClock, createPgliteDb } from "@fp/kernel";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type ExerciseId } from "@fp/kernel";
import { createContentModule, lessonTranslationGaps, migrations as contentMigrations, recallTranslationGaps } from "@fp/content";
import { createDockerGleamRunner, createGradingModule, createLocalGleamRunner, migrations as gradingMigrations } from "@fp/grading";
import { formatLessonSummary, verifyLessons, type LessonCheck } from "./lessons.ts";
import { formatRecallSummary, verifyRecall, type RecallCheck } from "./recall.ts";
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
    "lessons-only": { type: "boolean", default: false },
    "recall-only": { type: "boolean", default: false },
    card: { type: "string", multiple: true },
  },
});

const contentDir = resolve(values.content);
const TRANSLATED = SUPPORTED_LOCALES.filter((l) => l !== DEFAULT_LOCALE);
const families = new Set(values.family ?? []);
if (values["lessons-only"] && families.size > 0) {
  console.error("--lessons-only cannot be combined with --family (a --family run does not include content/lessons)");
  process.exit(2);
}
const cardIds = values.card?.length ? new Set(values.card) : undefined;
if (values["recall-only"] && (families.size > 0 || values["lessons-only"])) {
  console.error("--recall-only cannot be combined with --family or --lessons-only");
  process.exit(2);
}
if (cardIds && (families.size > 0 || values["lessons-only"])) {
  console.error("--card selects recall cards; it cannot be combined with --family or --lessons-only");
  process.exit(2);
}

/**
 * With --family, validate an isolated copy holding only the shared files and the selected families, so that
 * unfinished work in other families (e.g. parallel authors) cannot fail this run.
 */
function scopedContentDir(): { dir: string; cleanup: () => void } {
  if (families.size === 0) return { dir: contentDir, cleanup: () => {} };
  const tmp = mkdtempSync(join(tmpdir(), "fp-content-ci-"));
  const sharedFiles = readdirSync(contentDir).filter((n) => /^skills(\.[^.]+)?\.yaml$/.test(n));
  for (const shared of [...sharedFiles, "concepts", "theory", "LICENSES"]) {
    const from = join(contentDir, shared);
    if (existsSync(from)) cpSync(from, join(tmp, shared), { recursive: true });
  }
  for (const f of families) {
    const from = join(contentDir, "exercises", f);
    if (!existsSync(from)) {
      console.error(`unknown family: ${f}`);
      process.exit(2);
    }
    cpSync(from, join(tmp, "exercises", f), { recursive: true });
  }
  return { dir: tmp, cleanup: () => rmSync(tmp, { recursive: true, force: true }) };
}
const scoped = scopedContentDir();
const db = await createPgliteDb();
await runMigrations(db, "content", contentMigrations);
await runMigrations(db, "grading", gradingMigrations);
const content = createContentModule({ db, clock: systemClock, events: new InMemoryEventBus(silentLogger), logger: silentLogger });

const loaded = await content.admin.loadDirectory(scoped.dir);
if (!loaded.ok) {
  console.error(`content validation failed (${loaded.error.length} issues):`);
  for (const i of loaded.error) console.error(`  ${i.path}: ${i.message}`);
  scoped.cleanup();
  process.exit(1);
}
const imported = await content.admin.importBundle(loaded.value);
if (!imported.ok) {
  console.error(`import failed: ${imported.error.message}`);
  process.exit(1);
}

// Lessons: only in the default run (a --family run validates an isolated copy without content/lessons).
let lessonCheck: LessonCheck | null = null;
if (families.size === 0) {
  lessonCheck = await verifyLessons(content.catalog, SUPPORTED_LOCALES);
  if (!values.json) {
    console.log(`lessons: ${formatLessonSummary(lessonCheck.counts, TRANSLATED)}`);
    for (const p of lessonCheck.problems) console.log(`✗ lesson ${p}`);
    // Incomplete translations are served with Korean fallback: reported, not failed.
    for (const g of lessonTranslationGaps(loaded.value)) console.log(`  incomplete ${g.locale}: ${g.path}: ${g.missing.join("; ")}`);
  }
}
const lessonsFailed = (lessonCheck?.problems.length ?? 0) > 0;
if (values["lessons-only"]) {
  if (values.json) console.log(JSON.stringify({ lessons: lessonCheck, translationGaps: lessonTranslationGaps(loaded.value) }, null, 2));
  scoped.cleanup();
  await db.close();
  process.exit(lessonsFailed ? 1 : 0);
}

const runner =
  values.runner === "local"
    ? createLocalGleamRunner({ templateDir: resolve(values.template) })
    : createDockerGleamRunner({ image: values.image });

const jobs = Math.max(1, Number(values.jobs) || 1);

// Recall: only in the default run (a --family run validates an isolated copy without content/recall).
let recallCheck: RecallCheck | null = null;
if (families.size === 0) {
  const grading = createGradingModule({
    db,
    clock: systemClock,
    events: new InMemoryEventBus(silentLogger),
    logger: silentLogger,
    catalog: content.catalog,
    runner,
    concurrency: jobs,
  });
  recallCheck = await verifyRecall({
    catalog: content.catalog,
    evaluate: (req) => grading.service.evaluateSnippet(req),
    concurrency: jobs,
    ...(cardIds ? { cardIds } : {}),
    locales: SUPPORTED_LOCALES,
    onCard: (r) => {
      if (values.json) return;
      const where = `${r.deckId}/${r.cardId}`;
      console.log(`${r.problems.length ? "✗" : "✓"} recall ${where} (${r.snippets} snippets, ${r.jobs} jobs, ${r.durationMs}ms)${r.problems.map((p) => `\n    - ${p}`).join("")}`);
    },
  });
  if (!values.json) {
    for (const p of recallCheck.problems) console.log(`✗ recall ${p}`);
    for (const id of cardIds ?? []) if (!recallCheck.cards.some((c) => c.cardId === id)) console.log(`✗ recall ${id}: no such card`);
    for (const g of recallTranslationGaps(loaded.value)) console.log(`  incomplete ${g.locale}: ${g.path}: ${g.missing.join("; ")}`);
  }
}
const recallFailed =
  recallCheck !== null &&
  (recallCheck.problems.length > 0 ||
    recallCheck.cards.some((c) => c.problems.length > 0) ||
    [...(cardIds ?? [])].some((id) => !recallCheck?.cards.some((c) => c.cardId === id)));

const exercises = values["recall-only"]
  ? []
  : (await content.catalog.listExercises()).filter((e) => families.size === 0 || families.has(e.familyId));
const results: ExerciseCheck[] = [];
const queue = [...exercises];

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
      // Localized starters (comments translated) must compile and fail like the Korean starter.
      const localizedStarters = [];
      for (const locale of TRANSLATED) {
        const loc = await content.catalog.getExercise(id, locale);
        if (loc && JSON.stringify(loc.starterFiles) !== JSON.stringify(detail.starterFiles)) {
          localizedStarters.push({ locale, files: loc.starterFiles });
        }
      }
      const r = await verifyExercise({ detail, spec, reference, runner, now: () => new Date().toISOString(), localizedStarters });
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
if (values.json) {
  const lessons = lessonCheck ? { lessons: lessonCheck, translationGaps: lessonTranslationGaps(loaded.value) } : {};
  const recall = recallCheck ? { recall: recallCheck, recallTranslationGaps: recallTranslationGaps(loaded.value) } : {};
  console.log(JSON.stringify({ checked: results.length, failed: failed.length, results, ...lessons, ...recall }, null, 2));
} else {
  if (!values["recall-only"]) console.log(`\n${results.length - failed.length}/${results.length} exercises passed content CI`);
  if (lessonCheck) {
    const verdict = lessonsFailed ? `${lessonCheck.problems.length} lesson problem(s)` : "lessons passed content CI";
    console.log(`${formatLessonSummary(lessonCheck.counts, TRANSLATED)}: ${verdict}`);
  }
  if (recallCheck) {
    const listed = await content.catalog.listRecallCards();
    const complete = TRANSLATED.map((l) => `${l} ${listed.filter((c) => c.locales.includes(l)).length}/${listed.length}`);
    console.log(`${formatRecallSummary(recallCheck)}; fully translated cards: ${complete.join(", ")}${recallCheck.problems.length ? `; ${recallCheck.problems.length} catalog problem(s)` : ""}`);
  }
}
scoped.cleanup();
await db.close();
process.exit(failed.length || lessonsFailed || recallFailed ? 1 : 0);
