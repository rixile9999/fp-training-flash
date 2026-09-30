import {
  asId,
  runMigrations,
  silentLogger,
  type Db,
  type DomainEvent,
  type EventBus,
  type ExerciseId,
} from "@fp/kernel";
import { createFixedClock, createTestDb, type MutableClock } from "@fp/kernel/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CONTENT_EVENTS, type BundleImportedPayload } from "../src/contract/index.ts";
import { createContentModule, migrations, type ContentModule } from "../src/index.ts";
import { baseFiles, cleanupTrees, REPO_CONTENT_DIR, without, writeTree, type Files } from "./fixtures.ts";

/** Records published events; stands in for the kernel bus. */
function recordingBus(): EventBus & { readonly events: DomainEvent[] } {
  const events: DomainEvent[] = [];
  return {
    events,
    publish: async (e) => {
      events.push(e);
    },
    subscribe: () => () => {},
  };
}

let db: Db;
let clock: MutableClock;
let bus: ReturnType<typeof recordingBus>;
let content: ContentModule;

beforeEach(async () => {
  db = await createTestDb();
  await runMigrations(db, "content", migrations);
  clock = createFixedClock("2026-09-30T09:00:00.000Z");
  bus = recordingBus();
  content = createContentModule({ db, clock, events: bus, logger: silentLogger });
});

afterEach(async () => {
  await db.close();
  await cleanupTrees();
});

async function importDir(dir: string) {
  const loaded = await content.admin.loadDirectory(dir);
  if (!loaded.ok) throw new Error(JSON.stringify(loaded.error, null, 2));
  const imported = await content.admin.importBundle(loaded.value);
  if (!imported.ok) throw new Error(imported.error.message);
  return imported.value;
}

async function importFiles(files: Files, dir?: string) {
  return importDir(await writeTree(files, dir));
}

const id = (s: string) => asId<ExerciseId>(s);

describe("importing the repository /content", () => {
  it("imports the real content and serves it through the catalog", async () => {
    const info = await importDir(REPO_CONTENT_DIR);
    expect(info.exerciseCount).toBeGreaterThanOrEqual(1);
    expect(info.importedAt).toBe("2026-09-30T09:00:00.000Z");

    const list = await content.catalog.listExercises();
    const coupon = list.find((e) => e.familyId === "orders-apply-coupon");
    expect(coupon).toMatchObject({ id: "orders-apply-coupon/base@1", version: 1, language: "gleam", kind: "implement" });

    const detail = await content.catalog.getExercise(id("orders-apply-coupon/base@1"));
    expect(detail?.publicTests.map((t) => t.id)).toEqual(["empty_list_test", "discounts_pending_test", "keeps_other_orders_test"]);
    const serialized = JSON.stringify(detail);
    for (const secret of ["keeps_order_test", "rounds_down_test", "fn discount(", "list.filter(fn(o)"]) {
      expect(serialized).not.toContain(secret);
    }

    const spec = await content.catalog.getGradingSpec(id("orders-apply-coupon/base@1"));
    expect(spec?.testFiles.map((f) => f.path)).toEqual(["test/coupon_test.gleam"]);
    expect(spec?.tests.filter((t) => t.visibility === "hidden").map((t) => t.id)).toEqual(["keeps_order_test", "rounds_down_test"]);
    expect(spec?.rubric.find((r) => r.id === "R-09")?.automatedCheck?.kind).toBe("forbid_pattern");

    const ref = await content.catalog.getReferenceMaterial(id("orders-apply-coupon/base@1"));
    expect(ref?.solutionFiles[0]?.content).toContain("fn discount(");
    expect(ref?.wrongSolutions.map((w) => w.key)).toEqual(["filter-drops"]);

    const skills = await content.catalog.listSkills();
    expect(skills[0]?.id).toBe("data-transformation");
    expect(skills.map((s) => s.order)).toEqual([...skills.map((s) => s.order)].sort((a, b) => a - b));
    const notes = await content.catalog.getConceptNotes(detail?.conceptNoteIds ?? []);
    expect(notes.map((n) => n.id)).toEqual(["gleam-list-transform", "gleam-record-update"]);
    const topics = await content.catalog.getTheoryTopics(detail?.theoryTopicIds ?? []);
    expect(topics.map((t) => t.id)).toEqual(["functor-structure-preservation", "algebraic-data-types"]);

    expect(bus.events).toHaveLength(1);
    expect(bus.events[0]?.type).toBe(CONTENT_EVENTS.bundleImported);
    expect((bus.events[0]?.payload as BundleImportedPayload).exerciseIds).toContain("orders-apply-coupon/base@1");
  });
});

