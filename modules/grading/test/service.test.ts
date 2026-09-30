import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { asId, InMemoryEventBus, runMigrations, silentLogger } from "@fp/kernel";
import type { Db, DomainEvent, ExerciseId, SessionId, UserId } from "@fp/kernel";
import { createFixedClock, createTestDb } from "@fp/kernel/testing";
import { createGradingModule, migrations } from "../src/index.ts";
import { GRADING_EVENTS } from "../src/contract/index.ts";
import type { GradingService, RunJob, RunOutput, SubmissionEvaluatedPayload } from "../src/contract/index.ts";
import { createJobQueue } from "../src/service/queue.ts";
import { completed, couponSpec, EXERCISE_ID, fakeCatalog, fakeRunner, fixture, NO_HELP, USER, type FakeRunner } from "./helpers.ts";

const PREDICT_ID = asId<ExerciseId>("predict-map/base@1");
const predictSpec = couponSpec({
  exerciseId: PREDICT_ID,
  kind: "predict",
  tests: [],
  requirements: [],
  predict: { code: "list.map([1, 2], fn(x) { x * 2 })", acceptedAnswers: ["[2, 4]"] },
});
const rubricSpec = couponSpec({
  rubric: [{ id: "R-01", title: "filter", description: "", automatedCheck: { kind: "forbid_pattern", pattern: "list\\.filter", message: "filter 금지" } }],
});

let db: Db;
let events: DomainEvent<string, SubmissionEvaluatedPayload>[];
let bus: InMemoryEventBus;
const clock = createFixedClock();

async function setup(runner: FakeRunner, concurrency = 2): Promise<GradingService> {
  const catalog = fakeCatalog([rubricSpec, predictSpec]);
  return createGradingModule({ db, clock, events: bus, logger: silentLogger, catalog, runner, concurrency }).service;
}

const submitReq = (code: string, key: string, extra: object = {}) => ({
  userId: USER,
  exerciseId: EXERCISE_ID,
  code,
  idempotencyKey: key,
  helpUsed: NO_HELP,
  ...extra,
});

beforeEach(async () => {
  db = await createTestDb();
  await runMigrations(db, "grading", migrations);
  bus = new InMemoryEventBus(silentLogger);
  events = [];
  bus.subscribe<DomainEvent<string, SubmissionEvaluatedPayload>>(GRADING_EVENTS.submissionEvaluated, async (e) => {
    events.push(e);
  });
});
afterEach(async () => {
  await db.close();
});

