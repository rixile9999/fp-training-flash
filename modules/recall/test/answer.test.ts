import { afterEach, describe, expect, it } from "vitest";
import { appError, asId, err } from "@fp/kernel";
import type { UserId } from "@fp/kernel";
import { normalizeValue } from "../src/internal/grade.ts";
import type { RecallItem, RecallResponse, RecallSessionView } from "../src/contract/index.ts";
import { CHECKS, createHarness, defaultSnippet, PRODUCE_EXPECTED, RECOGNIZE_ANSWER, unwrap, unwrapErr, USER, OTHER_USER, type FakeCardSpec, type Harness } from "./fakes.ts";

let h: Harness;
afterEach(async () => {
  await h?.db.close();
  h = undefined!; // tests without a harness must not close the previous one again
});

const user = (n: number) => asId<UserId>(`user-${n}`);
const choice = (c: number): RecallResponse => ({ kind: "choice", choice: c });
const text = (t: string): RecallResponse => ({ kind: "text", text: t });
const code = (body: string): RecallResponse => ({ kind: "code", body });
const REFERENCE = "list.fold(xs, 0, fn(acc, x) { acc + x })";

function item(view: RecallSessionView, itemId: string): RecallItem {
  const found = view.items.find((i) => i.itemId === itemId);
  if (!found) throw new Error(`no ${itemId} in ${view.items.map((i) => i.itemId).join(",")}`);
  return found;
}

/** A fresh session for `u` with one new card (l1): new:recognize:l1, mix:cloze:l1. */
async function fresh(u: UserId = USER): Promise<RecallSessionView> {
  return unwrap(await h.service.startSession(u));
}

/** Brings l1 to stage produce (recognize + cloze correct) and returns a session with finale:produce:l1. */
async function produceSession(u: UserId = USER): Promise<RecallSessionView> {
  const v = await fresh(u);
  unwrap(await h.service.answer(u, v.sessionId, "new:recognize:l1", choice(RECOGNIZE_ANSWER), 3000));
  unwrap(await h.service.answer(u, v.sessionId, "mix:cloze:l1", text("fold"), 10_000));
  const p = unwrap(await h.service.startSession(u));
  item(p, "finale:produce:l1");
  return p;
}

describe("recognize", () => {
  it("correct: card feedback, stage moves to cloze, good -> due in 3 days", async () => {
    h = await createHarness({ newCardsPerDay: 1 });
    const v = await fresh();
    const r = unwrap(await h.service.answer(USER, v.sessionId, "new:recognize:l1", choice(RECOGNIZE_ANSWER), 3000));
    expect(r).toEqual({
      correct: true,
      rating: "good",
      feedback: "정답 해설",
      expected: "b",
      stage: "cloze",
      nextDueAt: "2026-10-03T09:00:00.000Z",
    });
    expect(h.calls).toHaveLength(0);
  });

  it("wrong: the choice's feedback (or a generic line), again -> due in 10 minutes", async () => {
    h = await createHarness({ newCardsPerDay: 1 });
    const r = unwrap(await h.service.answer(USER, (await fresh()).sessionId, "new:recognize:l1", choice(0), 20_000));
    expect(r).toMatchObject({ correct: false, rating: "again", feedback: "오답 0", stage: "recognize", nextDueAt: "2026-09-30T09:10:00.000Z" });
    const g = unwrap(await h.service.answer(OTHER_USER, (await fresh(OTHER_USER)).sessionId, "new:recognize:l1", choice(3), 1000));
    expect(g.feedback).toBe("아쉽지만 정답이 아니에요. 정답: b");
  });

  it("follows the request locale", async () => {
    h = await createHarness({ newCardsPerDay: 1 });
    const a = unwrap(await h.service.answer(user(1), (await fresh(user(1))).sessionId, "new:recognize:l1", choice(1), 1000, "en"));
    expect(a.feedback).toBe("[en] 정답 해설");
    const b = unwrap(await h.service.answer(user(2), (await fresh(user(2))).sessionId, "new:recognize:l1", choice(3), 1000, "en"));
    expect(b.feedback).toBe("Not quite. The answer: b");
    const c = unwrap(await h.service.answer(user(3), (await fresh(user(3))).sessionId, "new:recognize:l1", choice(3), 1000, "zh"));
    expect(c.feedback).toBe("不太对。正确答案：b");
    const view = unwrap(await h.service.startSession(user(4), {}, "zh"));
    expect(view.items[0]!.card.title).toBe("[zh] 카드 l1");
  });

  it("rejects a mismatched response kind or a choice out of range without storing anything", async () => {
    h = await createHarness({ newCardsPerDay: 1 });
    const v = await fresh();
    expect(unwrapErr(await h.service.answer(USER, v.sessionId, "new:recognize:l1", text("1"), 1000)).code).toBe("invalid_input");
    expect(unwrapErr(await h.service.answer(USER, v.sessionId, "new:recognize:l1", choice(4), 1000)).code).toBe("invalid_input");
    expect(unwrapErr(await h.service.answer(USER, v.sessionId, "new:recognize:l1", choice(1), -5)).code).toBe("invalid_input");
    expect(unwrap(await h.service.answer(USER, v.sessionId, "new:recognize:l1", choice(1), 1000)).correct).toBe(true);
  });
});

