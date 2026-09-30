import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AppError, Result } from "@fp/kernel";
import type { Session, SessionCompletedPayload } from "../src/contract/index.ts";
import { exercise, OTHER_USER, review, setup, skill, USER, type Harness } from "./fakes.ts";

function must<T>(r: Result<T, AppError>): T {
  if (!r.ok) throw new Error(`expected ok, got ${r.error.code}: ${r.error.message}`);
  return r.value;
}

let h: Harness;
let session: Session;

beforeEach(async () => {
  h = await setup(
    [skill("a", 1)],
    [
      exercise("f1", "base", "a", { difficulty: 1200 }),
      exercise("f1", "alt", "a", { difficulty: 1250 }),
    ],
    {
      reviews: [
        review("a", "2026-10-10T00:00:00.000Z"),
        review("b", "2026-11-20T00:00:00.000Z"), // beyond the 30-day window
      ],
    },
  );
  session = must(await h.service.start({ userId: USER, language: "gleam", targetMinutes: 15 }));
  expect(session.items.map((i) => i.exerciseId)).toEqual(["f1/base@1", "f1/alt@1"]);
});

afterEach(async () => {
  expect(h.handlerErrors).toEqual([]);
  await h.db.close();
});

const reload = async () => (await h.service.get(session.id, USER))!;
const attemptCount = async () =>
  Number((await h.db.query<{ n: number }>("select count(*)::int as n from sessions.attempts")).rows[0]?.n);

describe("submission events", () => {
  it("keeps a failed item current and advances once it passes", async () => {
    await h.evaluate("f1/base@1", "failed_tests", { submissionId: "s1", sessionId: session.id });
    let s = await reload();
    expect(s.currentIndex).toBe(0);
    expect(s.items[0]).toMatchObject({ status: "failed", submissionIds: ["s1"] });

    await h.evaluate("f1/base@1", "passed", { submissionId: "s2", sessionId: session.id });
    s = await reload();
    expect(s.currentIndex).toBe(1);
    expect(s.items.map((i) => i.status)).toEqual(["passed", "in_progress"]);
    expect(s.items[0]?.submissionIds).toEqual(["s1", "s2"]);

    await h.evaluate("f1/alt@1", "passed", { submissionId: "s3", sessionId: session.id });
    s = await reload();
    expect(s.currentIndex).toBeNull();
    expect(s.items.map((i) => i.status)).toEqual(["passed", "passed"]);
  });

  it("is idempotent per submissionId", async () => {
    await h.evaluate("f1/base@1", "failed_tests", { submissionId: "s1", sessionId: session.id });
    await h.evaluate("f1/base@1", "failed_tests", { submissionId: "s1", sessionId: session.id });
    expect((await reload()).items[0]?.submissionIds).toEqual(["s1"]);
    expect(await attemptCount()).toBe(1);
  });

  it("ignores system errors", async () => {
    await h.evaluate("f1/base@1", "system_error", { submissionId: "s1", sessionId: session.id });
    const s = await reload();
    expect(s.items[0]).toMatchObject({ status: "in_progress", submissionIds: [] });
    expect(await attemptCount()).toBe(0);
  });

  it("ignores events of another user or for exercises outside the session", async () => {
    await h.evaluate("f1/base@1", "passed", { sessionId: session.id, userId: OTHER_USER });
    await h.evaluate("zz/base@1", "passed", { sessionId: session.id });
    const s = await reload();
    expect(s.currentIndex).toBe(0);
    expect(s.items[0]?.submissionIds).toEqual([]);
  });

  it("records submissions without a session for later recommendations only", async () => {
    await h.evaluate("f1/base@1", "passed", { submissionId: "s1" });
    expect((await reload()).items[0]?.status).toBe("in_progress");
    expect(await attemptCount()).toBe(1);
  });
});

describe("skip and complete", () => {
  it("skip marks the current item skipped and advances until nothing is left", async () => {
    let s = must(await h.service.skip(session.id, USER));
    expect(s.items.map((i) => i.status)).toEqual(["skipped", "in_progress"]);
    expect(s.currentIndex).toBe(1);
    s = must(await h.service.skip(session.id, USER));
    expect(s.currentIndex).toBeNull();
    const again = await h.service.skip(session.id, USER);
    expect(again.ok ? null : again.error.code).toBe("conflict");
    const foreign = await h.service.skip(session.id, OTHER_USER);
    expect(foreign.ok ? null : foreign.error.code).toBe("not_found");
  });

  it("complete summarises the session, publishes once and is repeatable", async () => {
    await h.evaluate("f1/base@1", "failed_tests", { submissionId: "s1", sessionId: session.id });
    await h.evaluate("f1/base@1", "passed", { submissionId: "s2", sessionId: session.id });
    await h.evaluate("f1/alt@1", "compile_error", { submissionId: "s3", sessionId: session.id });

    const summary = must(await h.service.complete(session.id, USER));
    expect(summary).toEqual({
      sessionId: session.id,
      passed: 1,
      failed: 1,
      fixedAfterFeedback: 1,
      skillsPracticed: ["a"],
      nextReviews: [{ skillId: "a", dueAt: "2026-10-10T00:00:00.000Z" }],
    });
    expect(h.published).toHaveLength(1);
    expect(h.published[0]?.type).toBe("sessions.session_completed");
    expect(h.published[0]?.payload as SessionCompletedPayload).toEqual({ sessionId: session.id, userId: USER, summary });

    const s = await reload();
    expect(s.status).toBe("completed");
    expect(s.completedAt).toBe("2026-09-30T09:00:00.000Z");
    expect(s.currentIndex).toBeNull();
    expect(await h.service.active(USER, "gleam")).toBeNull();

    expect(must(await h.service.complete(session.id, USER))).toEqual(summary);
    expect(h.published).toHaveLength(1);

    // Late events no longer change a completed session.
    await h.evaluate("f1/alt@1", "passed", { submissionId: "s4", sessionId: session.id });
    expect((await reload()).items[1]?.status).toBe("failed");
  });

  it("complete is refused for another user's session", async () => {
    const r = await h.service.complete(session.id, OTHER_USER);
    expect(r.ok ? null : r.error.code).toBe("not_found");
    expect(await h.service.get(session.id, OTHER_USER)).toBeNull();
  });
});

describe("one active session per user and language", () => {
  it("starting a new session abandons the previous one", async () => {
    const next = must(await h.service.start({ userId: USER, language: "gleam", targetMinutes: 15 }));
    expect((await reload()).status).toBe("abandoned");
    expect((await h.service.active(USER, "gleam"))?.id).toBe(next.id);

    const r = await h.service.complete(session.id, USER);
    expect(r.ok ? null : r.error.code).toBe("conflict");
    const sk = await h.service.skip(session.id, USER);
    expect(sk.ok ? null : sk.error.code).toBe("conflict");

    await h.evaluate("f1/base@1", "passed", { submissionId: "s1", sessionId: session.id });
    expect((await reload()).items[0]?.submissionIds).toEqual([]);
  });

  it("other users keep their own active session", async () => {
    const other = must(await h.service.start({ userId: OTHER_USER, language: "gleam", targetMinutes: 15 }));
    expect((await h.service.active(USER, "gleam"))?.id).toBe(session.id);
    expect((await h.service.active(OTHER_USER, "gleam"))?.id).toBe(other.id);
  });
});
