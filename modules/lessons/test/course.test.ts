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

async function passCheckpoint(unitId: string): Promise<void> {
  const quiz: Quiz = unwrap(await h.service.startCheckpoint(USER, unitId));
  expect(unwrap(await h.service.submitCheckpoint(USER, quiz.quizId, answersFor(quiz, () => true))).passed).toBe(true);
}

describe("course", () => {
  it("starts with the first lesson; only prerequisite-free units are unlocked", async () => {
    const c = await h.service.course(USER, "en");
    expect(c.units.map((u) => u.id)).toEqual(["ua", "ub", "uc", "ud"]);
    expect(c.units[0]?.title).toBe("[en] 단원 ua");
    expect(c.units.map((u) => u.progress.unlocked)).toEqual([true, false, false, false]);
    expect(c.placement).toBeNull();
    expect(c.next).toEqual({ kind: "lesson", unitId: "ua", lessonId: "la1" });
  });

  it("walks lessons, then the checkpoint, then unlocks the next unit", async () => {
    unwrap(await h.service.completeLesson(USER, "ua", "la1"));
    expect((await h.service.course(USER)).next).toEqual({ kind: "lesson", unitId: "ua", lessonId: "la2" });
    unwrap(await h.service.completeLesson(USER, "ua", "la2"));
    expect((await h.service.course(USER)).next).toEqual({ kind: "checkpoint", unitId: "ua" });

    await passCheckpoint("ua");
    const c = await h.service.course(USER);
    expect(c.units.map((u) => u.progress.unlocked)).toEqual([true, true, false, false]);
    expect(c.next).toEqual({ kind: "lesson", unitId: "ub", lessonId: "lb1" });
  });

  it("a failed checkpoint keeps the unit as next step", async () => {
    unwrap(await h.service.completeLesson(USER, "ua", "la1"));
    unwrap(await h.service.completeLesson(USER, "ua", "la2"));
    const quiz = unwrap(await h.service.startCheckpoint(USER, "ua"));
    unwrap(await h.service.submitCheckpoint(USER, quiz.quizId, {}));
    const c = await h.service.course(USER);
    expect(c.next).toEqual({ kind: "checkpoint", unitId: "ua" });
    expect(c.units[1]?.progress.unlocked).toBe(false);
  });

  it("locked units stay openable and their checkpoints can be taken", async () => {
    expect(unwrap(await h.service.lesson(USER, "uc", "lc1")).lesson.id).toBe("lc1");
    await passCheckpoint("uc");
    const c = await h.service.course(USER);
    expect(c.units[2]?.progress).toMatchObject({ checkpointPassed: true, unlocked: false });
    expect(c.units[3]?.progress.unlocked).toBe(true);
    expect(c.next).toEqual({ kind: "lesson", unitId: "ua", lessonId: "la1" });
  });

  it("placement-implied passes unlock units and move the next step", async () => {
    const quiz = unwrap(await h.service.startPlacement(USER));
    const seen: Record<string, number> = {};
    const answers = answersFor(quiz, (u) => {
      seen[u] = (seen[u] ?? 0) + 1;
      return u === "ua" || u === "ub" || (u === "uc" && (seen[u] ?? 0) === 1);
    });
    expect(unwrap(await h.service.submitPlacement(USER, quiz.quizId, answers)).unitsPassed).toEqual(["ua", "ub"]);
    const c = await h.service.course(USER);
    expect(c.units[0]?.progress).toMatchObject({ checkpointPassed: true, passedByPlacement: true, unlocked: true });
    expect(c.units[1]?.progress.passedByPlacement).toBe(true);
    expect(c.units.map((u) => u.progress.unlocked)).toEqual([true, true, true, false]);
    expect(c.next).toEqual({ kind: "lesson", unitId: "uc", lessonId: "lc1" });

    // A later own pass is reported as a checkpoint pass, not a placement one.
    await passCheckpoint("ua");
    const after = await h.service.course(USER);
    expect(after.units[0]?.progress).toMatchObject({ checkpointPassed: true, passedByPlacement: false });
  });

  it("is done when every unit is passed", async () => {
    for (const u of ["ua", "ub", "uc", "ud"]) await passCheckpoint(u);
    expect((await h.service.course(USER)).next).toEqual({ kind: "done" });
  });
});
