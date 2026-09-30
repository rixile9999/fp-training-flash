import { afterEach, describe, expect, it } from "vitest";
import type { Evaluation } from "@fp/grading/contract";
import type { ErrorTagStat } from "@fp/learner/contract";
import { evaluations, makeSubmission, setup, USER, type Harness } from "./fixtures.ts";

let h: Harness;
afterEach(async () => {
  await h.db.close();
});

async function ruleFeedback(evaluation: Evaluation, errorTags: readonly ErrorTagStat[] = []) {
  const sub = makeSubmission("s1", evaluation);
  h = await setup({ submissions: [sub], errorTags });
  const r = await h.service.feedback(sub.id, USER);
  if (!r.ok) throw new Error(r.error.message);
  expect(r.value.source).toBe("rule_based");
  expect(r.value.priorities.length).toBeGreaterThanOrEqual(1);
  expect(r.value.priorities.length).toBeLessThanOrEqual(2);
  expect(r.value.nextAction.length).toBeGreaterThan(0);
  return r.value;
}

describe("rule-based feedback (provider none)", () => {
  it("compile_error cites the first error diagnostic with its line", async () => {
    const fb = await ruleFeedback(evaluations.compileError);
    expect(fb.summary).toContain("컴파일 오류");
    expect(fb.evidence[0]).toMatchObject({ line: 3 });
    expect(fb.evidence[0]?.text).toContain("Unknown variable `ordrs`");
    expect(fb.nextAction).toContain("3행");
  });

  it("failed_tests cites the first failing test name, message, error tag and test id", async () => {
    const fb = await ruleFeedback(evaluations.failed);
    expect(fb.summary).toContain("3개 중 1개");
    expect(fb.evidence).toHaveLength(1);
    expect(fb.evidence[0]).toMatchObject({ testId: "H2" });
    expect(fb.evidence[0]?.text).toContain("rounds discount");
    expect(fb.evidence[0]?.text).toContain("expected 90, got 89");
    expect(fb.evidence[0]?.text).toContain("rounding_error");
    // Rule-based feedback never leaks test code.
    expect(JSON.stringify(fb)).not.toContain("HIDDEN_");
  });

  it("failed_tests mentions a recurring error tag from the learner profile", async () => {
    const fb = await ruleFeedback(evaluations.failed, [
      { tag: "rounding_error", count: 3, lastSeenAt: "2026-09-29T00:00:00.000Z" },
    ]);
    expect(fb.priorities).toHaveLength(2);
    expect(fb.priorities[1]).toContain("3회");
  });

  it("passed gives brief praise and a rubric-based suggestion from flagged checks", async () => {
    const fb = await ruleFeedback(evaluations.passed);
    expect(fb.summary).toContain("통과");
    expect(fb.priorities[0]).toContain("R-01");
    expect(fb.rubricNotes).toEqual([
      { rubricId: "R-01", verdict: "suggestion", text: "파이프라인(|>)을 사용해 보세요." },
      { rubricId: "R-02", verdict: "good", text: expect.any(String) },
    ]);
  });

  it("passed without flagged checks suggests the first rubric item", async () => {
    const fb = await ruleFeedback({ ...evaluations.passed, rubricChecks: [] });
    expect(fb.priorities[0]).toContain("R-01");
    expect(fb.nextAction).toContain("R-01");
  });

  it("system_error apologises and says it is not the learner's fault", async () => {
    const fb = await ruleFeedback(evaluations.systemError);
    expect(fb.summary).toContain("죄송합니다");
    expect(fb.summary).toContain("여러분의 실수가 아니");
    expect(fb.evidence).toEqual([]);
    expect(fb.rubricNotes).toEqual([]);
  });

  it("covers too_slow, timeout and rejected", async () => {
    expect((await ruleFeedback(evaluations.tooSlow)).evidence[0]?.text).toContain("12.5배");
    await h.db.close();
    expect((await ruleFeedback(evaluations.timeout)).priorities[0]).toContain("종료 조건");
    await h.db.close();
    expect((await ruleFeedback(evaluations.rejected)).evidence[0]?.text).toContain("@external");
  });

  it("is cached per submission in rule-only mode", async () => {
    const sub = makeSubmission("s1", evaluations.failed);
    h = await setup({ submissions: [sub] });
    const first = await h.service.feedback(sub.id, USER);
    h.clock.advance(60_000);
    const second = await h.service.feedback(sub.id, USER);
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) expect(second.value.createdAt).toBe(first.value.createdAt);
  });
});
