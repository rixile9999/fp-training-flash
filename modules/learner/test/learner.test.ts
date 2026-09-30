import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { asId, runMigrations, silentLogger, type Db, type SubmissionId, type UserId } from "@fp/kernel";
import { DAY_MS, createFixedClock, createTestDb, type MutableClock } from "@fp/kernel/testing";
import type { SubmissionEvaluatedPayload } from "@fp/grading/contract";
import { createLearnerModule, migrations } from "../src/index.ts";
import type { LearnerModel, RatingUpdatedPayload } from "../src/contract/index.ts";
import {
  EX_ALGO,
  EX_CORE,
  EX_CORE_2,
  NO_HELP,
  SKILL_ALGO,
  SKILL_CORE,
  SKILL_UNSEEN,
  USER,
  evaluated,
  evaluatedEvent,
  fakeCatalog,
  recordingBus,
  type FakeCatalog,
} from "./fakes.ts";

const T0 = Date.parse("2026-09-01T10:00:00.000Z");
const day = (n: number) => new Date(T0 + n * DAY_MS).toISOString();

let db: Db;
let clock: MutableClock;
let bus: ReturnType<typeof recordingBus>;
let catalog: FakeCatalog;
let model: LearnerModel;

beforeEach(async () => {
  db = await createTestDb();
  await runMigrations(db, "learner", migrations);
  clock = createFixedClock("2026-09-30T00:00:00.000Z");
  bus = recordingBus();
  catalog = fakeCatalog();
  model = createLearnerModule({ db, clock, events: bus, logger: silentLogger, catalog }).model;
});

afterEach(async () => {
  await db.close();
});

async function submit(overrides: Partial<SubmissionEvaluatedPayload> = {}): Promise<SubmissionEvaluatedPayload> {
  const payload = evaluated(overrides);
  await bus.publish(evaluatedEvent(payload));
  return payload;
}

const ratingEvents = () =>
  bus.published.filter((e) => e.type === "learner.rating_updated").map((e) => e.payload as RatingUpdatedPayload);

async function estimate(skillId = SKILL_CORE, userId: UserId = USER) {
  const profile = await model.getProfile(userId, "gleam");
  const found = profile.estimates.find((e) => e.skillId === skillId);
  if (!found) throw new Error("estimate missing");
  return found;
}

describe("rated observations", () => {
  it("updates Elo, records the change and publishes learner.rating_updated", async () => {
    const p = await submit({ evaluatedAt: day(0) });
    const change = await model.ratingChangeFor(p.submissionId);
    expect(change).toEqual({ skillId: SKILL_CORE, before: 1200, after: 1240, provisional: true });
    expect(ratingEvents()).toEqual([{ userId: USER, submissionId: p.submissionId, change }]);

    const e = await estimate();
    expect(e).toMatchObject({ rating: 1240, ratedObservations: 1, deviation: 247, provisional: true });
    expect(e.lastIndependentSuccessAt).toBe(day(0));
    expect(e.updatedAt).toBe(day(0));
  });

  it("uses K from the number of prior rated observations and leaves provisional after 5", async () => {
    let rating = 1200;
    for (let i = 0; i < 6; i++) {
      const p = await submit({ exerciseId: EX_CORE_2, correctness: i % 2 === 0, evaluatedAt: day(i) });
      const k = Math.max(20, 80 / (1 + i / 3));
      const expected = 1 / (1 + 10 ** ((1300 - rating) / 400));
      const next = rating + k * ((i % 2 === 0 ? 1 : 0) - expected);
      const change = await model.ratingChangeFor(p.submissionId);
      expect(change?.before).toBeCloseTo(rating, 9);
      expect(change?.after).toBeCloseTo(next, 9);
      expect(change?.provisional).toBe(i + 1 < 5);
      rating = next;
    }
    const e = await estimate();
    expect(e.ratedObservations).toBe(6);
    expect(e.provisional).toBe(false);
    expect(e.deviation).toBe(Math.round(350 / Math.sqrt(7)));
    expect(e.rating).toBeCloseTo(rating, 9);
  });

  it("does not change ratings for unrated observations", async () => {
    const unrated = [
      await submit({ attemptNo: 2 }),
      await submit({ helpUsed: { ...NO_HELP, maxHintLevel: 3 } }),
      await submit({ helpUsed: { ...NO_HELP, explanationViewed: true } }),
    ];
    for (const p of unrated) expect(await model.ratingChangeFor(p.submissionId)).toBeNull();
    expect(ratingEvents()).toEqual([]);
    expect(await estimate()).toMatchObject({ rating: 1200, ratedObservations: 0, provisional: true });
    expect(await model.dueReviews(USER, "gleam", new Date(day(100)))).toEqual([]);

    const hinted = await submit({ helpUsed: { ...NO_HELP, maxHintLevel: 2 } });
    expect(await model.ratingChangeFor(hinted.submissionId)).not.toBeNull();
  });

  it("counts a too_slow correct answer as failure on the algorithm track", async () => {
    const p = await submit({ exerciseId: EX_ALGO, outcome: "too_slow", correctness: true, efficiency: "too_slow" });
    const change = await model.ratingChangeFor(p.submissionId);
    expect(change?.skillId).toBe(SKILL_ALGO);
    expect(change!.after).toBeLessThan(change!.before);
    expect(await model.dueReviews(USER, "gleam", new Date(day(100)))).toEqual([]);

    const fast = await submit({ exerciseId: EX_ALGO, efficiency: "ok", evaluatedAt: day(1) });
    const up = await model.ratingChangeFor(fast.submissionId);
    expect(up!.after).toBeGreaterThan(up!.before);
  });

  it("ignores system errors entirely", async () => {
    const p = await submit({ outcome: "system_error", correctness: false, errorTags: ["x"] });
    expect(await model.ratingChangeFor(p.submissionId)).toBeNull();
    const profile = await model.getProfile(USER, "gleam");
    expect(profile.errorTags).toEqual([]);
    expect(await db.query("select * from learner.observations")).toMatchObject({ rows: [] });
  });

  it("is idempotent per submissionId", async () => {
    const p = evaluated({ errorTags: ["wrong_order"], correctness: false });
    await bus.publish(evaluatedEvent(p));
    await bus.publish(evaluatedEvent(p));
    await bus.publish(evaluatedEvent({ ...p, correctness: true }));
    const e = await estimate();
    expect(e.ratedObservations).toBe(1);
    expect(e.rating).toBe(1160);
    expect(ratingEvents()).toHaveLength(1);
    const profile = await model.getProfile(USER, "gleam");
    expect(profile.errorTags.map((t) => [t.tag, t.count])).toEqual([["wrong_order", 1]]);
  });
});

