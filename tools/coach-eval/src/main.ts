#!/usr/bin/env node
/**
 * Coaching model evaluation.
 *   node tools/coach-eval/src/main.ts --models qwen3.8-flash,qwen3.8-max [--reps 1] [--thinking] [--out file.json]
 * Requires DASHSCOPE_API_KEY and the Docker runner image. Submits fixed learner answers to the sample coupon
 * exercise through the real grader, then asks each model for feedback and chat replies.
 */
import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { asId, createPgliteDb, InMemoryEventBus, runMigrations, silentLogger, systemClock } from "@fp/kernel";
import type { ExerciseId, Logger, SubmissionId, UserId } from "@fp/kernel";
import { createContentModule, migrations as contentMigrations } from "@fp/content";
import { createDockerGleamRunner, createGradingModule, migrations as gradingMigrations } from "@fp/grading";
import { createLearnerModule, migrations as learnerMigrations } from "@fp/learner";
import { createCoachingModule, migrations as coachingMigrations } from "@fp/coaching";
import { SCENARIOS, CHATS, automaticChecks } from "./scenarios.ts";

const repoRoot = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const { values } = parseArgs({
  options: {
    models: { type: "string", default: "qwen3.8-flash" },
    reps: { type: "string", default: "1" },
    thinking: { type: "boolean", default: false },
    concurrency: { type: "string", default: "6" },
    out: { type: "string", default: join(tmpdir(), "coach-eval.json") },
  },
});
const apiKey = process.env.DASHSCOPE_API_KEY;
if (!apiKey) {
  console.error("DASHSCOPE_API_KEY is not set");
  process.exit(2);
}

// Isolated content copy with only the sample family (other families may be mid-authoring).
const contentDir = mkdtempSync(join(tmpdir(), "coach-eval-content-"));
for (const shared of ["skills.yaml", "concepts", "theory", "LICENSES"]) {
  cpSync(join(repoRoot, "content", shared), join(contentDir, shared), { recursive: true });
}
cpSync(join(repoRoot, "content/exercises/orders-apply-coupon"), join(contentDir, "exercises/orders-apply-coupon"), { recursive: true });

const db = await createPgliteDb();
for (const [name, m] of [["content", contentMigrations], ["grading", gradingMigrations], ["learner", learnerMigrations], ["coaching", coachingMigrations]] as const) {
  await runMigrations(db, name, m);
}
const events = new InMemoryEventBus(silentLogger);
const content = createContentModule({ db, clock: systemClock, events, logger: silentLogger });
const loaded = await content.admin.loadDirectory(contentDir);
if (!loaded.ok) throw new Error(JSON.stringify(loaded.error.slice(0, 5)));
await content.admin.importBundle(loaded.value);
const exercise = (await content.catalog.listExercises({ familyId: "orders-apply-coupon" as never })).find((e) => e.variantKey === "base");
if (!exercise) throw new Error("orders-apply-coupon/base not found");
const exerciseId = exercise.id as ExerciseId;

const grading = createGradingModule({
  db, clock: systemClock, events, logger: silentLogger, catalog: content.catalog,
  runner: createDockerGleamRunner({ image: process.env.FP_RUNNER_IMAGE ?? "fp-gleam-runner:1.18.1" }),
});
const learner = createLearnerModule({ db, clock: systemClock, events, logger: silentLogger, catalog: content.catalog });
const userId = asId<UserId>("eval-user");

const submissions = new Map<string, SubmissionId>();
for (const s of SCENARIOS) {
  const r = await grading.service.submit({
    userId, exerciseId, code: s.code, idempotencyKey: `eval-${s.key}`,
    helpUsed: { maxHintLevel: 0, conceptNotesOpened: 0, theoryNotesOpened: 0, explanationViewed: false, coachMessages: 0 },
  });
  if (!r.ok) throw new Error(`submit ${s.key}: ${r.error.message}`);
  console.log(`graded ${s.key}: ${r.value.evaluation?.outcome}`);
  submissions.set(s.key, r.value.id);
}

interface Row {
  model: string; rep: number; kind: "feedback" | "chat"; scenario: string; source: string;
  latencyMs: number; output: unknown; warnings: string[]; checks: Record<string, boolean>;
}
const rows: Row[] = [];
const models = values.models.split(",").map((m) => m.trim()).filter(Boolean);
const reps = Math.max(1, Number(values.reps) || 1);

