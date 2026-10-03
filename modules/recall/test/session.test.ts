import { afterEach, describe, expect, it } from "vitest";
import { DAY_MS } from "../src/internal/policy/fsrs-v1.ts";
import type { CardProgress, StageNumber } from "../src/internal/progress.ts";
import { buildSession, interleaveByTopic, sessionCost, type CardRef } from "../src/internal/session-builder.ts";
import type { RecallSessionView } from "../src/contract/index.ts";
import { createHarness, RECOGNIZE_ANSWER, unwrap, unwrapErr, USER, type Harness } from "./fakes.ts";

const NOW = new Date("2026-09-30T09:00:00.000Z");
const iso = (offsetDays: number) => new Date(NOW.getTime() + offsetDays * DAY_MS).toISOString();

function progress(stage: StageNumber, dueInDays: number, firstSeenDaysAgo = 30, extra: Partial<CardProgress> = {}): CardProgress {
  return {
    memory: { difficulty: 5, stability: 5, reps: 3, lapses: 0, lastReviewAt: iso(-5) },
    stage,
    dueAt: iso(dueInDays),
    lastAnswerAt: iso(-5),
    firstSeenAt: iso(-firstSeenDaysAgo),
    lastStage1Form: null,
    lastProduceCorrect: null,
    policyVersion: "fsrs-v1",
    ...extra,
  };
}

const ref = (id: string, topic: string, hasPredict = false): CardRef => ({ id, topic, hasPredict });

describe("buildSession (pure)", () => {
  it("reviews come most overdue first, in the form of the current stage", () => {
    const cards = [ref("a", "x"), ref("b", "y"), ref("c", "z", true)];
    const map = new Map([
      ["a", progress(0, -1)],
      ["b", progress(2, -3)],
      ["c", progress(1, -2, 30, { lastStage1Form: "cloze" })],
    ]);
    const items = buildSession({ now: NOW, budgetSec: 600, cards, progress: map, newAllowed: 0 });
    expect(items.map((i) => [i.itemId, i.kind, i.form])).toEqual([
      ["review:produce:b", "review", "produce"],
      ["review:predict:c", "review", "predict"],
      ["review:recognize:a", "review", "recognize"],
    ]);
  });

  it("never puts more than two cards with the same topic in a row when another topic is available", () => {
    const cards = [
      ...["l1", "l2", "l3", "l4", "l5"].map((id) => ref(id, "gleam/list")),
      ref("s1", "gleam/string"),
      ref("d1", "gleam/dict"),
    ];
    // list cards are the most overdue
    const map = new Map<string, CardProgress>([
      ["l1", progress(0, -9)],
      ["l2", progress(0, -8)],
      ["l3", progress(0, -7)],
      ["l4", progress(0, -6)],
      ["l5", progress(0, -5)],
      ["s1", progress(0, -2)],
      ["d1", progress(0, -1)],
    ]);
    const items = buildSession({ now: NOW, budgetSec: 3600, cards, progress: map, newAllowed: 0 });
    const topics = items.map((i) => cards.find((c) => c.id === i.cardId)!.topic);
    expect(items.map((i) => i.cardId)).toEqual(["l1", "l2", "s1", "l3", "l4", "d1", "l5"]);
    for (let i = 2; i < topics.length - 1; i++) expect(topics[i] === topics[i - 1] && topics[i] === topics[i - 2]).toBe(false);
    expect(interleaveByTopic(["a", "a", "a"], (x) => x)).toEqual(["a", "a", "a"]); // unavoidable
  });

  it("stays within the minutes budget", () => {
    const cards = Array.from({ length: 40 }, (_, i) => ref(`c${i}`, `t${i % 3}`));
    const map = new Map<string, CardProgress>();
    cards.slice(0, 30).forEach((c, i) => map.set(c.id, progress((i % 3) as StageNumber, -1 - i)));
    for (const minutes of [2, 5, 10, 20]) {
      const items = buildSession({ now: NOW, budgetSec: minutes * 60, cards, progress: map, newAllowed: 10 });
      expect(items.length).toBeGreaterThan(0);
      expect(sessionCost(items)).toBeLessThanOrEqual(minutes * 60);
    }
  });

  it("new cards follow reviews, then mix (recent + today's new at stage 1), then a produce finale", () => {
    const cards = [ref("r1", "x"), ref("old", "y", true), ref("m2", "z"), ref("n1", "x", true), ref("n2", "y")];
    const map = new Map<string, CardProgress>([
      ["r1", progress(0, -1)],
      ["old", progress(1, 3, 2, { lastStage1Form: "cloze" })], // recent (2 days ago), not due
      ["m2", progress(2, 5)], // stage 2, not due -> finale
    ]);
    const items = buildSession({ now: NOW, budgetSec: 600, cards, progress: map, newAllowed: 5 });
    expect(items.map((i) => i.itemId)).toEqual([
      "review:recognize:r1",
      "new:recognize:n1",
      "new:recognize:n2",
      "mix:predict:old",
      "mix:cloze:n1",
      "mix:cloze:n2",
      "finale:produce:m2",
    ]);
  });

  it("with nothing due and no new cards: practice of the weakest cards (stage-1 forms, then produce)", () => {
    const cards = [ref("a", "x"), ref("b", "y"), ref("c", "z")];
    const map = new Map<string, CardProgress>([
      ["a", progress(2, 9)],
      ["b", progress(1, 9)],
      ["c", progress(1, 9, 30, { memory: { difficulty: 5, stability: 2, reps: 3, lapses: 2, lastReviewAt: iso(-5) } })],
    ]);
    const items = buildSession({ now: NOW, budgetSec: 600, cards, progress: map, newAllowed: 0 });
    expect(items.map((i) => i.itemId)).toEqual(["mix:cloze:c", "mix:cloze:b", "finale:produce:a"]);
    expect(buildSession({ now: NOW, budgetSec: 600, cards, progress: new Map(), newAllowed: 0 })).toEqual([]);
  });
});