describe("importBundle", () => {
  it("is idempotent for the current bundle hash", async () => {
    const dir = await writeTree(baseFiles());
    const first = await importDir(dir);
    clock.advance(60_000);
    const second = await importDir(dir);
    expect(second).toEqual(first);
    expect(bus.events).toHaveLength(1);
    expect(await content.catalog.currentBundle()).toEqual(first);
  });

  it("keeps the version of unchanged variants and bumps changed ones", async () => {
    const files = baseFiles();
    const dir = await writeTree(files);
    await importDir(dir);
    expect((await content.catalog.listExercises()).map((e) => e.id)).toEqual(["predict-map/base@1", "sum-list/base@1"]);

    clock.advance(60_000);
    const changedPrompt = "정수 목록의 합을 구하세요. (개정)\n";
    const info = await importFiles({ ...files, "exercises/sum-list/base/prompt.md": changedPrompt }, dir);
    expect(info.importedAt).toBe("2026-09-30T09:01:00.000Z");
    expect((await content.catalog.listExercises()).map((e) => e.id)).toEqual(["predict-map/base@1", "sum-list/base@2"]);

    // The old version stays readable by id with its original content.
    expect((await content.catalog.getExercise(id("sum-list/base@1")))?.promptMarkdown).toBe("정수 목록의 합을 구하세요.\n");
    expect((await content.catalog.getExercise(id("sum-list/base@2")))?.promptMarkdown).toBe(changedPrompt);
    expect((await content.catalog.getGradingSpec(id("sum-list/base@1")))?.exerciseId).toBe("sum-list/base@1");

    const payload = bus.events[1]?.payload as BundleImportedPayload;
    expect(payload.exerciseIds).toEqual(["predict-map/base@1", "sum-list/base@2"]);
    expect(payload.contentHash).toBe(info.contentHash);
  });

  it("retires removed variants: not listed, still readable, restored when they come back", async () => {
    const files = baseFiles();
    const dir = await writeTree(files);
    await importDir(dir);
    await importFiles(without(files, "exercises/predict-map/"), dir);

    expect((await content.catalog.listExercises()).map((e) => e.id)).toEqual(["sum-list/base@1"]);
    expect((await content.catalog.getExercise(id("predict-map/base@1")))?.predict?.acceptedAnswers).toEqual(["[2, 4]"]);
    expect((await content.catalog.currentBundle())?.exerciseCount).toBe(1);

    await importFiles(files, dir);
    expect((await content.catalog.listExercises()).map((e) => e.id)).toEqual(["predict-map/base@1", "sum-list/base@1"]);
  });

  it("re-importing an older bundle after a newer one makes its content current again", async () => {
    const files = baseFiles();
    const dir = await writeTree(files);
    const a = await importDir(dir);
    await importFiles({ ...files, "exercises/sum-list/base/prompt.md": "다른 문장\n" }, dir);
    const again = await importFiles(files, dir);
    expect(again.contentHash).toBe(a.contentHash);
    const sum = (await content.catalog.listExercises({ familyId: asId("sum-list") }))[0];
    expect(sum?.version).toBe(3);
    expect((await content.catalog.getExercise(sum?.id ?? id("")))?.promptMarkdown).toBe("정수 목록의 합을 구하세요.\n");
    expect(bus.events).toHaveLength(3);
  });

  it("retires removed skills and notes but keeps them readable by id", async () => {
    const files = baseFiles();
    const dir = await writeTree(files);
    await importDir(dir);
    const reduced = without(without(files, "theory/"), "exercises/sum-list/");
    reduced["skills.yaml"] = `skills:
  - { id: data-transformation, name: 데이터 변환, track: core, order: 1, description: 변환, prerequisites: [] }
  - { id: recursive-algorithms, name: 재귀, track: algorithm, order: 2, description: 재귀, prerequisites: [] }
`;
    reduced["concepts/list-fold.md"] = (files["concepts/list-fold.md"] ?? "").replace("fold 설명.", "고친 설명.");
    await importFiles(reduced, dir);

    expect(await content.catalog.listTheoryTopics()).toEqual([]);
    expect((await content.catalog.getTheoryTopics([asId("folds")]))[0]?.furtherReading[0]?.verified).toBe(false);
    expect((await content.catalog.getConceptNotes([asId("list-fold")]))[0]?.markdown).toBe("고친 설명.\n");
    expect((await content.catalog.getSkill(asId("recursive-algorithms")))?.prerequisites).toEqual([]);
    expect(await content.catalog.getSkill(asId("nope"))).toBeNull();
  });

  it("filters the listing by skill, kind, format and family", async () => {
    await importFiles(baseFiles());
    const ids = async (f: Parameters<ContentModule["catalog"]["listExercises"]>[0]) =>
      (await content.catalog.listExercises(f)).map((e) => e.id);
    expect(await ids({ skill: asId("recursive-algorithms") })).toEqual(["predict-map/base@1"]);
    expect(await ids({ kind: "implement" })).toEqual(["sum-list/base@1"]);
    expect(await ids({ format: "challenge" })).toEqual([]);
    expect(await ids({ language: "gleam", familyId: asId("sum-list") })).toEqual(["sum-list/base@1"]);
  });

  it("never exposes hidden tests, solutions or explanations in the learner view", async () => {
    await importFiles(baseFiles());
    const detail = await content.catalog.getExercise(id("sum-list/base@1"));
    expect(detail?.publicTests.map((t) => t.id)).toEqual(["adds_numbers_test", "empty_is_zero_test"]);
    expect(detail?.starterFiles.map((f) => f.path)).toEqual(["src/sums.gleam", "src/num_types.gleam"]);
    const serialized = JSON.stringify(detail);
    for (const secret of ["big_numbers_test", "3_000_000", "SECRET_SOLUTION", "SECRET_EXPLANATION", "always-zero", "overflow"]) {
      expect(serialized).not.toContain(secret);
    }
    const spec = await content.catalog.getGradingSpec(id("sum-list/base@1"));
    expect(spec?.tests.map((t) => t.id)).toContain("big_numbers_test");
    expect(spec?.performance?.referenceCost).toEqual([120, 9000]);
    const ref = await content.catalog.getReferenceMaterial(id("sum-list/base@1"));
    expect(ref?.explanationMarkdown).toContain("SECRET_EXPLANATION");
    expect(await content.catalog.getExercise(id("sum-list/base@9"))).toBeNull();
  });

  it("rolls back the whole import when a write fails and publishes nothing", async () => {
    const failing: Db = {
      ...db,
      transaction: (fn) =>
        db.transaction((tx) =>
          fn({
            ...tx,
            query: async (sql, params) => {
              if (sql.includes("insert into content.bundles")) throw new Error("disk full");
              return tx.query(sql, params);
            },
          }),
        ),
    };
    const broken = createContentModule({ db: failing, clock, events: bus, logger: silentLogger });
    const loaded = await broken.admin.loadDirectory(await writeTree(baseFiles()));
    if (!loaded.ok) throw new Error("load failed");
    await expect(broken.admin.importBundle(loaded.value)).rejects.toThrow("disk full");
    expect(await content.catalog.listExercises()).toEqual([]);
    expect(await content.catalog.listSkills()).toEqual([]);
    expect(bus.events).toEqual([]);
  });

  it("rejects bundles that were not produced by loadDirectory", async () => {
    const r = await content.admin.importBundle({ bundleId: "x", contentHash: "y" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("invalid_input");
    expect(await content.catalog.currentBundle()).toBeNull();
  });
});
