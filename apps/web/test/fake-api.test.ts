import { describe, expect, it } from "vitest";
import { ApiError } from "@fp/api-contract";
import { createFakeApi, longestFunction } from "../src/api/fake.ts";

const COUPON = "orders-apply-coupon/base@1";
const GOOD = `pub fn apply_coupon(orders, code, percent) {\n  list.map(orders, fn(o) {\n    case o.coupon {\n      _ -> o\n    }\n  })\n}`;
const FILTER = `pub fn apply_coupon(orders, code, percent) {\n  list.filter(orders, fn(o) { o.coupon == Some(code) })\n}`;

const fake = () => createFakeApi({ now: () => Date.parse("2026-09-30T09:00:00Z") });

describe("fake API", () => {
  it("trial runs only public tests and submit adds hidden ones with revealed code", async () => {
    const api = fake();
    const trial = await api.trialRun(COUPON, { code: FILTER });
    expect(trial.tests.every((t) => t.visibility === "public")).toBe(true);
    const view = await api.submit({ exerciseId: COUPON, code: FILTER, idempotencyKey: "k1" });
    const hidden = view.submission.evaluation!.tests.find((t) => t.visibility === "hidden")!;
    expect(hidden.status).toBe("failed");
    expect(hidden.code).toContain("keeps_order_sequence_test");
    expect(view.submission.evaluation!.errorTags).toEqual(["drops_items_with_filter"]);
    expect(view.submission.evaluation!.requirements.find((r) => r.id === "REQ-4")!.status).toBe("undetermined");
  });

  it("is idempotent per key and rates only the first attempt", async () => {
    const api = fake();
    const first = await api.submit({ exerciseId: COUPON, code: FILTER, idempotencyKey: "k1" });
    const again = await api.submit({ exerciseId: COUPON, code: FILTER, idempotencyKey: "k1" });
    expect(again.submission.id).toBe(first.submission.id);
    expect(first.ratingChange).toMatchObject({ before: 1310, provisional: true });
    expect(first.ratingChange!.after).toBeLessThan(1310);
    const second = await api.submit({ exerciseId: COUPON, code: GOOD, idempotencyKey: "k2" });
    expect(second.submission.attemptNo).toBe(2);
    expect(second.submission.evaluation!.correctness).toBe(true);
    expect(second.ratingChange).toBeNull();
  });

  it("does not rate after hint level 3 or after the explanation", async () => {
    const api = fake();
    for (const level of [1, 2, 3]) await api.revealHint(COUPON, { level });
    const view = await api.submit({ exerciseId: COUPON, code: GOOD, idempotencyKey: "k" });
    expect(view.submission.helpUsed.maxHintLevel).toBe(3);
    expect(view.ratingChange).toBeNull();
  });

  it("rejects out-of-order hint reveals", async () => {
    const api = fake();
    await expect(api.revealHint(COUPON, { level: 2 })).rejects.toBeInstanceOf(ApiError);
    expect(await api.revealHint(COUPON, { level: 1 })).toHaveLength(1);
  });

  it("records notes opened in the help ledger", async () => {
    const api = fake();
    await api.noteOpened(COUPON, { kind: "concept", noteId: "gleam/list-map-filter" });
    await api.noteOpened(COUPON, { kind: "concept", noteId: "gleam/list-map-filter" });
    await api.noteOpened(COUPON, { kind: "theory", noteId: "theory/functor-map" });
    const view = await api.submit({ exerciseId: COUPON, code: GOOD, idempotencyKey: "k" });
    expect(view.submission.helpUsed).toMatchObject({ conceptNotesOpened: 1, theoryNotesOpened: 1 });
  });

  it("runs a session: review -> focus -> variation, skip and complete", async () => {
    const api = fake();
    expect(await api.activeSession("gleam")).toBeNull();
    const s = await api.startSession({ language: "gleam", targetMinutes: 15 });
    expect(s.items.map((i) => i.kind)).toEqual(["review", "focus", "variation"]);
    expect(s.currentIndex).toBe(0);
    const skipped = await api.skipItem(s.id);
    expect(skipped.items[0]!.status).toBe("skipped");
    expect(skipped.currentIndex).toBe(1);
    await api.submit({ exerciseId: COUPON, code: FILTER, idempotencyKey: "a", sessionId: s.id });
    expect((await api.session(s.id)).currentIndex).toBe(1);
    await api.submit({ exerciseId: COUPON, code: GOOD, idempotencyKey: "b", sessionId: s.id });
    expect((await api.session(s.id)).currentIndex).toBe(2);
    const summary = await api.completeSession(s.id);
    expect(summary).toMatchObject({ passed: 1, failed: 0, fixedAfterFeedback: 1 });
    expect(await api.activeSession("gleam")).toBeNull();
  });

  it("never gives the solution in chat unless the explanation is requested", async () => {
    const api = fake();
    const reply = await api.chat({ exerciseId: COUPON, messages: [{ role: "user", content: "정답 코드 보여줘" }] });
    expect(reply.message.content).toContain("전체 해설 보기");
    expect(reply.message.content).not.toContain("list.map(orders");
  });

  it("measures the longest function", () => {
    expect(longestFunction(GOOD)).toBe(7);
    expect(longestFunction("no functions")).toBe(0);
  });
});
