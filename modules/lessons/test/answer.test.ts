import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createHarness, OTHER_USER, unwrap, USER, type Harness } from "./fakes.ts";

let h: Harness;
beforeEach(async () => {
  h = await createHarness();
});
afterEach(async () => {
  await h.db.close();
});

describe("answer", () => {
  it("correct: returns correctFeedback and correctIndex and marks the exercise solved", async () => {
    const r = unwrap(await h.service.answer(USER, "ua", "la1", "e1", 1));
    expect(r).toEqual({ correct: true, correctIndex: 1, feedback: "정답 해설" });
    const view = unwrap(await h.service.lesson(USER, "ua", "la1"));
    expect(view.solved).toEqual(["e1"]);
    expect(view.completed).toBe(false);
    // per user
    expect(unwrap(await h.service.lesson(OTHER_USER, "ua", "la1")).solved).toEqual([]);
  });

  it("wrong: returns the chosen choice's feedback and hides the correct index", async () => {
    const r = unwrap(await h.service.answer(USER, "ua", "la1", "e1", 0, { locale: "en" }));
    expect(r).toEqual({ correct: false, feedback: "[en] 오답 0" });
    expect("correctIndex" in r).toBe(false);
    expect(unwrap(await h.service.lesson(USER, "ua", "la1")).solved).toEqual([]);
  });

  it("wrong without per-choice feedback falls back to a localized generic line", async () => {
    expect(unwrap(await h.service.answer(USER, "ua", "la1", "e1", 3)).feedback).toBe("아쉽지만 정답이 아니에요. 다시 생각해 보세요.");
    expect(unwrap(await h.service.answer(USER, "ua", "la1", "e1", 3, { locale: "en" })).feedback).toBe("Not quite. Give it another think.");
    expect(unwrap(await h.service.answer(USER, "ua", "la1", "e1", 3, { locale: "zh" })).feedback).toBe("不太对，再想一想。");
  });

  it("feedback follows the requested locale", async () => {
    expect(unwrap(await h.service.answer(USER, "ua", "la1", "e1", 1, { locale: "zh" })).feedback).toBe("[zh] 정답 해설");
    expect(unwrap(await h.service.answer(USER, "ua", "la1", "e1", 2, { locale: "zh" })).feedback).toBe("[zh] 오답 2");
  });

  it("giveUp reveals the answer without counting as solved", async () => {
    const r = unwrap(await h.service.answer(USER, "ua", "la1", "e2", null, { giveUp: true, locale: "en" }));
    expect(r).toEqual({ correct: false, correctIndex: 2, feedback: "[en] 정답 해설" });
    expect(unwrap(await h.service.lesson(USER, "ua", "la1")).solved).toEqual([]);
  });

  it("retries are unlimited and a later correct answer solves the exercise", async () => {
    unwrap(await h.service.answer(USER, "ua", "la1", "e3", 1));
    unwrap(await h.service.answer(USER, "ua", "la1", "e3", 2));
    unwrap(await h.service.answer(USER, "ua", "la1", "e3", 0));
    unwrap(await h.service.answer(USER, "ua", "la1", "e3", 0));
    expect(unwrap(await h.service.lesson(USER, "ua", "la1")).solved).toEqual(["e3"]);
    expect(h.observations).toEqual([]); // lessons are unrated
  });

  it("rejects missing and out-of-range choices with localized invalid_input", async () => {
    const none = await h.service.answer(USER, "ua", "la1", "e1", null, { locale: "en" });
    expect(none.ok ? null : none.error).toMatchObject({ code: "invalid_input", message: "Pick one of the choices." });
    const out = await h.service.answer(USER, "ua", "la1", "e1", 4, { locale: "zh" });
    expect(out.ok ? null : out.error).toMatchObject({ code: "invalid_input", message: "没有这个选项：4" });
    const frac = await h.service.answer(USER, "ua", "la1", "e1", 1.5);
    expect(frac.ok ? null : frac.error.code).toBe("invalid_input");
  });

  it("unknown unit / lesson / exercise are localized not_found errors", async () => {
    const u = await h.service.answer(USER, "zz", "la1", "e1", 0, { locale: "en" });
    expect(u.ok ? null : u.error).toMatchObject({ code: "not_found", message: "Unit not found: zz" });
    const l = await h.service.answer(USER, "ua", "lb1", "e1", 0, { locale: "en" });
    expect(l.ok ? null : l.error).toMatchObject({ code: "not_found", message: "Lesson not found: ua/lb1" });
    const e = await h.service.answer(USER, "ua", "la1", "intro", 0, { locale: "zh" });
    expect(e.ok ? null : e.error).toMatchObject({ code: "not_found", message: "找不到这道题：intro" });
    const v = await h.service.lesson(USER, "ua", "nope", "ko");
    expect(v.ok ? null : v.error).toMatchObject({ code: "not_found", message: "레슨을 찾을 수 없어요: ua/nope" });
  });
});

describe("lesson and completeLesson", () => {
  it("returns the lesson in the requested locale without answers", async () => {
    const view = unwrap(await h.service.lesson(USER, "ua", "la1", "en"));
    expect(view.lesson.title).toBe("[en] 레슨 la1");
    expect(JSON.stringify(view)).not.toContain("answer");
  });

  it("completing is allowed without solving every exercise and is idempotent", async () => {
    const p = unwrap(await h.service.completeLesson(USER, "ua", "la2"));
    expect(p).toMatchObject({ unitId: "ua", lessonsCompleted: ["la2"], checkpointPassed: false, unlocked: true });
    unwrap(await h.service.completeLesson(USER, "ua", "la1"));
    const again = unwrap(await h.service.completeLesson(USER, "ua", "la2"));
    expect(again.lessonsCompleted).toEqual(["la1", "la2"]);
    expect(unwrap(await h.service.lesson(USER, "ua", "la2")).completed).toBe(true);
  });

  it("rejects unknown lessons", async () => {
    const r = await h.service.completeLesson(USER, "ua", "lb1");
    expect(r.ok ? null : r.error.code).toBe("not_found");
  });
});
