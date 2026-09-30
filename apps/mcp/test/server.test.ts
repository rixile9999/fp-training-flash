import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ApiError } from "@fp/api-contract";
import type { Session } from "@fp/api-contract";
import { createFpMcpServer } from "../src/server.ts";
import type { FpApi } from "../src/api.ts";
import { EX2_ID, EX_ID, fakeApi, session } from "./fixtures.ts";

async function connect(overrides: Partial<FpApi> = {}, active: Session | null = session()) {
  const { api, calls } = fakeApi(overrides, active);
  const server = createFpMcpServer({ api, newKey: () => "key-1" });
  const client = new Client({ name: "test", version: "0.0.0" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const r = (await client.callTool({ name, arguments: args })) as CallToolResult;
    const text = r.content.map((c) => (c.type === "text" ? c.text : "")).join("\n");
    return { ...r, text };
  };
  return { client, calls, call };
}

describe("fp MCP server", () => {
  it("lists all tools and exposes coaching instructions", async () => {
    const { client } = await connect();
    const names = (await client.listTools()).tools.map((t) => t.name).sort();
    expect(names).toEqual(
      [
        "current_exercise",
        "get_exercise",
        "get_explanation",
        "get_feedback",
        "get_progress",
        "recommend_exercise",
        "request_hint",
        "run_code",
        "skip_item",
        "start_session",
        "submit_solution",
      ].sort(),
    );
    const instructions = client.getInstructions() ?? "";
    expect(instructions).toMatch(/Do NOT write or complete the solution/);
    expect(instructions).toMatch(/request_hint/);
    expect(instructions).toMatch(/Korean/);
  });

  it("current_exercise returns the essential problem content but never unrevealed hints", async () => {
    const { call } = await connect();
    const r = await call("current_exercise");
    expect(r.isError).toBeFalsy();
    expect(r.text).toContain("주문 목록에 쿠폰을 적용하는");
    expect(r.text).toContain("pub fn apply(orders)");
    expect(r.text).toContain("coupon.apply([]) |> should.equal([])");
    expect(r.text).toContain("총 3단계 중 1단계 공개됨");
    expect(r.text).toContain("어떤 주문이 바뀌어야 하나요?");
    expect(r.text).toContain("학습자가 직접 코드를 작성");
    expect(r.text).not.toContain("SECRET-HINT");
    expect(JSON.stringify(r.structuredContent)).not.toContain("SECRET-HINT");
    const sc = r.structuredContent as { sessionId: string; exercise: { hintCount: number; moduleName: string } };
    expect(sc.sessionId).toBe("sess-1");
    expect(sc.exercise.hintCount).toBe(3);
    expect(sc.exercise.moduleName).toBe("coupon");
  });

  it("current_exercise without an active session suggests starting one", async () => {
    const { call } = await connect({}, null);
    const r = await call("current_exercise");
    expect(r.isError).toBeFalsy();
    expect(r.text).toContain("진행 중인 세션이 없습니다");
  });

  it("start_session forwards minutes and focus skill", async () => {
    const { call, calls } = await connect();
    const r = await call("start_session", { minutes: 20, focus_skill: "recursion" });
    expect(calls.find((c) => c.method === "startSession")?.args[0]).toEqual({
      language: "gleam",
      targetMinutes: 20,
      focusSkill: "recursion",
    });
    expect(r.text).toContain("새 세션을 시작했습니다");
    expect(r.text).toContain("쿠폰 적용하기");
  });

  it("run_code relays failing test evidence", async () => {
    const { call, calls } = await connect();
    const r = await call("run_code", { exercise_id: EX_ID, code: "pub fn apply(o) { o }" });
    expect(calls.find((c) => c.method === "trialRun")?.args).toEqual([EX_ID, { code: "pub fn apply(o) { o }" }]);
    expect(r.text).toContain("테스트 실패 (테스트 1/2 통과)");
    expect(r.text).toContain("[실패] 다른 주문은 유지");
    expect(r.text).toContain("Expected [] got [1]");
  });

  it("submit_solution links the active session and reports the rating change", async () => {
    const { call, calls } = await connect();
    const r = await call("submit_solution", { exercise_id: EX_ID, code: "pub fn apply(o) { o }" });
    expect(calls.find((c) => c.method === "submit")?.args[0]).toEqual({
      exerciseId: EX_ID,
      code: "pub fn apply(o) { o }",
      idempotencyKey: "key-1",
      sessionId: "sess-1",
    });
    expect(r.text).toContain("결과: 통과");
    expect(r.text).toContain("1200 → 1216 (+16)");
    expect(r.text).toContain("get_feedback");
    expect((r.structuredContent as { submissionId: string }).submissionId).toBe("sub-1");
  });

  it("submit_solution does not link a session whose current item is another exercise", async () => {
    const { call, calls } = await connect();
    await call("submit_solution", { exercise_id: EX2_ID, code: "x" });
    const req = calls.find((c) => c.method === "submit")?.args[0] as Record<string, unknown>;
    expect(req.sessionId).toBeUndefined();
  });

  it("maps API errors to Korean tool errors", async () => {
    const { call } = await connect({
      submit: async () => {
        throw new ApiError(401, { code: "unauthorized", message: "bad token" });
      },
    });
    const r = await call("submit_solution", { exercise_id: EX_ID, code: "x", session_id: "s" });
    expect(r.isError).toBe(true);
    expect(r.text).toContain("인증에 실패했습니다");
  });

  it("request_hint warns that level 3+ makes the attempt unrated", async () => {
    const { call } = await connect();
    const low = await call("request_hint", { exercise_id: EX_ID, level: 2 });
    expect(low.text).toContain("SECRET-HINT-TWO");
    expect(low.text).not.toContain("레이팅에 반영되지 않습니다");
    const high = await call("request_hint", { exercise_id: EX_ID, level: 3 });
    expect(high.text).toContain("레이팅에 반영되지 않습니다");
  });

  it("get_explanation warns about mastery checks", async () => {
    const { call } = await connect();
    const r = await call("get_explanation", { exercise_id: EX_ID });
    expect(r.text).toContain("레이팅에 반영되지 않으며");
    expect(r.text).toContain("pub fn apply(o) { o }");
  });

  it("skip_item skips the active session's item and presents the next exercise", async () => {
    const { call, calls } = await connect();
    const r = await call("skip_item");
    expect(calls.find((c) => c.method === "skipItem")?.args).toEqual(["sess-1"]);
    expect(r.text).toContain("건너뛰었습니다");
    expect(r.text).toContain("주문 합계");
  });

  it("get_progress and get_feedback render readable Korean summaries", async () => {
    const { call } = await connect();
    const p = await call("get_progress");
    expect(p.text).toContain("데이터 변환: 1216 ±180");
    expect(p.text).toContain("drops_items_with_filter (2회)");
    const f = await call("get_feedback", { submission_id: "sub-1" });
    expect(f.text).toContain("다음 행동: 다음 문제로 넘어가세요.");
  });

  it("serves exercise concept notes as a resource and records them as opened", async () => {
    const { client, calls } = await connect();
    const templates = (await client.listResourceTemplates()).resourceTemplates.map((t) => t.uriTemplate);
    expect(templates).toContain("fp://exercise/{id}/concepts");
    expect(templates).toContain("fp://theory/{id}");
    const uri = `fp://exercise/${encodeURIComponent(EX_ID)}/concepts`;
    const res = await client.readResource({ uri });
    const first = res.contents[0] as { text: string };
    expect(first.text).toContain("`list.map`은 각 원소를 변환합니다.");
    expect(calls.find((c) => c.method === "noteOpened")?.args).toEqual([EX_ID, { kind: "concept", noteId: "gleam-list-map" }]);
    const theory = await client.readResource({ uri: "fp://theory/functor" });
    expect((theory.contents[0] as { text: string }).text).toContain("펑터는 구조를 유지한 채");
  });
});
