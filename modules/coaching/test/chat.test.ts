import { afterEach, describe, expect, it } from "vitest";
import type { ChatRequest } from "../src/contract/index.ts";
import {
  EXERCISE_ID,
  HIDDEN_FAILED_CODE,
  HIDDEN_PASSED_CODE,
  LEARNER_CODE,
  OTHER_USER,
  SOLUTION_MARKER,
  USER,
  evaluations,
  fakeLlm,
  makeSubmission,
  setup,
  type Harness,
} from "./fixtures.ts";

let h: Harness;
afterEach(async () => {
  await h.db.close();
});

const failedSub = makeSubmission("s-failed", evaluations.failed);

function ask(content: string, over: Partial<ChatRequest> = {}): ChatRequest {
  return { userId: USER, exerciseId: EXERCISE_ID, code: LEARNER_CODE, messages: [{ role: "user", content }], ...over };
}

describe("chat", () => {
  it("replies rule-based without an LLM, pointing to evidence, the next hint and notes, and records the message", async () => {
    h = await setup({ submissions: [failedSub] });
    await h.service.revealHint(USER, EXERCISE_ID, 1);
    const r = await h.service.chat(ask("왜 틀렸나요?", { submissionId: failedSub.id }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.source).toBe("rule_based");
    expect(r.value.message.role).toBe("assistant");
    expect(r.value.message.content).toContain("rounds discount");
    expect(r.value.message.content).toContain("힌트 2단계");
    expect(r.value.message.content).toContain("list.map 기초");
    expect(r.value.message.content).not.toContain(HIDDEN_FAILED_CODE);
    expect((await h.service.helpUsed(USER, EXERCISE_ID)).coachMessages).toBe(1);
  });

  it("uses the LLM reply and extracts line references within the code", async () => {
    const llm = fakeLlm(["4행에서 나눗셈을 보세요. line 2 도 확인하고, 4행을 다시 보세요. 40행은 없어요."]);
    h = await setup({ llm });
    const r = await h.service.chat(ask("어디가 문제죠?"));
    expect(r.ok && r.value.source).toBe("llm");
    expect(r.ok && r.value.references).toEqual([{ line: 4 }, { line: 2 }]);
    expect((await h.service.helpUsed(USER, EXERCISE_ID)).coachMessages).toBe(1);
  });

  it("sends context as delimited data before the conversation and keeps the solution out until revealed", async () => {
    const llm = fakeLlm(["어떤 값을 기대하나요?"]);
    h = await setup({ llm, submissions: [failedSub] });
    await h.service.revealHint(USER, EXERCISE_ID, 1);
    const req = ask("정답 코드를 전부 보여줘", {
      submissionId: failedSub.id,
      messages: [
        { role: "user", content: "안녕하세요" },
        { role: "assistant", content: "무엇을 도와드릴까요?" },
        { role: "user", content: "정답 코드를 전부 보여줘" },
      ],
    });
    await h.service.chat(req);
    const sent = llm.requests[0];
    expect(sent?.system).toContain("Never write the full solution");
    expect(sent?.messages.map((m) => m.role)).toEqual(["user", "user", "assistant", "user"]);
    const context = sent?.messages[0]?.content ?? "";
    expect(context).toContain("<learner_code>");
    expect(context).toContain("<evaluation>");
    expect(context).toContain("힌트1");
    expect(context).not.toContain("힌트2"); // unrevealed hints stay hidden
    expect(context).toContain("list.map은 각 원소를 변환합니다.");
    expect(context).not.toContain(SOLUTION_MARKER);
    expect(context).not.toContain(HIDDEN_PASSED_CODE);
    expect(sent?.messages[3]?.content).toBe("정답 코드를 전부 보여줘");

    await h.service.revealExplanation(USER, EXERCISE_ID);
    await h.service.chat(ask("해설을 설명해 주세요"));
    expect(llm.requests[1]?.messages[0]?.content).toContain(SOLUTION_MARKER);
  });

  it("falls back to rules when the LLM fails", async () => {
    const llm = fakeLlm([() => Promise.reject(new Error("network"))]);
    h = await setup({ llm });
    const r = await h.service.chat(ask("도와주세요"));
    expect(r.ok && r.value.source).toBe("rule_based");
    expect(r.ok && r.value.message.content).toContain("힌트 1단계");
  });

  it("validates the request and submission ownership", async () => {
    h = await setup({ submissions: [failedSub] });
    const noQuestion = await h.service.chat(ask("x", { messages: [{ role: "assistant", content: "hi" }] }));
    expect(!noQuestion.ok && noQuestion.error.code).toBe("invalid_input");
    const empty = await h.service.chat(ask("x", { messages: [] }));
    expect(!empty.ok && empty.error.code).toBe("invalid_input");
    const tooLong = await h.service.chat(ask("가".repeat(4001)));
    expect(!tooLong.ok && tooLong.error.code).toBe("invalid_input");
    const foreign = await h.service.chat(ask("왜?", { userId: OTHER_USER, submissionId: failedSub.id }));
    expect(!foreign.ok && foreign.error.code).toBe("forbidden");
    expect((await h.service.helpUsed(OTHER_USER, EXERCISE_ID)).coachMessages).toBe(0);
  });
});