describe("submit", () => {
  it("evaluates, stores and publishes after commit", async () => {
    const runner = fakeRunner((job) => completed(job, { keeps_other_orders_test: "failed" }));
    const service = await setup(runner);
    let storedWhenPublished: unknown;
    bus.subscribe(GRADING_EVENTS.submissionEvaluated, async () => {
      storedWhenPublished = (await db.query<{ status: string }>("select status from grading.submissions")).rows[0]?.status;
    });
    const session = asId<SessionId>("s-1");
    const r = await service.submit(submitReq(fixture("wrong-filter-drops.gleam"), "k1", { sessionId: session }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const s = r.value;
    expect(s).toMatchObject({ userId: USER, exerciseId: EXERCISE_ID, sessionId: session, attemptNo: 1, status: "completed" });
    expect(s.evaluation).toMatchObject({ outcome: "failed_tests", correctness: false, errorTags: ["drops_items_with_filter"] });
    expect(s.evaluation?.rubricChecks).toEqual([{ rubricId: "R-01", status: "flagged", message: "filter 금지" }]);
    expect(runner.jobs[0]?.testFunctions).toHaveLength(5);
    expect(runner.jobs[0]?.sourceFiles).toEqual([{ path: "src/coupon.gleam", content: fixture("wrong-filter-drops.gleam") }]);
    expect(storedWhenPublished).toBe("completed");
    expect(events).toHaveLength(1);
    expect(events[0]?.payload).toEqual({
      submissionId: s.id,
      userId: USER,
      exerciseId: EXERCISE_ID,
      sessionId: session,
      attemptNo: 1,
      outcome: "failed_tests",
      correctness: false,
      efficiency: null,
      errorTags: ["drops_items_with_filter"],
      helpUsed: NO_HELP,
      evaluatedAt: clock.now().toISOString(),
    });
    expect(await service.getSubmission(s.id, USER)).toEqual(s);
    expect(await service.getSubmission(s.id, asId<UserId>("someone-else"))).toBeNull();
  });

  it("is idempotent per (user, key), sequentially and concurrently", async () => {
    const runner = fakeRunner();
    const service = await setup(runner);
    const [a, b] = await Promise.all([
      service.submit(submitReq(fixture("reference.gleam"), "same")),
      service.submit(submitReq(fixture("reference.gleam"), "same")),
    ]);
    const c = await service.submit(submitReq("different code is ignored", "same"));
    expect(a.ok && b.ok && c.ok).toBe(true);
    if (!a.ok || !b.ok || !c.ok) return;
    expect(b.value.id).toBe(a.value.id);
    expect(c.value).toEqual(a.value);
    expect(runner.jobs).toHaveLength(1);
    expect(events).toHaveLength(1);
    // Same key from another user is a different submission.
    const other = await service.submit({ ...submitReq(fixture("reference.gleam"), "same"), userId: asId<UserId>("user-2") });
    expect(other.ok && other.value.id).not.toBe(a.value.id);
  });

  it("returns the stored submission when another process inserted the same key first", async () => {
    const service = await setup(fakeRunner());
    // Simulate the other process: a row with the key exists but is still running.
    await db.query(
      `insert into grading.submissions (id, user_id, exercise_id, idempotency_key, attempt_no, code, help_used, status, created_at)
       values ('other', $1, $2, 'k', 1, 'x', $3::jsonb, 'running', now())`,
      [USER, EXERCISE_ID, JSON.stringify(NO_HELP)],
    );
    const r = await service.submit(submitReq(fixture("reference.gleam"), "k"));
    expect(r.ok && r.value).toMatchObject({ id: "other", status: "running" });
  });

  it("numbers attempts per (user, exercise) and skips system errors", async () => {
    let fail = false;
    const service = await setup(fakeRunner((job) => (fail ? { kind: "system_error", message: "docker down" } : completed(job))));
    const first = await service.submit(submitReq(fixture("reference.gleam"), "1"));
    fail = true;
    const broken = await service.submit(submitReq(fixture("reference.gleam"), "2"));
    fail = false;
    const third = await service.submit(submitReq(fixture("reference.gleam"), "3"));
    const predict = await service.submit({ ...submitReq("[2, 4]", "4"), exerciseId: PREDICT_ID });
    expect([first, broken, third, predict].map((r) => r.ok && r.value.attemptNo)).toEqual([1, 2, 2, 1]);
    expect(broken.ok && broken.value.evaluation?.outcome).toBe("system_error");
    const flagged = await db.query<{ system_error: boolean }>("select system_error from grading.submissions order by attempt_no, created_at");
    expect(flagged.rows.filter((r) => r.system_error)).toHaveLength(1);
    // The event still goes out, with outcome system_error (consumers ignore it).
    expect(events.map((e) => e.payload.outcome)).toEqual(["passed", "system_error", "passed", "passed"]);
    const list = await service.listSubmissions(USER, EXERCISE_ID);
    expect(list).toHaveLength(3);
    expect(await service.listSubmissions(USER)).toHaveLength(4);
  });

  it("stores a runner exception as system_error", async () => {
    const service = await setup(
      fakeRunner(() => {
        throw new Error("boom");
      }),
    );
    const r = await service.submit(submitReq(fixture("reference.gleam"), "x"));
    expect(r.ok && r.value.evaluation).toMatchObject({ outcome: "system_error", correctness: false });
  });

  it("rejects @external without running the code", async () => {
    const runner = fakeRunner();
    const service = await setup(runner);
    const r = await service.submit(submitReq(fixture("external.gleam"), "ext"));
    expect(r.ok && r.value.evaluation?.outcome).toBe("rejected");
    expect(r.ok && r.value.evaluation?.rejectionReasons?.[0]).toContain("@external");
    expect(runner.jobs).toHaveLength(0);
    expect(events[0]?.payload.outcome).toBe("rejected");
  });

  it("grades predict exercises by normalized answer without a runner", async () => {
    const runner = fakeRunner();
    const service = await setup(runner);
    const good = await service.submit({ ...submitReq("  [2,   4]\n", "p1"), exerciseId: PREDICT_ID });
    const bad = await service.submit({ ...submitReq("[4, 2]", "p2"), exerciseId: PREDICT_ID });
    expect(good.ok && good.value).toMatchObject({ code: "  [2,   4]\n", evaluation: { outcome: "passed", correctness: true } });
    expect(bad.ok && bad.value.evaluation?.outcome).toBe("failed_tests");
    expect(runner.jobs).toHaveLength(0);
  });

  it("reports efficiency from the performance verdict", async () => {
    const perfSpec = couponSpec({ performance: { sizes: [10], perfModule: "coupon_perf", maxCostRatio: 2, referenceCost: [100] } });
    const runner = fakeRunner((job): RunOutput => ({ ...(completed(job) as RunOutput & { kind: "completed" }), performance: [{ size: 10, cost: 500, status: "ok" }] }));
    const service = createGradingModule({ db, clock, events: bus, logger: silentLogger, catalog: fakeCatalog([perfSpec]), runner }).service;
    const r = await service.submit(submitReq(fixture("quadratic.gleam"), "perf"));
    expect(r.ok && r.value.evaluation?.outcome).toBe("too_slow");
    expect(events[0]?.payload).toMatchObject({ outcome: "too_slow", correctness: true, efficiency: "too_slow" });
  });

  it("fails with not_found / invalid_input for unknown exercises and bad requests", async () => {
    const service = await setup(fakeRunner());
    const missing = await service.submit({ ...submitReq("x", "m"), exerciseId: asId<ExerciseId>("nope@1") });
    expect(!missing.ok && missing.error.code).toBe("not_found");
    const noKey = await service.submit(submitReq("x", ""));
    expect(!noKey.ok && noKey.error.code).toBe("invalid_input");
    expect(events).toHaveLength(0);
  });
});

describe("trialRun", () => {
  it("runs public tests only, stores nothing and publishes nothing", async () => {
    const runner = fakeRunner((job) => completed(job, { keeps_other_orders_test: "failed" }));
    const service = await setup(runner);
    const r = await service.trialRun({ exerciseId: EXERCISE_ID, code: fixture("wrong-filter-drops.gleam") });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.outcome).toBe("failed_tests");
    expect(r.value.tests.map((t) => t.id)).toEqual(["T1", "T2", "T3"]);
    expect(runner.jobs[0]?.testFunctions.some((t) => t.includes("keeps_order_test"))).toBe(false);
    expect(runner.jobs[0]?.performance).toBeUndefined();
    expect((await db.query("select * from grading.submissions")).rows).toHaveLength(0);
    expect(events).toHaveLength(0);
  });

  it("rejects statically, refuses predict exercises and maps system errors to unavailable", async () => {
    const service = await setup(fakeRunner(() => ({ kind: "system_error", message: "down" })));
    const rejected = await service.trialRun({ exerciseId: EXERCISE_ID, code: `import fp_internal/harness\n${fixture("reference.gleam")}` });
    expect(rejected.ok && rejected.value.outcome).toBe("rejected");
    const predict = await service.trialRun({ exerciseId: PREDICT_ID, code: "[2, 4]" });
    expect(!predict.ok && predict.error.code).toBe("invalid_input");
    const down = await service.trialRun({ exerciseId: EXERCISE_ID, code: fixture("reference.gleam") });
    expect(!down.ok && down.error.code).toBe("unavailable");
  });
});

describe("job queue", () => {
  it("never runs more than `concurrency` runner jobs at once", async () => {
    let running = 0;
    let peak = 0;
    const runner = fakeRunner(async (job: RunJob) => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 10));
      running--;
      return completed(job);
    });
    const service = await setup(runner, 2);
    const results = await Promise.all(
      Array.from({ length: 6 }, (_, i) => service.submit(submitReq(fixture("reference.gleam"), `q${i}`))),
    );
    expect(results.every((r) => r.ok)).toBe(true);
    expect(peak).toBe(2);
    expect(runner.jobs).toHaveLength(6);
  });

  it("hands slots over in FIFO order", async () => {
    const q = createJobQueue(1);
    const order: number[] = [];
    await Promise.all([1, 2, 3].map((n) => q.run(async () => void order.push(n))));
    expect(order).toEqual([1, 2, 3]);
    expect(q.active).toBe(0);
  });
});

