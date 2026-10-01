import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { QUIZ_TTL_MS } from "../src/service.ts";
import { answerOfPrompt, answersFor, createHarness, OTHER_USER, unwrap, USER, type Harness } from "./fakes.ts";

let h: Harness;
beforeEach(async () => {
  h = await createHarness();
});
afterEach(async () => {
  await h.db.close();
});

describe("startCheckpoint", () => {
  it("samples 6-10 items from the unit's lessons, mixing types, without answers", async () => {
    const quiz = unwrap(await h.service.startCheckpoint(USER, "ua", "en"));
    expect(quiz).toMatchObject({ kind: "checkpoint", unitId: "ua", passThreshold: 0.8 });
    expect(quiz.items).toHaveLength(6);
    const lessons = new Set(quiz.items.map((i) => answerOfPrompt(i.prompt).lessonId));
    expect(lessons).toEqual(new Set(["la1", "la2"]));
    expect(new Set(quiz.items.map((i) => i.type))).toEqual(new Set(["choice", "predict"]));
    expect(quiz.items[0]?.prompt.startsWith("[en] ")).toBe(true);
    const json = JSON.stringify(quiz);
    expect(json).not.toContain("answer");
    // item ids are opaque; refs only appear in the review backlink
    expect(quiz.items.map((i) => i.itemId)).toEqual(["i1", "i2", "i3", "i4", "i5", "i6"]);
  });

  it("unknown unit is not_found", async () => {
    const r = await h.service.startCheckpoint(USER, "zz", "en");
    expect(r.ok ? null : r.error).toMatchObject({ code: "not_found", message: "Unit not found: zz" });
  });
});

