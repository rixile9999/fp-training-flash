import { describe, expect, it } from "vitest";
import { activePolicy, AGAIN_DELAY_MS, createFsrs, DAY_MS, fsrsV1, type MemoryState } from "../src/internal/policy/fsrs-v1.ts";
import { applyAnswer, deriveRating, isMastered, nextStage, replayCard, stage1Form, type AnswerFact, type CardProgress } from "../src/internal/progress.ts";

const T0 = new Date("2026-09-30T09:00:00.000Z");
const days = (d: Date, n: number) => new Date(d.getTime() + n * DAY_MS);
const dueDays = (state: MemoryState, rating: "again" | "hard" | "good" | "easy", at: Date) =>
  (fsrsV1.dueAfter(state, rating, at).getTime() - at.getTime()) / DAY_MS;

describe("fsrs-v1", () => {
  it("is the active, versioned policy with retention 0.9", () => {
    expect(activePolicy.version).toBe("fsrs-v1");
    expect(activePolicy.desiredRetention).toBe(0.9);
  });

  it("first ratings use the FSRS-5 initial stabilities and difficulties", () => {
    const good = fsrsV1.review(null, "good", T0);
    expect(good.stability).toBeCloseTo(3.173, 3);
    expect(good.difficulty).toBeCloseTo(7.1949 - Math.exp(0.5345 * 2) + 1, 4);
    expect(good.reps).toBe(1);
    expect(good.lapses).toBe(0);
    expect(dueDays(good, "good", T0)).toBe(3);
    expect(dueDays(fsrsV1.review(null, "easy", T0), "easy", T0)).toBe(16);
    expect(dueDays(fsrsV1.review(null, "hard", T0), "hard", T0)).toBe(1);
  });

  it("at retention 0.9 the interval equals the stability (rounded, 1..365 days)", () => {
    expect(fsrsV1.intervalDays(0.2)).toBe(1);
    expect(fsrsV1.intervalDays(7.4)).toBe(7);
    expect(fsrsV1.intervalDays(5000)).toBe(365);
    expect(fsrsV1.retrievability(10, 10)).toBeCloseTo(0.9, 6);
    expect(createFsrs(undefined, 0.8).intervalDays(10)).toBeGreaterThan(10);
  });

  it("intervals grow with consecutive good answers on the due date, faster with easy", () => {
    let s = fsrsV1.review(null, "good", T0);
    let at = T0;
    const intervals: number[] = [];
    for (let i = 0; i < 5; i++) {
      const next = fsrsV1.dueAfter(s, "good", at);
      intervals.push(Math.round((next.getTime() - at.getTime()) / DAY_MS));
      at = next;
      s = fsrsV1.review(s, "good", at);
    }
    for (let i = 1; i < intervals.length; i++) expect(intervals[i]).toBeGreaterThan(intervals[i - 1] as number);

    const base = fsrsV1.review(null, "good", T0);
    const at3 = days(T0, 3);
    const hard = fsrsV1.review(base, "hard", at3);
    const good = fsrsV1.review(base, "good", at3);
    const easy = fsrsV1.review(base, "easy", at3);
    expect(hard.stability).toBeLessThan(good.stability);
    expect(good.stability).toBeLessThan(easy.stability);
    expect(easy.difficulty).toBeLessThan(good.difficulty);
    expect(hard.difficulty).toBeGreaterThan(good.difficulty);
  });

  it("again resets: due in 10 minutes, lower stability, one more lapse, higher difficulty", () => {
    const s1 = fsrsV1.review(fsrsV1.review(null, "good", T0), "good", days(T0, 3));
    const at = days(T0, 15);
    const lapsed = fsrsV1.review(s1, "again", at);
    expect(lapsed.stability).toBeLessThan(s1.stability);
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.reps).toBe(3);
    expect(lapsed.difficulty).toBeGreaterThan(s1.difficulty);
    expect(fsrsV1.dueAfter(lapsed, "again", at).getTime() - at.getTime()).toBe(AGAIN_DELAY_MS);
  });
});

describe("ratings", () => {
  it("wrong = again; slow = hard; fast at stage >= 1 = easy; else good", () => {
    expect(deriveRating("produce", false, 1000)).toBe("again");
    expect(deriveRating("recognize", true, 15_001)).toBe("hard");
    expect(deriveRating("recognize", true, 1000)).toBe("good"); // never easy at stage 0
    expect(deriveRating("recognize", true, 15_000)).toBe("good");
    expect(deriveRating("cloze", true, 25_001)).toBe("hard");
    expect(deriveRating("predict", true, 7_999)).toBe("easy");
    expect(deriveRating("cloze", true, 8_000)).toBe("good");
    expect(deriveRating("produce", true, 150_001)).toBe("hard");
    expect(deriveRating("produce", true, 44_999)).toBe("easy");
    expect(deriveRating("produce", true, 60_000)).toBe("good");
  });
});

