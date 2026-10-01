import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ApiError } from "@fp/api-contract";
import type { Locale } from "@fp/api-contract";
import { createFpMcpServer } from "../src/server.ts";
import type { FpApi } from "../src/api.ts";
import { LESSON, LESSON2, UNIT, courseView, fakeApi, session } from "./fixtures.ts";

async function connect(locale: Locale = "ko", overrides: Partial<FpApi> = {}) {
  const { api, calls } = fakeApi(overrides, session(), locale);
  const server = createFpMcpServer({ api, newKey: () => "key-1" });
  const client = new Client({ name: "test", version: "0.0.0" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const r = (await client.callTool({ name, arguments: args })) as CallToolResult;
    const text = r.content.map((c) => (c.type === "text" ? c.text : "")).join("\n");
    return { ...r, text, structured: (r.structuredContent ?? {}) as Record<string, unknown> };
  };
  const called = (m: string) => calls.filter((c) => c.method === m);
  return { client, calls, call, called };
}

describe("course tools", () => {
  it("instructions tell the host to present one item at a time and not reveal answers", async () => {
    const { client } = await connect();
    const instructions = client.getInstructions() ?? "";
    expect(instructions).toMatch(/get_course/);
    expect(instructions).toMatch(/exactly one item at a time/);
    expect(instructions).toMatch(/do not reveal answers/);
    expect(instructions).toMatch(/never reveal or hint at the correct choice/);
    expect(instructions).toMatch(/0-based/);
  });

  it("get_course shows units, progress, placement suggestion and the next tool call", async () => {
    const { call } = await connect();
    const r = await call("get_course");
    expect(r.isError).toBeFalsy();
    expect(r.text).toContain("## Gleam 기초 코스");
    expect(r.text).toContain("▶ **1. 값, 불변성, 표현식** (`u01-values`, L1) · 레슨 1/2 · 체크포인트 최고 50%");
    expect(r.text).toContain("  - ✓ 값과 let (`l01-values-let`)");
    expect(r.text).toContain("start_placement");
    expect(r.text).toContain(`다음 단계: get_lesson (unit_id \`${UNIT}\`, lesson_id \`${LESSON2}\`)`);
    expect(r.structured).toMatchObject({ course: courseView("ko"), locale: "ko" });
  });

  it("get_lesson renders prose, exercises with 0-based choice labels and a no-spoiler note", async () => {
    const { call, called } = await connect();
    const r = await call("get_lesson", { unit_id: UNIT, lesson_id: LESSON });
    expect(called("lesson")[0]?.args).toEqual([UNIT, LESSON]);
    expect(r.text).toContain("## 값과 let");
    expect(r.text).toContain("프로그램은 **값**을 다룹니다.");
    expect(r.text).toContain("### 연습 1 (`bind-syntax`, 객관식)");
    expect(r.text).toContain("### 연습 2 (`let-use`, 결과 예측) · ✓ 풀었음");
    expect(r.text).toContain("- [0] `x = 5`\n- [1] `let x = 5`\n- [2] `var x = 5`");
    expect(r.text).toContain("```gleam\nlet total = 100 * 3\n```");
    expect(r.text).toContain("정답을 알려 주지 마세요");
    expect(r.text).toContain("never reveal or hint at the answer first");
    expect((r.structured.lesson as { lesson: { id: string } }).lesson.id).toBe(LESSON);
  });

  it("answer_lesson_exercise passes the index; wrong answers do not reveal the answer; show gives up", async () => {
    const { call, called } = await connect();
    const right = await call("answer_lesson_exercise", { unit_id: UNIT, lesson_id: LESSON, exercise_id: "bind-syntax", choice: 1 });
    expect(called("lessonAnswer")[0]?.args).toEqual([UNIT, LESSON, { exerciseId: "bind-syntax", choice: 1 }]);
    expect(right.text).toContain("✓ 정답입니다!");
    expect(right.text).toContain("맞아요!");

    const wrong = await call("answer_lesson_exercise", { unit_id: UNIT, lesson_id: LESSON, exercise_id: "bind-syntax", choice: 2 });
    expect(wrong.text).toContain("✗ 아직 아닙니다.");
    expect(wrong.text).toContain("정답은 아직 공개되지 않았습니다");
    expect(wrong.text).not.toContain("정답: [");
    expect((wrong.structured.answer as { correctIndex?: number }).correctIndex).toBeUndefined();

    const shown = await call("answer_lesson_exercise", { unit_id: UNIT, lesson_id: LESSON, exercise_id: "bind-syntax", choice: "show" });
    expect(called("lessonAnswer")[2]?.args[2]).toEqual({ exerciseId: "bind-syntax", choice: null, giveUp: true });
    expect(shown.text).toContain("정답: [1]");
    expect(shown.structured.gaveUp).toBe(true);

    const bad = await call("answer_lesson_exercise", { unit_id: UNIT, lesson_id: LESSON, exercise_id: "bind-syntax", choice: "maybe" });
    expect(bad.isError).toBe(true);
    expect(called("lessonAnswer")).toHaveLength(3);
  });

  it("complete_lesson marks the lesson done and shows the next step (best effort)", async () => {
    const { call, called } = await connect("ko", { course: async () => courseView("ko", { kind: "checkpoint", unitId: UNIT }) });
    const r = await call("complete_lesson", { unit_id: UNIT, lesson_id: LESSON2 });
    expect(called("lessonComplete")[0]?.args).toEqual([UNIT, LESSON2]);
    expect(r.text).toContain(`레슨 \`${UNIT}/${LESSON2}\`을(를) 완료했습니다. 이 단원에서 완료한 레슨: 2개`);
    expect(r.text).toContain(`start_checkpoint (unit_id \`${UNIT}\`)`);

    const down = await connect("ko", { course: async () => Promise.reject(new Error("down")) });
    const r2 = await down.call("complete_lesson", { unit_id: UNIT, lesson_id: LESSON2 });
    expect(r2.isError).toBeFalsy();
    expect(r2.structured.next).toBeNull();
  });

  it("start_checkpoint lists the items without answers and tells the host how to run it", async () => {
    const { call, called } = await connect();
    const r = await call("start_checkpoint", { unit_id: UNIT });
    expect(called("startCheckpoint")[0]?.args).toEqual([UNIT]);
    expect(r.text).toContain(`## 단원 체크포인트: ${UNIT} · 2문항 · 통과 기준 80%`);
    expect(r.text).toContain("### 문항 1/2 (`item-a`)");
    expect(r.text).toContain("- [0] `let x = 1`\n- [1] `x := 1`");
    expect(r.text).toContain("submit_checkpoint을(를) quiz_id `quiz-cp-1`");
    expect(r.text).toContain("show exactly one item at a time");
    expect(JSON.stringify(r.structured)).not.toMatch(/correct|answer"/i);
  });

  it("submit_checkpoint forwards the answers and renders the review with lesson links", async () => {
    const { call, called } = await connect();
    const r = await call("submit_checkpoint", { quiz_id: "quiz-cp-1", answers: { "item-a": 0, "item-b": null } });
    expect(called("submitCheckpoint")[0]?.args).toEqual(["quiz-cp-1", { answers: { "item-a": 0, "item-b": null } }]);
    expect(r.text).toContain(`## 체크포인트 결과 (${UNIT}): 1/2`);
    expect(r.text).toContain("아직 통과하지 못했습니다");
    expect(r.text).toContain("- ✓ `item-a` · 선택 [0] · 정답 [0]");
    expect(r.text).toContain("- ✗ `item-b` · 선택 건너뜀 · 정답 [0]");
    expect(r.text).toContain(`복습: get_lesson (unit_id \`${UNIT}\`, lesson_id \`${LESSON}\`) · 연습 \`bind-syntax\``);
    expect(r.text).toContain("gleam-basics: 1000 → 984 (-16)");
    expect((r.structured.result as { passed: boolean }).passed).toBe(false);

    const bad = await call("submit_checkpoint", { quiz_id: "quiz-cp-1", answers: { "item-a": -1 } });
    expect(bad.isError).toBe(true);
  });

  it("placement: start, then submit shows the band and the recommendation", async () => {
    const { call, called } = await connect();
    const start = await call("start_placement");
    expect(start.text).toContain("## 배치 테스트: 2문항");
    expect(start.text).toContain("submit_placement");
    const r = await call("submit_placement", { quiz_id: "quiz-pl-1", answers: { "item-a": 0, "item-b": 0 } });
    expect(called("submitPlacement")[0]?.args).toEqual(["quiz-pl-1", { answers: { "item-a": 0, "item-b": 0 } }]);
    expect(r.text).toContain("## 배치 테스트 결과: 2/2 · 고급");
    expect(r.text).toContain(`통과로 처리된 단원: ${UNIT}`);
    expect(r.text).toContain("start_session");
  });

  it("maps API errors of course tools to localized tool errors", async () => {
    const { call } = await connect("en", {
      startCheckpoint: async () => Promise.reject(new ApiError(404, { code: "not_found", message: "unit u99" })),
    });
    const r = await call("start_checkpoint", { unit_id: "u99" });
    expect(r.isError).toBe(true);
    expect(r.text).toBe("Not found: unit u99");
  });
});

describe("course tools per locale", () => {
  async function texts(locale: Locale): Promise<string> {
    const { call } = await connect(locale);
    const parts = [
      await call("get_course"),
      await call("get_lesson", { unit_id: UNIT, lesson_id: LESSON }),
      await call("answer_lesson_exercise", { unit_id: UNIT, lesson_id: LESSON, exercise_id: "bind-syntax", choice: 0 }),
      await call("start_checkpoint", { unit_id: UNIT }),
      await call("submit_placement", { quiz_id: "quiz-pl-1", answers: { "item-a": 1 } }),
    ];
    for (const p of parts) expect(p.structured.locale).toBe(locale);
    return parts.map((p) => p.text).join("\n");
  }

  it("renders the chrome in the learner's locale around server-localized content", async () => {
    const en = await texts("en");
    expect(en).toContain("## Gleam basics course");
    expect(en).toContain("lessons 1/2 · checkpoint best 50%");
    expect(en).toContain("Next step: get_lesson (unit_id `u01-values`, lesson_id `l02-immutability`)");
    expect(en).toContain("## Values and let");
    expect(en).toContain("### Exercise 1 (`bind-syntax`, multiple choice)");
    expect(en).toContain("✗ Not quite.\n\nGleam has no `var`.");
    expect(en).toContain("Do not reveal the answer before the learner chooses.");
    expect(en).toContain("## Unit checkpoint: u01-values · 2 items · pass mark 80%");
    expect(en).toContain("## Placement test result: 0/2 · beginner");
    expect(en).not.toMatch(/레슨|체크포인트|연습 |정답|배치 테스트/);

    const zh = await texts("zh");
    expect(zh).toContain("## Gleam 基础课程");
    expect(zh).toContain("## 值与 let");
    expect(zh).toContain("### 练习 1（`bind-syntax`，选择题）");
    expect(zh).toContain("✗ 还不对。");
    expect(zh).toContain("## 单元测验：u01-values · 2 题 · 及格线 80%");
    expect(zh).toContain("## 分级测试结果：0/2 · 入门");
    expect(zh).toContain("reply in Simplified Chinese (zh)");
  });
});
