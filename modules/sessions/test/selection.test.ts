import { afterEach, describe, expect, it } from "vitest";
import type { AppError, Result } from "@fp/kernel";
import { DAY_MS } from "@fp/kernel/testing";
import { estimate, exercise, review, setup, sk, skill, USER, type Harness } from "./fakes.ts";

function must<T>(r: Result<T, AppError>): T {
  if (!r.ok) throw new Error(`expected ok, got ${r.error.code}: ${r.error.message}`);
  return r.value;
}

let h: Harness | undefined;
afterEach(async () => {
  expect(h?.handlerErrors ?? []).toEqual([]);
  await h?.db.close();
  h = undefined;
});

const start = (x: Harness, extra: Partial<Parameters<Harness["service"]["start"]>[0]> = {}) =>
  x.service.start({ userId: USER, language: "gleam", targetMinutes: 15, ...extra });

describe("empty catalog and new users", () => {
  it("returns not_found when there are no exercises", async () => {
    h = await setup([skill("a", 1)], []);
    const s = await start(h);
    expect(s.ok ? null : s.error.code).toBe("not_found");
    const r = await h.service.recommend(USER, "gleam");
    expect(r.ok ? null : r.error.code).toBe("not_found");
    expect(await h.service.active(USER, "gleam")).toBeNull();
  });

  it("starts a user without history on the lowest-order skill near difficulty 1200", async () => {
    h = await setup(
      [skill("b", 2), skill("a", 1)],
      [
        exercise("a1", "base", "a", { difficulty: 900 }),
        exercise("a2", "base", "a", { difficulty: 1250 }),
        exercise("a3", "base", "a", { difficulty: 1600 }),
        exercise("b1", "base", "b", { difficulty: 1200 }),
      ],
    );
    const rec = must(await h.service.recommend(USER, "gleam"));
    expect(rec).toMatchObject({ exerciseId: "a2/base@1", skillId: "a", kind: "focus" });
    expect(rec.reason).toContain("학습 시작");
    const session = must(await start(h));
    expect(session.items[0]).toMatchObject({ kind: "focus", exerciseId: "a2/base@1", status: "in_progress" });
    expect(session.currentIndex).toBe(0);
  });
});

