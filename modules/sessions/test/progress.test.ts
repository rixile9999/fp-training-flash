import { describe, expect, it } from "vitest";
import { asId } from "@fp/kernel";
import type { ExerciseId, FamilyId, SessionId, SkillId, SubmissionId, UserId } from "@fp/kernel";
import { applyEvaluation, nextPendingIndex, skipCurrent, type StoredItem, type StoredSession } from "../src/progress.ts";
import { parseExerciseId } from "../src/service.ts";

function item(index: number, status: StoredItem["status"], exercise = `f${index}/base@1`): StoredItem {
  return {
    index, kind: "focus", exerciseId: asId<ExerciseId>(exercise), skillId: asId<SkillId>("a"),
    familyId: asId<FamilyId>(exercise.split("/")[0] ?? ""), variantKey: "base", reason: "", expectedSuccess: 0.8,
    status, submissionIds: [], hadFailure: false,
  };
}

function session(items: StoredItem[], currentIndex: number | null): StoredSession {
  return {
    id: asId<SessionId>("s"), userId: asId<UserId>("u"), language: "gleam", status: "active", targetMinutes: 15,
    startedAt: "2026-09-30T00:00:00.000Z", items, currentIndex, summary: null,
  };
}

const sub = (id: string) => asId<SubmissionId>(id);

describe("progress", () => {
  it("nextPendingIndex looks forward first and then wraps to earlier pending items", () => {
    const items = [item(0, "pending"), item(1, "skipped"), item(2, "pending")];
    expect(nextPendingIndex(items, 1)).toBe(2);
    expect(nextPendingIndex(items, 2)).toBe(0);
    expect(nextPendingIndex([item(0, "passed")], 0)).toBeNull();
  });

  it("passing a non-current item does not move the cursor", () => {
    const s = session([item(0, "in_progress"), item(1, "pending")], 0);
    const next = applyEvaluation(s, {
      submissionId: sub("x"), exerciseId: asId<ExerciseId>("f1/base@1"), familyId: asId<FamilyId>("f1"),
      variantKey: "base", passed: true,
    });
    expect(next?.currentIndex).toBe(0);
    expect(next?.items.map((i) => i.status)).toEqual(["in_progress", "passed"]);
    // Skipping item 0 now finds nothing pending.
    expect(skipCurrent(next!)?.currentIndex).toBeNull();
  });

  it("matches a newer version of the same family/variant", () => {
    const s = session([item(0, "in_progress")], 0);
    const next = applyEvaluation(s, {
      submissionId: sub("x"), exerciseId: asId<ExerciseId>("f0/base@2"), familyId: asId<FamilyId>("f0"),
      variantKey: "base", passed: false,
    });
    expect(next?.items[0]).toMatchObject({ status: "failed", hadFailure: true, submissionIds: ["x"] });
  });

  it("a later failure never downgrades a passed item", () => {
    const s = session([{ ...item(0, "passed"), submissionIds: [sub("a")] }], null);
    const next = applyEvaluation(s, {
      submissionId: sub("b"), exerciseId: asId<ExerciseId>("f0/base@1"), familyId: asId<FamilyId>("f0"),
      variantKey: "base", passed: false,
    });
    expect(next?.items[0]).toMatchObject({ status: "passed", submissionIds: ["a", "b"] });
  });

  it("parses exercise ids", () => {
    expect(parseExerciseId(asId<ExerciseId>("orders-apply-coupon/base@1"))).toEqual({
      familyId: "orders-apply-coupon", variantKey: "base",
    });
  });
});