describe("startSession (service)", () => {
  let h: Harness;
  afterEach(async () => {
    await h.db.close();
  });

  async function answerAll(view: RecallSessionView, filter: (kind: string) => boolean = () => true) {
    for (const item of view.items) {
      if (!filter(item.kind)) continue;
      const response =
        item.form === "recognize"
          ? { kind: "choice" as const, choice: RECOGNIZE_ANSWER }
          : item.form === "produce"
            ? { kind: "code" as const, body: "list.fold(xs, 0, fn(a, x) { a + x })" }
            : { kind: "text" as const, text: item.form === "cloze" ? "fold" : '#("a b", [1, 2])' };
      unwrap(await h.service.answer(USER, view.sessionId, item.itemId, response, 10_000));
    }
  }

  it("a fresh user gets new cards in deck order then card order, each with a stage-1 mix item", async () => {
    h = await createHarness({ newCardsPerDay: 3 });
    const view = unwrap(await h.service.startSession(USER));
    expect(view.items.map((i) => i.itemId)).toEqual([
      "new:recognize:l1",
      "new:recognize:l2",
      "new:recognize:l3",
      "mix:cloze:l1",
      "mix:cloze:l2",
      "mix:cloze:l3",
    ]);
    expect(view.items[0]!.card.summary).toBe("요약");
    expect(view.startedAt).toBe("2026-09-30T09:00:00.000Z");
  });

  it("caps first-seen cards per UTC day across sessions", async () => {
    h = await createHarness({ newCardsPerDay: 3 });
    const first = unwrap(await h.service.startSession(USER));
    await answerAll(first, (k) => k === "new");
    expect((await h.service.overview(USER)).newAvailableToday).toBe(0);

    // Same day: cap used up and nothing due -> practice of the weakest cards, no new ones.
    const again = unwrap(await h.service.startSession(USER));
    expect(again.items.some((i) => i.kind === "new")).toBe(false);
    expect(again.items.every((i) => i.kind === "mix" && i.form === "cloze")).toBe(true);
    expect(new Set(again.items.map((i) => i.card.id))).toEqual(new Set(["l1", "l2", "l3"]));

    // An unanswered session does not consume the cap.
    h.clock.set("2026-10-01T00:30:00.000Z");
    const unanswered = unwrap(await h.service.startSession(USER));
    expect(unanswered.items.filter((i) => i.kind === "new").map((i) => i.card.id)).toEqual(["l4", "t1", "t2"]);
    const next = unwrap(await h.service.startSession(USER));
    expect(next.items.filter((i) => i.kind === "new").map((i) => i.card.id)).toEqual(["l4", "t1", "t2"]);
  });

  it("respects the minutes budget", async () => {
    h = await createHarness();
    const two = unwrap(await h.service.startSession(USER, { minutes: 2 }));
    expect(two.items.map((i) => i.itemId)).toEqual(["new:recognize:l1", "mix:cloze:l1"]);
    const ten = unwrap(await h.service.startSession(USER));
    expect(ten.items.filter((i) => i.kind === "new")).toHaveLength(8); // 8 x (40 + 30) s <= 600 s
    expect(unwrapErr(await h.service.startSession(USER, { minutes: 0 })).code).toBe("invalid_input");
    expect(unwrapErr(await h.service.startSession(USER, { minutes: Number.NaN })).code).toBe("invalid_input");
  });

  it("filters by deck and rejects unknown decks", async () => {
    h = await createHarness();
    const view = unwrap(await h.service.startSession(USER, { deckIds: ["syntax"] }));
    expect(new Set(view.items.map((i) => i.card.deckId))).toEqual(new Set(["syntax"]));
    expect(view.items.filter((i) => i.kind === "new").map((i) => i.card.id)).toEqual(["s1", "s2", "s3"]);
    const e = unwrapErr(await h.service.startSession(USER, { deckIds: ["syntax", "nope"] }));
    expect(e.code).toBe("invalid_input");
    expect(e.details).toEqual({ deckId: "nope" });
  });

  it("due reviews are interleaved and use the current stage; stage-2 cards come back as produce", async () => {
    h = await createHarness({ newCardsPerDay: 10 });
    const first = unwrap(await h.service.startSession(USER, { minutes: 60 }));
    await answerAll(first); // recognize + cloze correct -> stage 2 for every new card
    h.clock.set("2026-10-20T09:00:00.000Z");
    const view = unwrap(await h.service.startSession(USER, { minutes: 60 }));
    const reviews = view.items.filter((i) => i.kind === "review");
    expect(reviews.length).toBe(10);
    expect(reviews.every((i) => i.form === "produce")).toBe(true);
    const topics = reviews.map((i) => i.card.topic);
    for (let i = 2; i < topics.length; i++) {
      if (topics[i] === topics[i - 1] && topics[i] === topics[i - 2]) {
        // only allowed when no other topic remains
        expect(new Set(topics.slice(i)).size).toBe(1);
      }
    }
    expect(view.items.filter((i) => i.kind === "new").map((i) => i.card.id)).toEqual(["s3"]);
  });

  it("an empty catalog gives an empty session", async () => {
    h = await createHarness({ cards: [] });
    const view = unwrap(await h.service.startSession(USER));
    expect(view.items).toEqual([]);
    expect(unwrap(await h.service.finish(USER, view.sessionId))).toMatchObject({ answered: 0, correct: 0, newLearned: 0 });
  });

  it("sessions survive a restart (new module instance on the same database)", async () => {
    h = await createHarness({ newCardsPerDay: 2 });
    const view = unwrap(await h.service.startSession(USER));
    const first = view.items[0]!;
    const r1 = unwrap(await h.service.answer(USER, view.sessionId, first.itemId, { kind: "choice", choice: RECOGNIZE_ANSWER }, 3000));
    h.restart();
    // the stored answer is returned by the new instance, and the rest of the session can be answered
    expect(unwrap(await h.service.answer(USER, view.sessionId, first.itemId, { kind: "choice", choice: 0 }, 3000))).toEqual(r1);
    await answerAll({ ...view, items: view.items.slice(1) });
    const summary = unwrap(await h.service.finish(USER, view.sessionId));
    expect(summary).toMatchObject({ answered: 4, correct: 4, newLearned: 2 });
  });
});