type Task = () => Promise<void>;
const tasks: Task[] = [];
for (const model of models) {
  for (let rep = 1; rep <= reps; rep++) {
    for (const s of SCENARIOS) {
      tasks.push(async () => {
        const warnings: string[] = [];
        const logger: Logger = { info: () => {}, warn: (m, f) => warnings.push(`${m} ${JSON.stringify(f ?? {})}`), error: (m, f) => warnings.push(`${m} ${JSON.stringify(f ?? {})}`) };
        const coaching = createCoachingModule({
          db, clock: systemClock, logger, catalog: content.catalog, grading: grading.service, learner: learner.model,
          llm: { provider: "dashscope", apiKey, model, enableThinking: values.thinking },
        });
        const t0 = performance.now();
        // A fresh submission per (model, rep) would change nothing in the prompt; cache is keyed by model, so reps
        // after the first would hit the cache. Clear it by using a per-rep suffix through a new submission.
        const sid = rep === 1 ? submissions.get(s.key)! : await resubmit(s.key, rep, model);
        const r = await coaching.service.feedback(sid, userId);
        const latencyMs = Math.round(performance.now() - t0);
        const output = r.ok ? r.value : r.error;
        rows.push({ model, rep, kind: "feedback", scenario: s.key, source: r.ok ? r.value.source : "error", latencyMs, output, warnings, checks: automaticChecks(JSON.stringify(output)) });
        console.log(`${model} rep${rep} feedback/${s.key}: ${r.ok ? r.value.source : "error"} ${latencyMs}ms`);
      });
    }
    for (const c of CHATS) {
      tasks.push(async () => {
        const warnings: string[] = [];
        const logger: Logger = { info: () => {}, warn: (m, f) => warnings.push(`${m} ${JSON.stringify(f ?? {})}`), error: (m, f) => warnings.push(`${m} ${JSON.stringify(f ?? {})}`) };
        const coaching = createCoachingModule({
          db, clock: systemClock, logger, catalog: content.catalog, grading: grading.service, learner: learner.model,
          llm: { provider: "dashscope", apiKey, model, enableThinking: values.thinking },
        });
        const t0 = performance.now();
        const sid = submissions.get(c.submission);
        const r = await coaching.service.chat({
          userId: asId<UserId>(`chat-${model}-${rep}-${c.key}`), exerciseId, code: SCENARIOS.find((s) => s.key === c.submission)!.code,
          ...(sid ? {} : {}), messages: [{ role: "user", content: c.question }],
        });
        const latencyMs = Math.round(performance.now() - t0);
        const output = r.ok ? r.value : r.error;
        rows.push({ model, rep, kind: "chat", scenario: c.key, source: r.ok ? r.value.source : "error", latencyMs, output, warnings, checks: automaticChecks(JSON.stringify(output)) });
        console.log(`${model} rep${rep} chat/${c.key}: ${r.ok ? r.value.source : "error"} ${latencyMs}ms`);
      });
    }
  }
}

async function resubmit(key: string, rep: number, model: string): Promise<SubmissionId> {
  const s = SCENARIOS.find((x) => x.key === key)!;
  const r = await grading.service.submit({
    userId, exerciseId, code: s.code, idempotencyKey: `eval-${key}-${model}-${rep}`,
    helpUsed: { maxHintLevel: 0, conceptNotesOpened: 0, theoryNotesOpened: 0, explanationViewed: false, coachMessages: 0 },
  });
  if (!r.ok) throw new Error(r.error.message);
  return r.value.id;
}

const limit = Math.max(1, Number(values.concurrency) || 1);
await Promise.all(Array.from({ length: limit }, async () => {
  for (let t = tasks.shift(); t; t = tasks.shift()) {
    try { await t(); } catch (e) { console.error("task failed", e); }
  }
}));

writeFileSync(values.out, JSON.stringify({ models, reps, thinking: values.thinking, rows }, null, 2));
console.log(`\nwrote ${rows.length} rows to ${values.out}\n`);
const summary = new Map<string, { n: number; llm: number; lat: number[]; leak: number; korean: number }>();
for (const r of rows) {
  const s = summary.get(r.model) ?? { n: 0, llm: 0, lat: [], leak: 0, korean: 0 };
  s.n++; if (r.source === "llm") s.llm++; s.lat.push(r.latencyMs);
  if (r.checks.leaksSolution) s.leak++; if (r.checks.mostlyKorean) s.korean++;
  summary.set(r.model, s);
}
console.log("model".padEnd(22), "llm/total", "p50ms", "maxms", "leaks", "korean");
for (const [m, s] of summary) {
  const sorted = [...s.lat].sort((a, b) => a - b);
  console.log(m.padEnd(22), `${s.llm}/${s.n}`.padEnd(9), String(sorted[Math.floor(sorted.length / 2)]).padEnd(5), String(sorted.at(-1)).padEnd(5), String(s.leak).padEnd(5), `${s.korean}/${s.n}`);
}
rmSync(contentDir, { recursive: true, force: true });
await db.close();
