import { afterEach, describe, expect, it } from "vitest";
import { asId, type ExerciseId } from "@fp/kernel";
import { EXERCISE_ID, EXPLANATION_MARKER, OTHER_USER, SOLUTION_MARKER, USER, setup, type Harness } from "./fixtures.ts";

let h: Harness;
afterEach(async () => {
  await h.db.close();
});

describe("revealHint", () => {
  it("returns authored hints 1..level in order and records the max level", async () => {
    h = await setup();
    const r1 = await h.service.revealHint(USER, EXERCISE_ID, 1);
    expect(r1.ok && r1.value.map((x) => x.level)).toEqual([1]);
    const r2 = await h.service.revealHint(USER, EXERCISE_ID, 2);
    expect(r2.ok && r2.value.map((x) => x.level)).toEqual([1, 2]);
    expect((await h.service.helpUsed(USER, EXERCISE_ID)).maxHintLevel).toBe(2);
  });

  it("rejects skipping more than one level beyond the current max", async () => {
    h = await setup();
    const skip = await h.service.revealHint(USER, EXERCISE_ID, 2);
    expect(skip.ok).toBe(false);
    if (!skip.ok) {
      expect(skip.error.code).toBe("invalid_input");
      expect(skip.error.details).toMatchObject({ currentMaxLevel: 0 });
    }
    await h.service.revealHint(USER, EXERCISE_ID, 1);
    const skip2 = await h.service.revealHint(USER, EXERCISE_ID, 3);
    expect(!skip2.ok && skip2.error.code).toBe("invalid_input");
    expect((await h.service.helpUsed(USER, EXERCISE_ID)).maxHintLevel).toBe(1);
  });

  it("rejects levels outside 1..5, non-integers and levels without an authored hint", async () => {
    h = await setup();
    for (const level of [0, 6, -1, 1.5, Number.NaN]) {
      const r = await h.service.revealHint(USER, EXERCISE_ID, level);
      expect(!r.ok && r.error.code, `level ${level}`).toBe("invalid_input");
    }
    for (const level of [1, 2, 3]) expect((await h.service.revealHint(USER, EXERCISE_ID, level)).ok).toBe(true);
    const r4 = await h.service.revealHint(USER, EXERCISE_ID, 4); // exercise authors only 3 hints
    expect(!r4.ok && r4.error.code).toBe("invalid_input");
  });

  it("is monotonic: re-revealing a lower level returns fewer hints but never lowers the max", async () => {
    h = await setup();
    await h.service.revealHint(USER, EXERCISE_ID, 1);
    await h.service.revealHint(USER, EXERCISE_ID, 2);
    const again = await h.service.revealHint(USER, EXERCISE_ID, 1);
    expect(again.ok && again.value.map((x) => x.level)).toEqual([1]);
    expect((await h.service.helpUsed(USER, EXERCISE_ID)).maxHintLevel).toBe(2);
  });

  it("returns not_found for an unknown exercise", async () => {
    h = await setup();
    const r = await h.service.revealHint(USER, asId<ExerciseId>("missing@1"), 1);
    expect(!r.ok && r.error.code).toBe("not_found");
  });
});

describe("revealExplanation", () => {
  it("returns the explanation and the learner-module solution file, and records it", async () => {
    h = await setup();
    expect((await h.service.helpUsed(USER, EXERCISE_ID)).explanationViewed).toBe(false);
    const r = await h.service.revealExplanation(USER, EXERCISE_ID);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.markdown).toContain(EXPLANATION_MARKER);
      expect(r.value.solutionCode).toContain(SOLUTION_MARKER);
      expect(r.value.solutionCode).not.toContain("helper");
    }
    expect((await h.service.helpUsed(USER, EXERCISE_ID)).explanationViewed).toBe(true);
  });

  it("returns not_found without recording when the exercise is unknown", async () => {
    h = await setup();
    const id = asId<ExerciseId>("missing@1");
    const r = await h.service.revealExplanation(USER, id);
    expect(!r.ok && r.error.code).toBe("not_found");
    expect((await h.service.helpUsed(USER, id)).explanationViewed).toBe(false);
  });
});

describe("helpUsed", () => {
  it("is all zero for an untouched exercise", async () => {
    h = await setup();
    expect(await h.service.helpUsed(USER, EXERCISE_ID)).toEqual({
      maxHintLevel: 0,
      conceptNotesOpened: 0,
      theoryNotesOpened: 0,
      explanationViewed: false,
      coachMessages: 0,
    });
  });

  it("counts distinct notes, coach messages, explanation and hint level per (user, exercise)", async () => {
    h = await setup();
    const s = h.service;
    await s.recordHelp(USER, EXERCISE_ID, "concept_note", "list-map");
    await s.recordHelp(USER, EXERCISE_ID, "concept_note", "list-map"); // reopening counts once
    await s.recordHelp(USER, EXERCISE_ID, "concept_note", "pipes");
    await s.recordHelp(USER, EXERCISE_ID, "theory_note", "functor");
    await s.recordHelp(USER, EXERCISE_ID, "coach_message");
    await s.recordHelp(USER, EXERCISE_ID, "coach_message");
    await s.recordHelp(USER, EXERCISE_ID, "hint", "2");
    await s.recordHelp(USER, EXERCISE_ID, "explanation");
    await s.recordHelp(OTHER_USER, EXERCISE_ID, "hint", "3");
    await s.recordHelp(USER, asId<ExerciseId>("other@1"), "hint", "4");

    expect(await s.helpUsed(USER, EXERCISE_ID)).toEqual({
      maxHintLevel: 2,
      conceptNotesOpened: 2,
      theoryNotesOpened: 1,
      explanationViewed: true,
      coachMessages: 2,
    });
    expect((await s.helpUsed(OTHER_USER, EXERCISE_ID)).maxHintLevel).toBe(3);
  });

  it("ignores hint refs that are not a level 1..5", async () => {
    h = await setup();
    await h.service.recordHelp(USER, EXERCISE_ID, "hint", "9");
    await h.service.recordHelp(USER, EXERCISE_ID, "hint", "abc");
    expect((await h.service.helpUsed(USER, EXERCISE_ID)).maxHintLevel).toBe(0);
  });
});