describe("cloze", () => {
  it("an accepted fill (trimmed) is correct without the sandbox", async () => {
    h = await createHarness({ newCardsPerDay: 1 });
    const r = unwrap(await h.service.answer(USER, (await fresh()).sessionId, "mix:cloze:l1", text("  fold "), 5000));
    expect(r).toMatchObject({ correct: true, rating: "easy", feedback: "맞아요!", expected: "fold" });
    expect(h.calls).toHaveLength(0);
  });

  it("another fill is evaluated in the sandbox and accepted when the value matches", async () => {
    h = await createHarness({ newCardsPerDay: 1 });
    const r = unwrap(await h.service.answer(USER, (await fresh()).sessionId, "mix:cloze:l1", text("fold_right"), 10_000));
    expect(r).toMatchObject({ correct: true, rating: "good", actual: "6", expected: "fold" });
    expect(r.feedback).toBe("준비된 답과는 다르지만 같은 값(6)이 나와서 정답으로 인정해요. 대표 답: fold");
    expect(h.calls).toEqual([{ imports: ["gleam/list"], expression: "list.fold_right([1, 2, 3], 0, fn(acc, x) { acc + x })", locale: "ko" }]);
  });

  it("a different value, a compile error or an empty fill is wrong", async () => {
    h = await createHarness({ newCardsPerDay: 1 });
    const a = unwrap(await h.service.answer(user(1), (await fresh(user(1))).sessionId, "mix:cloze:l1", text("length"), 10_000, "en"));
    expect(a).toMatchObject({ correct: false, rating: "again", actual: "3" });
    expect(a.feedback).toBe("Your fill gives a different value. Expected: 6, yours: 3. The answer: fold");
    const b = unwrap(await h.service.answer(user(2), (await fresh(user(2))).sessionId, "mix:cloze:l1", text("map"), 10_000));
    expect(b.feedback).toBe("채운 코드가 실행되지 않아요. 빈칸 정답: fold");
    const callsBefore = h.calls.length;
    const c = unwrap(await h.service.answer(user(3), (await fresh(user(3))).sessionId, "mix:cloze:l1", text("   "), 10_000));
    expect(c.correct).toBe(false);
    expect(h.calls.length).toBe(callsBefore);
  });
});

describe("predict", () => {
  it("compares the typed value ignoring whitespace outside string literals; alternates with cloze", async () => {
    h = await createHarness({ newCardsPerDay: 1 });
    const v = await fresh();
    unwrap(await h.service.answer(USER, v.sessionId, "new:recognize:l1", choice(1), 3000)); // stage 1
    unwrap(await h.service.answer(USER, v.sessionId, "mix:cloze:l1", text("nope"), 3000)); // wrong cloze -> stage 0, due in 10 min
    h.clock.advance(20 * 60 * 1000);
    const review = unwrap(await h.service.startSession(USER));
    unwrap(await h.service.answer(USER, review.sessionId, item(review, "review:recognize:l1").itemId, choice(1), 3000)); // stage 1
    const practice = unwrap(await h.service.startSession(USER));
    const p = item(practice, "mix:predict:l1");
    expect(p.card.predict?.code).toBe('#("a" <> " b", [1, 2])');

    const r = unwrap(await h.service.answer(USER, practice.sessionId, p.itemId, text(' #( "a b" ,\n [1,2] ) '), 5000));
    expect(r).toMatchObject({ correct: true, rating: "easy", expected: '#("a b", [1, 2])', stage: "produce" });
    expect(r.feedback).toBe('맞아요! 값: #("a b", [1, 2])');
    expect(h.calls).toHaveLength(1); // only the wrong cloze fill went to the sandbox

    const other = unwrap(await h.service.startSession(USER));
    expect(other.items.map((i) => i.itemId)).toEqual(["finale:produce:l1"]);
  });

  it("whitespace inside string literals matters", () => {
    expect(normalizeValue('#("ab", [1, 2])')).toBe('#("ab",[1,2])');
    expect(normalizeValue('#("a b", [1, 2])')).not.toBe(normalizeValue('#("ab", [1, 2])'));
    expect(normalizeValue('"a \\" b"  ')).toBe('"a \\" b"');
  });
});

