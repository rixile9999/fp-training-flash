import { describe, expect, it } from "vitest";
import { eloV1 } from "../src/policy/elo-v1.ts";
import { nextIntervalDays, scheduleReview } from "../src/review.ts";
import { isRated, isSuccess, observationFromEvaluation } from "../src/observation.ts";
import { EX_CORE, NO_HELP, SKILL_CORE, evaluated, exercise } from "./fakes.ts";

describe("elo-v1 policy", () => {
  it("computes expected success on the 400-point logistic scale", () => {
    expect(eloV1.expectedSuccess(1200, 1200)).toBe(0.5);
    expect(eloV1.expectedSuccess(1200, 1600)).toBeCloseTo(1 / 11, 12);
    expect(eloV1.expectedSuccess(1600, 1200)).toBeCloseTo(10 / 11, 12);
  });

  it("shrinks K with rated observations down to 20", () => {
    expect(eloV1.kFactor(0)).toBe(80);
    expect(eloV1.kFactor(3)).toBe(40);
    expect(eloV1.kFactor(6)).toBeCloseTo(80 / 3, 12);
    expect(eloV1.kFactor(9)).toBe(20);
    expect(eloV1.kFactor(30)).toBe(20);
  });

  it("shrinks deviation with a floor of 50 and marks < 5 rated observations provisional", () => {
    expect(eloV1.deviation(0)).toBe(350);
    expect(eloV1.deviation(3)).toBe(175);
    expect(eloV1.deviation(1)).toBe(247);
    expect(eloV1.deviation(100)).toBe(50);
    expect(eloV1.isProvisional(4)).toBe(true);
    expect(eloV1.isProvisional(5)).toBe(false);
    expect(eloV1.initialRating).toBe(1200);
    expect(eloV1.version).toBe("elo-v1");
  });

  it("updates the rating by K * (score - expected)", () => {
    expect(eloV1.update({ rating: 1200, ratedObservations: 0 }, 1200, true)).toEqual({ rating: 1240, ratedObservations: 1 });
    expect(eloV1.update({ rating: 1200, ratedObservations: 0 }, 1200, false)).toEqual({ rating: 1160, ratedObservations: 1 });
    const hard = eloV1.update({ rating: 1200, ratedObservations: 3 }, 1600, true);
    expect(hard.rating).toBeCloseTo(1200 + 40 * (1 - 1 / 11), 9);
    expect(hard.ratedObservations).toBe(4);
  });
});

describe("review schedule", () => {
  const at = "2026-09-01T10:00:00.000Z";

  it("is created only by a success, starting at 1 day", () => {
    expect(scheduleReview(null, false, at)).toBeNull();
    expect(scheduleReview(null, true, at)).toEqual({
      intervalDays: 1,
      dueAt: "2026-09-02T10:00:00.000Z",
      lastResult: "success",
    });
  });

  it("advances 1 -> 3 -> 7 -> 14 -> 30 and stays at 30", () => {
    expect([1, 3, 7, 14, 30].map(nextIntervalDays)).toEqual([3, 7, 14, 30, 30]);
    const prev = { intervalDays: 14, dueAt: at, lastResult: "success" as const };
    expect(scheduleReview(prev, true, at)?.dueAt).toBe("2026-10-01T10:00:00.000Z");
  });

  it("resets to 1 day after a failure", () => {
    const prev = { intervalDays: 14, dueAt: at, lastResult: "success" as const };
    expect(scheduleReview(prev, false, at)).toEqual({
      intervalDays: 1,
      dueAt: "2026-09-02T10:00:00.000Z",
      lastResult: "failure",
    });
  });
});

describe("observation rules", () => {
  it("rates only first attempts without explanation and with hint level <= 2", () => {
    expect(isRated(1, NO_HELP)).toBe(true);
    expect(isRated(1, { ...NO_HELP, maxHintLevel: 2 })).toBe(true);
    expect(isRated(1, { ...NO_HELP, maxHintLevel: 3 })).toBe(false);
    expect(isRated(1, { ...NO_HELP, explanationViewed: true })).toBe(false);
    expect(isRated(2, NO_HELP)).toBe(false);
  });

  it("requires acceptable efficiency only on the algorithm track", () => {
    expect(isSuccess(true, "too_slow", "core")).toBe(true);
    expect(isSuccess(true, "too_slow", "algorithm")).toBe(false);
    expect(isSuccess(true, "ok", "algorithm")).toBe(true);
    expect(isSuccess(true, null, "algorithm")).toBe(true);
    expect(isSuccess(false, "ok", "core")).toBe(false);
  });

  it("builds an observation from the exercise and ignores system errors", () => {
    const ex = exercise(EX_CORE, SKILL_CORE, 1350);
    const payload = evaluated({ correctness: false, errorTags: ["a", "a", "b"] });
    expect(observationFromEvaluation(payload, ex, "core")).toEqual({
      submissionId: payload.submissionId,
      userId: payload.userId,
      exerciseId: EX_CORE,
      skillId: SKILL_CORE,
      language: "gleam",
      difficulty: 1350,
      success: false,
      rated: true,
      errorTags: ["a", "b"],
      occurredAt: payload.evaluatedAt,
    });
    expect(observationFromEvaluation(evaluated({ outcome: "system_error" }), ex, "core")).toBeNull();
  });
});