describe("submitCheckpoint", () => {
  it("passes at >= 80%, records one rated observation per item, publishes once and is idempotent", async () => {
    const quiz = unwrap(await h.service.startCheckpoint(USER, "ua"));
    const res = unwrap(await h.service.submitCheckpoint(USER, quiz.quizId, answersFor(quiz, (_u, i) => i !== 0)));
    expect(res).toMatchObject({ quizId: quiz.quizId, unitId: "ua", score: 5, total: 6, passed: true });

    expect(h.observations).toHaveLength(6);
    const first = quiz.items[0];
    if (!first) throw new Error("no items");
    const ref = answerOfPrompt(first.prompt);
    const obs = h.observations.find((o) => o.submissionId === `lesson-quiz:${quiz.quizId}:${first.itemId}`);
    expect(obs).toMatchObject({
      userId: USER,
      exerciseId: `lesson:ua/${ref.lessonId}#${ref.exerciseId}`,
      skillId: "gleam-basics",
      language: "gleam",
      difficulty: first.type === "predict" ? 950 : 900,
      success: false,
      rated: true,
      errorTags: [],
      occurredAt: "2026-09-30T00:00:00.000Z",
    });
    expect(h.observations.filter((o) => o.success)).toHaveLength(5);
    expect(res.ratingChanges).toEqual([{ skillId: "gleam-basics", before: 1200, after: 1240, provisional: true }]);
    expect(h.events.map((e) => e.type)).toEqual(["lessons.checkpoint_passed"]);
    expect(h.events[0]?.payload).toEqual({ userId: USER, unitId: "ua", score: 5, total: 6 });

    // Resubmitting (even with other answers) returns the stored result and records nothing new.
    const again = unwrap(await h.service.submitCheckpoint(USER, quiz.quizId, {}));
    expect(again.score).toBe(5);
    expect(again.review).toEqual(res.review);
    expect(again.ratingChanges).toEqual(res.ratingChanges);
    expect(h.observations).toHaveLength(6);
    expect(h.events).toHaveLength(1);

    const course = await h.service.course(USER);
    const ua = course.units.find((u) => u.id === "ua");
    expect(ua?.progress).toMatchObject({ checkpointPassed: true, passedByPlacement: false });
    expect(ua?.progress.checkpointBest).toBeCloseTo(5 / 6);
  });

  it("fails below 80%: no event, best score kept, review explains each item", async () => {
    const quiz = unwrap(await h.service.startCheckpoint(USER, "ua", "en"));
    const answers: Record<string, number | null> = answersFor(quiz, (_u, i) => i >= 2);
    const skipped = quiz.items[1]?.itemId as string;
    answers[skipped] = null;
    const res = unwrap(await h.service.submitCheckpoint(USER, quiz.quizId, answers, "en"));
    expect(res).toMatchObject({ score: 4, total: 6, passed: false });
    expect(h.events).toEqual([]);
    expect(h.observations.map((o) => o.success)).toEqual([false, false, true, true, true, true]);

    const r0 = res.review[0];
    const item0 = quiz.items[0];
    if (!r0 || !item0) throw new Error("missing");
    const ref = answerOfPrompt(item0.prompt);
    expect(r0).toMatchObject({ correct: false, correctIndex: ref.answer, backlink: `ua/${ref.lessonId}#${ref.exerciseId}` });
    const chosen = (ref.answer + 1) % 4;
    expect(r0.chosen).toBe(chosen);
    expect(r0.feedback).toBe(chosen === 3 ? "Not quite. Give it another think." : `[en] 오답 ${chosen}`);
    expect(res.review[1]).toMatchObject({ chosen: null, correct: false, feedback: "You skipped this one." });
    expect(res.review[2]).toMatchObject({ correct: true, feedback: "[en] 정답 해설" });

    const ua = (await h.service.course(USER)).units.find((u) => u.id === "ua");
    expect(ua?.progress.checkpointPassed).toBe(false);
    expect(ua?.progress.checkpointBest).toBeCloseTo(4 / 6);
  });

  it("review renders in the locale of each request", async () => {
    const quiz = unwrap(await h.service.startCheckpoint(USER, "ua"));
    const res = unwrap(await h.service.submitCheckpoint(USER, quiz.quizId, answersFor(quiz, () => true), "zh"));
    expect(res.review[0]?.feedback).toBe("[zh] 정답 해설");
    const ko = unwrap(await h.service.submitCheckpoint(USER, quiz.quizId, {}, "ko"));
    expect(ko.review[0]?.feedback).toBe("정답 해설");
  });

  it("rejects other users, wrong quiz kinds and expired quizzes with localized errors", async () => {
    const quiz = unwrap(await h.service.startCheckpoint(USER, "ua"));
    const other = await h.service.submitCheckpoint(OTHER_USER, quiz.quizId, {}, "en");
    expect(other.ok ? null : other.error).toMatchObject({ code: "not_found", message: "Quiz not found, or it isn't yours." });
    const unknown = await h.service.submitCheckpoint(USER, "nope", {}, "zh");
    expect(unknown.ok ? null : unknown.error).toMatchObject({ code: "not_found", message: "找不到该测验，或它不属于你。" });
    const placement = unwrap(await h.service.startPlacement(USER));
    const wrongKind = await h.service.submitCheckpoint(USER, placement.quizId, {});
    expect(wrongKind.ok ? null : wrongKind.error.code).toBe("not_found");

    h.clock.advance(QUIZ_TTL_MS + 1);
    const expired = await h.service.submitCheckpoint(USER, quiz.quizId, {}, "en");
    expect(expired.ok ? null : expired.error).toMatchObject({ code: "conflict", message: "This quiz has expired. Please start a new one." });
    expect(h.observations).toEqual([]);
  });

  it("a submitted quiz stays readable after it would have expired", async () => {
    const quiz = unwrap(await h.service.startCheckpoint(USER, "ub"));
    unwrap(await h.service.submitCheckpoint(USER, quiz.quizId, answersFor(quiz, () => true)));
    h.clock.advance(QUIZ_TTL_MS * 3);
    const again = unwrap(await h.service.submitCheckpoint(USER, quiz.quizId, {}));
    expect(again).toMatchObject({ passed: true, score: 4, total: 4 });
    expect(h.observations.every((o) => o.difficulty === 1000 || o.difficulty === 1050)).toBe(true);
    expect(h.observations.every((o) => o.skillId === "gleam-types")).toBe(true);
  });

  it("concurrent submits store one outcome and publish one event", async () => {
    const quiz = unwrap(await h.service.startCheckpoint(USER, "ua"));
    const answers = answersFor(quiz, () => true);
    const [a, b] = await Promise.all([
      h.service.submitCheckpoint(USER, quiz.quizId, answers),
      h.service.submitCheckpoint(USER, quiz.quizId, answers),
    ]);
    expect(unwrap(a).score).toBe(6);
    expect(unwrap(b).score).toBe(6);
    expect(h.events).toHaveLength(1);
    expect(h.observations).toHaveLength(6);
  });
});