describe("produce", () => {
  it("correct: wraps the body in the header after the definitions, evaluates checks, needs mustUse tokens", async () => {
    h = await createHarness({ newCardsPerDay: 1 });
    const p = await produceSession();
    const before = h.calls.length;
    const r = unwrap(await h.service.answer(USER, p.sessionId, "finale:produce:l1", code("  list.fold(xs, 0, fn(acc, x) { acc + x })"), 60_000));
    expect(r).toEqual({
      correct: true,
      rating: "good",
      feedback: "모든 검사를 통과했어요!",
      expected: PRODUCE_EXPECTED,
      actual: PRODUCE_EXPECTED,
      reference: REFERENCE,
      stage: "produce",
      nextDueAt: r.nextDueAt,
    });
    expect(h.calls.slice(before)).toEqual([
      {
        imports: ["gleam/list"],
        definitions: "\npub fn total(xs: List(Int)) -> Int {\n  list.fold(xs, 0, fn(acc, x) { acc + x })\n}",
        expression: CHECKS,
        locale: "ko",
      },
    ]);
    const overview = await h.service.overview(USER);
    expect(overview.decks.find((d) => d.deckId === "stdlib")).toMatchObject({ seen: 1, mastered: 0 }); // mastered also needs 21 days of stability
  });

  it("the right value without the mustUse token (or only in a comment/string) is wrong", async () => {
    h = await createHarness({ newCardsPerDay: 1 });
    const p1 = await produceSession(user(1));
    const a = unwrap(await h.service.answer(user(1), p1.sessionId, "finale:produce:l1", code("// list.fold\nLITERAL"), 60_000));
    expect(a).toMatchObject({ correct: false, rating: "again", missing: ["list.fold"], actual: PRODUCE_EXPECTED, reference: REFERENCE, stage: "cloze" });
    expect(a.feedback).toBe("결과는 맞지만 이 카드는 `list.fold`을(를) 쓰는 연습이에요. 직접 써서 다시 풀어 보세요.");
    const p2 = await produceSession(user(2));
    const b = unwrap(await h.service.answer(user(2), p2.sessionId, "finale:produce:l1", code('list.fold_right(xs, 0, fn(a, x) { a + x }) // "list.fold"'), 60_000));
    expect(b.missing).toEqual(["list.fold"]);
    const p3 = await produceSession(user(3));
    const c = unwrap(await h.service.answer(user(3), p3.sessionId, "finale:produce:l1", code("list.map(xs, fn(x) { x })"), 60_000, "en"));
    expect(c).toMatchObject({ correct: false, expected: PRODUCE_EXPECTED, actual: "#(1, 1)", missing: ["list.fold"] });
    expect(c.feedback).toBe("The checks gave a different result. Expected: #(6, 0), yours: #(1, 1)");
  });

  it("compile errors are reported with line numbers relative to the body", async () => {
    const card: FakeCardSpec = {
      id: "shape",
      deckId: "syntax",
      topic: "syntax/custom-types",
      definitions: "pub type Shape {\n  Circle(r: Float)\n}\n",
      imports: ["gleam/list", "gleam/string", "gleam/int"],
    };
    h = await createHarness({ cards: [card], newCardsPerDay: 1 });
    const v = unwrap(await h.service.startSession(USER));
    unwrap(await h.service.answer(USER, v.sessionId, "new:recognize:shape", choice(1), 3000));
    unwrap(await h.service.answer(USER, v.sessionId, "mix:cloze:shape", text("fold"), 3000));
    const p = unwrap(await h.service.startSession(USER));
    const r = unwrap(await h.service.answer(USER, p.sessionId, "finale:produce:shape", code("let y = 1\n  COMPILE_ERROR\ny"), 60_000));
    expect(r).toMatchObject({ correct: false, feedback: "컴파일 오류가 있어요. 아래 메시지를 확인해 보세요.", diagnostics: ["2행: Unknown variable"] });
    expect(r.reference).toBe(REFERENCE);
  });

  it("runtime errors, timeouts and rejected code are wrong answers with diagnostics", async () => {
    h = await createHarness({ newCardsPerDay: 1 });
    const cases: [string, string[]][] = [
      ["CRASH list.fold", ["Runtime error: boom"]],
      ["LOOP list.fold", ["Timed out"]],
      ["FORBIDDEN list.fold", ["Not allowed: no FFI"]],
    ];
    let n = 10;
    for (const [body, diagnostics] of cases) {
      const u = user(n++);
      const p = await produceSession(u);
      const r = unwrap(await h.service.answer(u, p.sessionId, "finale:produce:l1", code(body), 60_000, "en"));
      expect(r).toMatchObject({ correct: false, diagnostics, reference: REFERENCE });
    }
  });

  it("an empty body is wrong without the sandbox", async () => {
    h = await createHarness({ newCardsPerDay: 1 });
    const p = await produceSession();
    const before = h.calls.length;
    const r = unwrap(await h.service.answer(USER, p.sessionId, "finale:produce:l1", code("  \n "), 60_000, "zh"));
    expect(r).toMatchObject({ correct: false, reference: REFERENCE, feedback: "函数体是空的。看看参考答案，下次再试着写一写。" });
    expect(h.calls.length).toBe(before);
  });
});