describe("stages", () => {
  it("correct at the current stage promotes (max 2); wrong at a form >= stage drops (min 0)", () => {
    expect(nextStage(0, "recognize", true)).toBe(1);
    expect(nextStage(1, "cloze", true)).toBe(2);
    expect(nextStage(1, "predict", true)).toBe(2);
    expect(nextStage(2, "produce", true)).toBe(2);
    expect(nextStage(1, "recognize", true)).toBe(1); // lower form: no promotion
    expect(nextStage(0, "cloze", true)).toBe(0); // higher form, correct: no jump
    expect(nextStage(2, "produce", false)).toBe(1);
    expect(nextStage(1, "produce", false)).toBe(0);
    expect(nextStage(0, "recognize", false)).toBe(0);
    expect(nextStage(2, "cloze", false)).toBe(2); // lower form wrong: no drop
  });

  it("stage-1 form alternates between cloze and predict when the card has predict", () => {
    const p = (last: "cloze" | "predict" | null) => ({ lastStage1Form: last }) as CardProgress;
    expect(stage1Form(null, true)).toBe("cloze");
    expect(stage1Form(p("cloze"), true)).toBe("predict");
    expect(stage1Form(p("predict"), true)).toBe("cloze");
    expect(stage1Form(p("cloze"), false)).toBe("cloze");
  });
});

describe("applyAnswer", () => {
  const fact = (form: AnswerFact["form"], correct: boolean, at: Date, rating = correct ? "good" : "again"): AnswerFact => ({
    form,
    correct,
    rating: rating as AnswerFact["rating"],
    at,
  });

  it("only the first graded answer of a UTC day updates memory; later ones move only the stage", () => {
    const a = applyAnswer(null, fact("recognize", true, T0));
    expect(a.memoryUpdated).toBe(true);
    expect(a.progress.stage).toBe(1);
    expect(a.progress.memory.reps).toBe(1);

    const later = new Date("2026-09-30T23:59:00.000Z");
    const b = applyAnswer(a.progress, fact("cloze", true, later, "easy"));
    expect(b.memoryUpdated).toBe(false);
    expect(b.progress.memory).toEqual(a.progress.memory);
    expect(b.progress.stage).toBe(2);
    expect(b.progress.lastStage1Form).toBe("cloze");

    const c = applyAnswer(b.progress, fact("produce", false, later));
    expect(c.memoryUpdated).toBe(false);
    expect(c.progress.memory.lapses).toBe(0);
    expect(c.progress.stage).toBe(1);
    expect(c.progress.dueAt).toBe(new Date(later.getTime() + AGAIN_DELAY_MS).toISOString());

    // Next UTC day: memory updates again.
    const d = applyAnswer(c.progress, fact("cloze", true, new Date("2026-10-01T00:01:00.000Z")));
    expect(d.memoryUpdated).toBe(true);
    expect(d.progress.memory.reps).toBe(2);
    expect(d.progress.firstSeenAt).toBe(T0.toISOString());
  });

  it("mastered = stage produce, the latest produce answer correct and stability >= 21 days", () => {
    let p = applyAnswer(null, fact("recognize", true, T0)).progress;
    p = applyAnswer(p, fact("cloze", true, T0)).progress;
    expect(p.stage).toBe(2);
    expect(isMastered(p)).toBe(false);
    p = applyAnswer(p, fact("produce", true, days(T0, 2))).progress;
    expect(p.memory.stability).toBeLessThan(21);
    expect(isMastered(p)).toBe(false); // one good session is not mastery
    for (let i = 0; i < 10 && p.memory.stability < 21; i++) p = applyAnswer(p, fact("produce", true, new Date(p.dueAt))).progress;
    expect(isMastered(p)).toBe(true);
    p = applyAnswer(p, fact("produce", false, new Date(p.dueAt))).progress;
    expect(isMastered(p)).toBe(false);
  });

  it("replaying the log reproduces the live state", () => {
    const log: AnswerFact[] = [
      fact("recognize", true, T0),
      fact("cloze", false, days(T0, 1)),
      fact("cloze", true, days(T0, 1.1)),
      fact("predict", true, days(T0, 4), "easy"),
      fact("produce", true, days(T0, 20), "hard"),
    ];
    let live: CardProgress | null = null;
    for (const f of log) live = applyAnswer(live, f).progress;
    expect(replayCard(log)).toEqual(live);
  });
});