describe("focus skill selection", () => {
  const skills = [skill("a", 1), skill("b", 2, ["a"])];
  const exs = [exercise("a1", "base", "a"), exercise("b1", "base", "b")];

  it("keeps a skill locked until each prerequisite reaches 1250 or has an independent success", async () => {
    h = await setup(skills, exs, { estimates: [estimate("a", 1240)] });
    expect(must(await h.service.recommend(USER, "gleam")).skillId).toBe("a");

    h.learnerState.estimates = [estimate("a", 1260)];
    expect(must(await h.service.recommend(USER, "gleam")).skillId).toBe("b");

    h.learnerState.estimates = [
      estimate("a", 1240, { lastIndependentSuccessAt: "2026-09-20T00:00:00.000Z" }),
      estimate("b", 1300),
    ];
    // Both eligible: the weaker one wins.
    expect(must(await h.service.recommend(USER, "gleam")).skillId).toBe("a");
    h.learnerState.estimates = [
      estimate("a", 1240, { lastIndependentSuccessAt: "2026-09-20T00:00:00.000Z" }),
      estimate("b", 1150),
    ];
    expect(must(await h.service.recommend(USER, "gleam")).skillId).toBe("b");
  });

  it("forces the requested focus skill even when it is not eligible yet", async () => {
    h = await setup(skills, exs);
    const s = must(await start(h, { focusSkill: sk("b") }));
    const focus = s.items.find((i) => i.kind === "focus");
    expect(focus?.skillId).toBe("b");
    expect(focus?.reason).toContain("선택한 기술");
    const unknown = await h.service.recommend(USER, "gleam", sk("zzz"));
    expect(unknown.ok ? null : unknown.error.code).toBe("not_found");
  });

  it("prefers expected success in the 0.6..0.9 band, then closest to 0.8", async () => {
    h = await setup(
      [skill("a", 1)],
      [
        exercise("e1", "base", "a", { difficulty: 1000 }),
        exercise("e2", "base", "a", { difficulty: 1300 }),
        exercise("e3", "base", "a", { difficulty: 1600 }),
      ],
      { estimates: [estimate("a", 1400)], esByDifficulty: { 1000: 0.92, 1300: 0.66, 1600: 0.4 } },
    );
    const rec = must(await h.service.recommend(USER, "gleam"));
    expect(rec.exerciseId).toBe("e2/base@1");
    expect(rec.expectedSuccess).toBe(0.66);
    expect(rec.reason).toContain("66%");

    h.learnerState.esByDifficulty = { 1000: 0.85, 1300: 0.66, 1600: 0.4 };
    expect(must(await h.service.recommend(USER, "gleam")).exerciseId).toBe("e1/base@1");
  });

  it("skips exercises the user already passed, falling back when everything is passed", async () => {
    h = await setup(
      [skill("a", 1)],
      [exercise("a1", "base", "a", { difficulty: 1200 }), exercise("a2", "base", "a", { difficulty: 1300 })],
    );
    expect(must(await h.service.recommend(USER, "gleam")).exerciseId).toBe("a1/base@1");
    await h.evaluate("a1/base@1", "failed_tests");
    expect(must(await h.service.recommend(USER, "gleam")).exerciseId).toBe("a1/base@1");
    await h.evaluate("a1/base@1", "passed");
    expect(must(await h.service.recommend(USER, "gleam")).exerciseId).toBe("a2/base@1");
    await h.evaluate("a2/base@1", "passed");
    expect(must(await h.service.recommend(USER, "gleam")).exerciseId).toBe("a1/base@1");
  });

  it("moves to the next weakest skill when the weakest has only passed exercises", async () => {
    h = await setup(
      [skill("a", 1), skill("b", 2)],
      [exercise("a1", "base", "a"), exercise("b1", "base", "b")],
      { estimates: [estimate("a", 1100), estimate("b", 1300)] },
    );
    await h.evaluate("a1/base@1", "passed");
    expect(must(await h.service.recommend(USER, "gleam")).skillId).toBe("b");
  });

  it("avoids families used in the last sessions when an alternative exists", async () => {
    h = await setup(
      [skill("a", 1)],
      [exercise("f1", "base", "a", { difficulty: 1200 }), exercise("f2", "base", "a", { difficulty: 1210 })],
    );
    const first = must(await start(h));
    expect(first.items.map((i) => i.exerciseId)).toEqual(["f1/base@1"]);
    const second = must(await start(h));
    expect(second.items.map((i) => i.exerciseId)).toEqual(["f2/base@1"]);
  });
});