describe("recoverInterrupted", () => {
  it("completes submissions left running by a crashed process as system errors", async () => {
    const catalog = fakeCatalog([rubricSpec, predictSpec]);
    // First "process": the runner never answers, as if the server died mid-evaluation.
    const hanging = fakeRunner(() => new Promise<RunOutput>(() => {}));
    const crashed = createGradingModule({ db, clock, events: bus, logger: silentLogger, catalog, runner: hanging });
    void crashed.service.submit(submitReq(fixture("wrong-filter-drops.gleam"), "k-crash"));
    await new Promise((r) => setTimeout(r, 50));
    const [running] = await crashed.service.listSubmissions(USER);
    expect(running?.status).toBe("running");

    // Second "process" starts on the same database.
    const restarted = createGradingModule({ db, clock, events: bus, logger: silentLogger, catalog, runner: fakeRunner() });
    expect(await restarted.recoverInterrupted()).toBe(1);
    const recovered = await restarted.service.getSubmission(running!.id, USER);
    expect(recovered?.status).toBe("completed");
    expect(recovered?.evaluation?.outcome).toBe("system_error");
    expect(events.map((e) => e.payload.outcome)).toEqual(["system_error"]);
    expect(await restarted.recoverInterrupted()).toBe(0);

    // A system error does not use up the learner's first attempt.
    const next = await restarted.service.submit(submitReq(fixture("wrong-filter-drops.gleam"), "k-after"));
    expect(next.ok && next.value.attemptNo).toBe(1);
  });
});
