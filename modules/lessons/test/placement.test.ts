import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Quiz } from "../src/contract/index.ts";
import { answersFor, createHarness, unwrap, USER, type Harness } from "./fakes.ts";

let h: Harness;
beforeEach(async () => {
  h = await createHarness();
});
afterEach(async () => {
  await h.db.close();
});

/** Correct counts per unit (items are ordered ua x3, ub x3, uc x3, ud x3). */
function answersByUnit(quiz: Quiz, correct: Record<string, number>): Record<string, number> {
  const seen: Record<string, number> = {};
  return answersFor(quiz, (unitId) => {
    seen[unitId] = (seen[unitId] ?? 0) + 1;
    return (seen[unitId] ?? 0) <= (correct[unitId] ?? 0);
  });
}

describe("startPlacement", () => {
  it("builds a 12-item ladder across all units, earlier levels first", async () => {
    const quiz = unwrap(await h.service.startPlacement(USER, "en"));
    expect(quiz.kind).toBe("placement");
    expect(quiz.unitId).toBeUndefined();
    expect(quiz.items.map((i) => i.unitId)).toEqual(["ua", "ua", "ua", "ub", "ub", "ub", "uc", "uc", "uc", "ud", "ud", "ud"]);
    expect(new Set(quiz.items.map((i) => i.type))).toEqual(new Set(["choice", "predict"]));
    expect(JSON.stringify(quiz)).not.toContain("answer");
  });
});

describe("submitPlacement", () => {
  it("advanced: passes levels 1-3, recommends training, records rated observations by level", async () => {
    const quiz = unwrap(await h.service.startPlacement(USER));
    const res = unwrap(await h.service.submitPlacement(USER, quiz.quizId, answersByUnit(quiz, { ua: 3, ub: 3, uc: 2, ud: 2 }), "en"));
    expect(res).toMatchObject({ score: 10, total: 12, band: "advanced", unitsPassed: ["ua", "ub", "uc"], recommendation: "training" });
    expect(res.completedAt).toBe("2026-09-30T00:00:00.000Z");
    expect(res.review).toHaveLength(12);

    expect(h.observations).toHaveLength(12);
    const base: Record<string, number> = { ua: 900, ub: 1000, uc: 1100, ud: 1200 };
    quiz.items.forEach((item) => {
      const o = h.observations.find((x) => x.submissionId === `lesson-quiz:${quiz.quizId}:${item.itemId}`);
      expect(o?.difficulty).toBe((base[item.unitId] ?? 0) + (item.type === "predict" ? 50 : 0));
      expect(o?.rated).toBe(true);
      expect(o?.exerciseId.startsWith(`lesson:${item.unitId}/`)).toBe(true);
    });
    expect(h.events.map((e) => e.payload)).toEqual([{ userId: USER, band: "advanced", unitsPassed: ["ua", "ub", "uc"] }]);
  });

  it("intermediate: passes only level 1-2 units whose items were mostly correct", async () => {
    const quiz = unwrap(await h.service.startPlacement(USER));
    const res = unwrap(await h.service.submitPlacement(USER, quiz.quizId, answersByUnit(quiz, { ua: 3, ub: 1, uc: 2, ud: 0 })));
    expect(res).toMatchObject({ score: 6, band: "intermediate", unitsPassed: ["ua"], recommendation: "course" });
  });

  it("intermediate with both early units mostly right", async () => {
    const quiz = unwrap(await h.service.startPlacement(USER));
    const res = unwrap(await h.service.submitPlacement(USER, quiz.quizId, answersByUnit(quiz, { ua: 2, ub: 2, uc: 2, ud: 1 })));
    expect(res).toMatchObject({ score: 7, band: "intermediate", unitsPassed: ["ua", "ub"] });
  });

  it("80% overall but weak on L3-L4 is not advanced", async () => {
    const quiz = unwrap(await h.service.startPlacement(USER));
    // 9/12 = 75% -> intermediate; this shape cannot reach 80% with < 2/3 high-level, see sampling.test.ts.
    const res = unwrap(await h.service.submitPlacement(USER, quiz.quizId, answersByUnit(quiz, { ua: 3, ub: 3, uc: 2, ud: 1 })));
    expect(res.band).toBe("intermediate");
  });

  it("beginner: no units passed", async () => {
    const quiz = unwrap(await h.service.startPlacement(USER));
    const res = unwrap(await h.service.submitPlacement(USER, quiz.quizId, answersByUnit(quiz, { ua: 3, ub: 2 })));
    expect(res).toMatchObject({ score: 5, band: "beginner", unitsPassed: [], recommendation: "course" });
  });

  it("is idempotent and course() shows the latest placement", async () => {
    const q1 = unwrap(await h.service.startPlacement(USER));
    unwrap(await h.service.submitPlacement(USER, q1.quizId, answersByUnit(q1, { ua: 1 })));
    h.clock.advance(60_000);
    const q2 = unwrap(await h.service.startPlacement(USER));
    const r2 = unwrap(await h.service.submitPlacement(USER, q2.quizId, answersByUnit(q2, { ua: 3, ub: 3 })));
    const again = unwrap(await h.service.submitPlacement(USER, q2.quizId, {}));
    expect(again).toEqual(r2);
    expect(h.events).toHaveLength(2);
    expect(h.observations).toHaveLength(24);

    const course = await h.service.course(USER, "en");
    expect(course.placement).toMatchObject({ quizId: q2.quizId, band: "intermediate", unitsPassed: ["ua", "ub"] });
    expect(course.placement?.review[0]?.feedback).toBe("[en] 정답 해설");
  });
});