describe("session composition", () => {
  it("adds a variation from the same family with a different variant", async () => {
    h = await setup(
      [skill("a", 1)],
      [
        exercise("f1", "base", "a", { difficulty: 1200 }),
        exercise("f1", "alt", "a", { difficulty: 1220, title: "쿠폰 적용 변형" }),
        exercise("f2", "base", "a", { difficulty: 1200, contextTags: ["users"] }),
      ],
    );
    const s = must(await start(h));
    expect(s.items.map((i) => [i.kind, i.exerciseId, i.status])).toEqual([
      ["focus", "f1/base@1", "in_progress"],
      ["variation", "f1/alt@1", "pending"],
    ]);
    expect(s.items[1]?.reason).toContain("다른 변형");
  });

  it("falls back to another exercise of the skill with a different context tag", async () => {
    h = await setup(
      [skill("a", 1)],
      [
        exercise("f1", "base", "a", { difficulty: 1200, contextTags: ["orders"] }),
        exercise("f2", "base", "a", { difficulty: 1200, contextTags: ["orders"] }),
        exercise("f3", "base", "a", { difficulty: 1400, contextTags: ["users"] }),
      ],
    );
    const s = must(await start(h));
    expect(s.items.map((i) => [i.kind, i.exerciseId])).toEqual([
      ["focus", "f1/base@1"],
      ["variation", "f3/base@1"],
    ]);
    expect(s.items[1]?.reason).toContain("다른 맥락");
  });

  it("puts due reviews first, picking an exercise not submitted recently in a different context", async () => {
    h = await setup(
      [skill("a", 1), skill("r", 2)],
      [
        exercise("a1", "base", "a"),
        exercise("r1", "base", "r", { contextTags: ["orders"] }),
        exercise("r2", "base", "r", { contextTags: ["orders"] }),
        exercise("r3", "base", "r", { contextTags: ["users"], difficulty: 1500 }),
      ],
      {
        estimates: [estimate("a", 1300), estimate("r", 1350)],
        reviews: [review("r", "2026-09-29T00:00:00.000Z"), review("a", "2026-12-01T00:00:00.000Z")],
      },
    );
    h.clock.set("2026-09-28T00:00:00.000Z");
    await h.evaluate("r1/base@1", "passed");
    h.clock.set("2026-09-30T09:00:00.000Z");

    const s = must(await start(h));
    expect(s.items.map((i) => [i.kind, i.exerciseId])).toEqual([
      ["review", "r3/base@1"],
      ["focus", "a1/base@1"],
    ]);
    expect(s.items[0]?.reason).toBe("복습 예정: 기술-r");
  });

  it("fits items into targetMinutes but always keeps at least the focus item", async () => {
    const exs = [
      exercise("f1", "base", "a", { estimatedMinutes: 10 }),
      exercise("f1", "alt", "a", { estimatedMinutes: 4, difficulty: 1250 }),
      exercise("r1", "base", "r", { estimatedMinutes: 4 }),
    ];
    const learner = { reviews: [review("r", "2026-09-29T00:00:00.000Z")] };
    h = await setup([skill("a", 1), skill("r", 2, ["a"])], exs, learner);
    const kinds = async (targetMinutes: number) =>
      must(await start(h!, { targetMinutes })).items.map((i) => `${i.kind}:${i.exerciseId}`);

    expect(await kinds(5)).toEqual(["focus:f1/base@1"]);
    expect(await kinds(14)).toEqual(["review:r1/base@1", "focus:f1/base@1"]);
    expect(await kinds(18)).toEqual(["review:r1/base@1", "focus:f1/base@1", "variation:f1/alt@1"]);
  });

  it("appends one challenge outside the minutes budget when requested", async () => {
    h = await setup(
      [skill("a", 1)],
      [
        exercise("f1", "base", "a", { estimatedMinutes: 5 }),
        exercise("c1", "base", "a", { format: "challenge", estimatedMinutes: 40 }),
      ],
    );
    const without = must(await start(h, { targetMinutes: 5 }));
    expect(without.items.map((i) => i.kind)).toEqual(["focus"]);
    const s = must(await start(h, { targetMinutes: 5, includeChallenge: true }));
    expect(s.items.map((i) => `${i.kind}:${i.exerciseId}`)).toEqual(["focus:f1/base@1", "challenge:c1/base@1"]);
    expect(s.items[1]?.reason).toContain("도전 과제");
  });

  it("rejects an invalid target duration", async () => {
    h = await setup([skill("a", 1)], [exercise("f1", "base", "a")]);
    const r = await start(h, { targetMinutes: 0 });
    expect(r.ok ? null : r.error.code).toBe("invalid_input");
  });

  it("does not treat reviews due later as due now", async () => {
    h = await setup(
      [skill("a", 1), skill("r", 2)],
      [exercise("a1", "base", "a"), exercise("r1", "base", "r")],
      { estimates: [estimate("a", 1100), estimate("r", 1300)], reviews: [review("r", new Date(Date.parse("2026-09-30T09:00:00.000Z") + DAY_MS).toISOString())] },
    );
    const s = must(await start(h));
    expect(s.items.map((i) => i.kind)).toEqual(["focus"]);
  });
});