describe("expectedSuccess", () => {
  it("uses 1200 for unobserved skills and the current rating otherwise", async () => {
    expect(await model.expectedSuccess(USER, SKILL_CORE, "gleam", 1200)).toBe(0.5);
    await submit();
    expect(await model.expectedSuccess(USER, SKILL_CORE, "gleam", 1240)).toBeCloseTo(0.5, 12);
  });
});

describe("review schedule", () => {
  it("is created on the first rated success, advances, caps at 30 and resets on failure", async () => {
    await submit({ correctness: false, evaluatedAt: day(0) });
    expect(await model.dueReviews(USER, "gleam", new Date(day(365)))).toEqual([]);

    const intervals: number[] = [];
    let t = 1;
    for (let i = 0; i < 6; i++) {
      await submit({ evaluatedAt: day(t) });
      const [item] = await model.dueReviews(USER, "gleam", new Date(day(365)));
      intervals.push(item!.intervalDays);
      expect(item!.dueAt).toBe(day(t + item!.intervalDays));
      t += 40;
    }
    expect(intervals).toEqual([1, 3, 7, 14, 30, 30]);

    await submit({ correctness: false, evaluatedAt: day(t) });
    const [reset] = await model.dueReviews(USER, "gleam", new Date(day(t + 1)));
    expect(reset).toEqual({
      skillId: SKILL_CORE,
      language: "gleam",
      intervalDays: 1,
      dueAt: day(t + 1),
      lastResult: "failure",
    });
    expect(await model.dueReviews(USER, "gleam", new Date(day(t)))).toEqual([]);
  });
});

describe("error tags", () => {
  it("counts all observations and resolves a tag after a later rated success on a probing exercise", async () => {
    await submit({ correctness: false, errorTags: ["drops_items_with_filter"], evaluatedAt: day(0) });
    await submit({ attemptNo: 2, correctness: false, errorTags: ["drops_items_with_filter", "off_by_one"], evaluatedAt: day(1) });
    // Unrated success does not resolve.
    await submit({ attemptNo: 3, evaluatedAt: day(2) });
    let tags = (await model.getProfile(USER, "gleam")).errorTags;
    expect(tags).toEqual([
      { tag: "drops_items_with_filter", count: 2, lastSeenAt: day(1) },
      { tag: "off_by_one", count: 1, lastSeenAt: day(1) },
    ]);

    // Rated success on EX_CORE (probes drops_items_with_filter, not off_by_one).
    await submit({ exerciseId: EX_CORE, evaluatedAt: day(3) });
    tags = (await model.getProfile(USER, "gleam")).errorTags;
    expect(tags).toEqual([
      { tag: "drops_items_with_filter", count: 2, lastSeenAt: day(1), lastResolvedAt: day(3) },
      { tag: "off_by_one", count: 1, lastSeenAt: day(1) },
    ]);

    // Seen again after resolution: count grows, resolution stays in the past.
    await submit({ attemptNo: 2, correctness: false, errorTags: ["drops_items_with_filter"], evaluatedAt: day(4) });
    const [top] = (await model.getProfile(USER, "gleam")).errorTags;
    expect(top).toEqual({ tag: "drops_items_with_filter", count: 3, lastSeenAt: day(4), lastResolvedAt: day(3) });
  });
});