describe("sandbox unavailable", () => {
  it("returns the error and stores nothing, so the learner can retry", async () => {
    h = await createHarness({ newCardsPerDay: 1 });
    const p = await produceSession();
    h.snippet.current = async () => err(appError("unavailable", "runner down"));
    const e = unwrapErr(await h.service.answer(USER, p.sessionId, "finale:produce:l1", code(REFERENCE), 60_000, "en"));
    expect(e.code).toBe("unavailable");
    expect(e.message).toBe("Code can't be run right now. Please answer again in a moment.");
    h.snippet.current = async () => {
      throw new Error("socket closed");
    };
    expect(unwrapErr(await h.service.answer(USER, p.sessionId, "finale:produce:l1", code(REFERENCE), 60_000)).code).toBe("unavailable");
    const rows = await h.db.query("select 1 from recall.reviews where session_id = $1", [p.sessionId]);
    expect(rows.rows).toHaveLength(0);

    h.snippet.current = defaultSnippet;
    expect(unwrap(await h.service.answer(USER, p.sessionId, "finale:produce:l1", code(REFERENCE), 60_000)).correct).toBe(true);
  });
});

describe("idempotency and access", () => {
  it("a second answer for the same item returns the stored result (re-rendered in the request locale)", async () => {
    h = await createHarness({ newCardsPerDay: 1 });
    const v = await fresh();
    const first = unwrap(await h.service.answer(USER, v.sessionId, "mix:cloze:l1", text("fold_right"), 10_000));
    const calls = h.calls.length;
    const second = unwrap(await h.service.answer(USER, v.sessionId, "mix:cloze:l1", text("wrong"), 99_000));
    expect(second).toEqual(first);
    expect(h.calls.length).toBe(calls);
    const en = unwrap(await h.service.answer(USER, v.sessionId, "mix:cloze:l1", text("x"), 1, "en"));
    expect(en.feedback).toBe("Not the fill we expected, but it gives the same value 6, so it counts. Usual answer: fold");
    const log = await h.db.query<{ n: number }>("select count(*)::int as n from recall.reviews");
    expect(log.rows[0]!.n).toBe(1);
  });

  it("keeps a replayable review log", async () => {
    h = await createHarness({ newCardsPerDay: 1 });
    const v = await fresh();
    unwrap(await h.service.answer(USER, v.sessionId, "new:recognize:l1", choice(1), 3210));
    unwrap(await h.service.answer(USER, v.sessionId, "mix:cloze:l1", text("fold"), 30_000));
    const rows = await h.db.query(
      "select card_id, form, correct, rating, elapsed_ms, policy_version, memory_updated, stage_before, stage_after, answered_at from recall.reviews order by id",
    );
    expect(rows.rows).toEqual([
      expect.objectContaining({ card_id: "l1", form: "recognize", correct: true, rating: "good", elapsed_ms: 3210, policy_version: "fsrs-v1", memory_updated: true, stage_before: 0, stage_after: 1 }),
      expect.objectContaining({ card_id: "l1", form: "cloze", correct: true, rating: "hard", elapsed_ms: 30_000, memory_updated: false, stage_before: 1, stage_after: 2 }),
    ]);
  });

  it("another user's session, an unknown item and a finished session", async () => {
    h = await createHarness({ newCardsPerDay: 1 });
    const v = await fresh();
    expect(unwrapErr(await h.service.answer(OTHER_USER, v.sessionId, "new:recognize:l1", choice(1), 1)).code).toBe("not_found");
    expect(unwrapErr(await h.service.answer(USER, "nope", "new:recognize:l1", choice(1), 1)).code).toBe("not_found");
    expect(unwrapErr(await h.service.answer(USER, v.sessionId, "new:recognize:zz", choice(1), 1)).code).toBe("not_found");
    expect(unwrapErr(await h.service.finish(OTHER_USER, v.sessionId)).code).toBe("not_found");
    const first = unwrap(await h.service.answer(USER, v.sessionId, "new:recognize:l1", choice(1), 1000));
    unwrap(await h.service.finish(USER, v.sessionId));
    expect(unwrapErr(await h.service.answer(USER, v.sessionId, "mix:cloze:l1", text("fold"), 1)).code).toBe("conflict");
    expect(unwrap(await h.service.answer(USER, v.sessionId, "new:recognize:l1", choice(1), 1))).toEqual(first);
  });
});

