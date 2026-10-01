import { describe, expect, it } from "vitest";
import {
  checkpointPassed,
  itemDifficulty,
  placementBand,
  placementUnitsPassed,
  sampleCheckpoint,
  samplePlacement,
  seededRandom,
  type Candidate,
} from "../src/sampling.ts";

function cands(unitId: string, lessons: number, perLesson: number, level = 1): Candidate[] {
  const out: Candidate[] = [];
  for (let l = 0; l < lessons; l++) {
    for (let e = 0; e < perLesson; e++) {
      out.push({
        unitId, lessonId: `l${l}`, exerciseId: `e${e}`, type: e % 2 === 0 ? "choice" : "predict",
        level, skillId: "s", lessonIndex: l, exerciseIndex: e,
      });
    }
  }
  return out;
}

const key = (c: Candidate) => `${c.lessonId}#${c.exerciseId}`;

describe("sampleCheckpoint", () => {
  it("is deterministic per seed and varies between attempts", () => {
    const pool = cands("u", 3, 6);
    const a = sampleCheckpoint(pool, seededRandom("user|checkpoint|u|0")).map(key);
    const b = sampleCheckpoint(pool, seededRandom("user|checkpoint|u|0")).map(key);
    const c = sampleCheckpoint(pool, seededRandom("user|checkpoint|u|1")).map(key);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it("sizes 6-10 by lesson count and spreads over lessons with mixed types", () => {
    const three = sampleCheckpoint(cands("u", 3, 6), seededRandom("x"));
    expect(three).toHaveLength(6);
    expect(three.filter((c) => c.lessonId === "l0")).toHaveLength(2);
    expect(three.filter((c) => c.type === "predict")).toHaveLength(3);
    expect(sampleCheckpoint(cands("u", 8, 3), seededRandom("x"))).toHaveLength(10);
    // 10 lessons, 10 items: one from each lesson
    expect(new Set(sampleCheckpoint(cands("u", 12, 2), seededRandom("y")).map((c) => c.lessonId)).size).toBe(10);
    // fewer exercises than the minimum: take them all
    expect(sampleCheckpoint(cands("u", 1, 4), seededRandom("z"))).toHaveLength(4);
  });

  it("returns items in lesson order", () => {
    const s = sampleCheckpoint(cands("u", 5, 3), seededRandom("q"));
    const idx = s.map((c) => c.lessonIndex * 100 + c.exerciseIndex);
    expect(idx).toEqual([...idx].sort((a, b) => a - b));
  });
});

describe("samplePlacement", () => {
  it("takes 3-4 items per level, one per unit first, levels ascending", () => {
    const units = [
      { unitId: "a", order: 1, level: 1, candidates: cands("a", 2, 3, 1) },
      { unitId: "b", order: 2, level: 1, candidates: cands("b", 2, 3, 1) },
      { unitId: "c", order: 3, level: 2, candidates: cands("c", 2, 3, 2) },
      { unitId: "d", order: 4, level: 2, candidates: cands("d", 2, 3, 2) },
      { unitId: "e", order: 5, level: 2, candidates: cands("e", 2, 3, 2) },
      { unitId: "f", order: 6, level: 2, candidates: cands("f", 2, 3, 2) },
      { unitId: "g", order: 7, level: 2, candidates: cands("g", 2, 3, 2) },
      { unitId: "h", order: 8, level: 3, candidates: [] },
    ];
    const s = samplePlacement(units, seededRandom("p"));
    expect(s.map((c) => c.unitId)).toEqual(["a", "a", "b", "c", "d", "e", "f"]);
    expect(s.map((c) => c.level)).toEqual([1, 1, 1, 2, 2, 2, 2]);
  });
});

describe("scoring", () => {
  it("difficulty by level, predict +50", () => {
    expect([1, 2, 3, 4].map((l) => itemDifficulty(l, "choice"))).toEqual([900, 1000, 1100, 1200]);
    expect(itemDifficulty(3, "predict")).toBe(1150);
  });

  it("checkpoint threshold is inclusive at 80%", () => {
    expect(checkpointPassed(8, 10)).toBe(true);
    expect(checkpointPassed(4, 5)).toBe(true);
    expect(checkpointPassed(4, 6)).toBe(false);
    expect(checkpointPassed(0, 0)).toBe(false);
  });

  const items = (spec: [string, number, boolean][]) => spec.map(([unitId, level, correct]) => ({ unitId, level, correct }));

  it("advanced needs 80% overall and 2/3 of L3-L4 items", () => {
    const low = Array.from({ length: 10 }, (): [string, number, boolean] => ["a", 1, true]);
    expect(placementBand(items([...low, ["c", 3, true], ["c", 3, false], ["d", 4, false]]))).toBe("intermediate");
    expect(placementBand(items([...low, ["c", 3, true], ["c", 3, true], ["d", 4, false]]))).toBe("advanced");
    expect(placementBand(items([["a", 1, true], ["a", 1, false]]))).toBe("intermediate");
    expect(placementBand(items([["a", 1, true], ["a", 1, false], ["a", 1, false]]))).toBe("beginner");
    expect(placementBand([])).toBe("beginner");
  });

  it("unitsPassed per band", () => {
    const units = [
      { id: "a", level: 1 }, { id: "b", level: 2 }, { id: "c", level: 3 }, { id: "d", level: 4 }, { id: "e", level: 2 },
    ];
    const graded = items([["a", 1, true], ["a", 1, true], ["a", 1, false], ["b", 2, true], ["b", 2, false], ["c", 3, true]]);
    expect(placementUnitsPassed("advanced", units, graded)).toEqual(["a", "b", "c", "e"]);
    expect(placementUnitsPassed("intermediate", units, graded)).toEqual(["a"]);
    expect(placementUnitsPassed("beginner", units, graded)).toEqual([]);
  });
});