describe("profile", () => {
  it("shows every catalog skill at 1200 provisional for a new user", async () => {
    const profile = await model.getProfile(asId<UserId>("new-user"), "gleam");
    expect(profile.policyVersion).toBe("elo-v1");
    expect(profile.overall).toBeNull();
    expect(profile.reviews).toEqual([]);
    expect(profile.errorTags).toEqual([]);
    expect(profile.estimates.map((e) => e.skillId)).toEqual([SKILL_CORE, SKILL_UNSEEN, SKILL_ALGO]);
    for (const e of profile.estimates) {
      expect(e).toEqual({
        skillId: e.skillId,
        language: "gleam",
        rating: 1200,
        deviation: 350,
        ratedObservations: 0,
        provisional: true,
        updatedAt: clock.now().toISOString(),
      });
    }
  });

  it("computes the overall rating as an observation-weighted mean", async () => {
    for (let i = 0; i < 3; i++) await submit({ evaluatedAt: day(i) });
    await submit({ exerciseId: EX_ALGO, correctness: false, evaluatedAt: day(3) });
    const profile = await model.getProfile(USER, "gleam");
    const core = profile.estimates.find((e) => e.skillId === SKILL_CORE)!;
    const algo = profile.estimates.find((e) => e.skillId === SKILL_ALGO)!;
    expect(profile.overall?.rating).toBeCloseTo((core.rating * 3 + algo.rating * 1) / 4, 9);
    expect(profile.overall).toMatchObject({ provisional: true, method: "observation_weighted_mean" });

    await submit({ exerciseId: EX_ALGO, evaluatedAt: day(4) });
    expect((await model.getProfile(USER, "gleam")).overall?.provisional).toBe(false);
  });
});

describe("replayAll", () => {
  async function snapshot() {
    const tables = ["skill_ratings", "rating_changes", "reviews", "error_tags"];
    const out: Record<string, unknown[]> = {};
    for (const t of tables) out[t] = (await db.query(`select * from learner.${t} order by 1, 2, 3`)).rows;
    return out;
  }

  it("rebuilds identical derived state from the observation log", async () => {
    await submit({ correctness: false, errorTags: ["drops_items_with_filter"], evaluatedAt: day(0) });
    await submit({ attemptNo: 2, evaluatedAt: day(0.5) });
    await submit({ exerciseId: EX_CORE_2, evaluatedAt: day(1) });
    await submit({ exerciseId: EX_ALGO, efficiency: "too_slow", evaluatedAt: day(2) });
    await submit({ exerciseId: EX_ALGO, evaluatedAt: day(3) });
    await submit({ exerciseId: EX_CORE, evaluatedAt: day(4) });
    await submit({ userId: asId<UserId>("user-2"), correctness: false, errorTags: ["wrong_order"], evaluatedAt: day(5) });

    const before = await snapshot();
    const profileBefore = await model.getProfile(USER, "gleam");
    const published = bus.published.length;

    const result = await model.replayAll();
    expect(result).toEqual({ observations: 7, policyVersion: "elo-v1" });
    expect(await snapshot()).toEqual(before);
    expect(await model.getProfile(USER, "gleam")).toEqual(profileBefore);
    expect(bus.published.length).toBe(published);
  });

  it("applies the log in occurredAt order even if events arrived out of order", async () => {
    await submit({ submissionId: asId<SubmissionId>("late"), correctness: false, evaluatedAt: day(2) });
    await submit({ submissionId: asId<SubmissionId>("early"), evaluatedAt: day(1) });
    await model.replayAll();
    expect(await model.ratingChangeFor(asId<SubmissionId>("early"))).toMatchObject({ before: 1200, after: 1240 });
    const late = await model.ratingChangeFor(asId<SubmissionId>("late"));
    expect(late?.before).toBe(1240);
  });

  it("rolls back when replay fails, keeping the previous state", async () => {
    await submit({ evaluatedAt: day(0) });
    const before = await snapshot();
    // Make re-inserting the review fail midway through the replay.
    await db.exec("alter table learner.reviews add constraint no_reviews check (interval_days < 0) not valid");
    await expect(model.replayAll()).rejects.toThrow();
    expect(await snapshot()).toEqual(before);
  });
});