describe("overview, finish and cards", () => {
  it("overview counts due and new cards; finish summarizes the session", async () => {
    h = await createHarness({ newCardsPerDay: 2 });
    const o0 = await h.service.overview(USER, "en");
    expect(o0).toMatchObject({ dueNow: 0, newAvailableToday: 2, newPerDay: 2 });
    expect(o0.decks.map((d) => [d.deckId, d.title, d.total])).toEqual([
      ["stdlib", "[en] 덱 stdlib", 8],
      ["syntax", "[en] 덱 syntax", 3],
    ]);
    const v = await fresh();
    unwrap(await h.service.answer(USER, v.sessionId, "new:recognize:l1", choice(1), 3000)); // due in 3 days
    unwrap(await h.service.answer(USER, v.sessionId, "new:recognize:l2", choice(0), 3000)); // due in 10 min
    unwrap(await h.service.answer(USER, v.sessionId, "mix:cloze:l1", text("fold"), 3000));
    const s = unwrap(await h.service.finish(USER, v.sessionId));
    expect(s).toMatchObject({ sessionId: v.sessionId, answered: 3, correct: 2, newLearned: 2, dueTomorrow: 1 });
    expect(s.decks[0]).toMatchObject({ deckId: "stdlib", seen: 2, mastered: 0, due: 0 });
    // finish is idempotent
    expect(unwrap(await h.service.finish(USER, v.sessionId))).toEqual(s);

    h.clock.advance(15 * 60 * 1000);
    expect(await h.service.overview(USER)).toMatchObject({ dueNow: 1, newAvailableToday: 0 });
  });

  it("cards() lists a deck with the learner's state and no answers", async () => {
    h = await createHarness({ newCardsPerDay: 1 });
    const v = await fresh();
    unwrap(await h.service.answer(USER, v.sessionId, "new:recognize:l1", choice(1), 3000));
    const cards = unwrap(await h.service.cards(USER, "stdlib", "zh"));
    expect(cards.map((c) => c.id)).toEqual(["l1", "l2", "l3", "l4", "t1", "t2", "d1", "d2"]);
    expect(cards[0]!.state).toEqual({ stage: "cloze", reps: 1, lapses: 0, dueAt: "2026-10-03T09:00:00.000Z", stabilityDays: 3.2 });
    expect(cards[1]!.state).toBeNull();
    expect(cards[0]!.title).toBe("[zh] 카드 l1");
    expect(JSON.stringify(cards)).not.toContain("expected");
    expect(unwrapErr(await h.service.cards(USER, "nope", "en")).code).toBe("not_found");
  });
});
