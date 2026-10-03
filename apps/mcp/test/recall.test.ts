import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ApiError } from "@fp/api-contract";
import type { Locale } from "@fp/api-contract";
import { createFpMcpServer } from "../src/server.ts";
import type { FpApi } from "../src/api.ts";
import { RECALL_SESSION, fakeApi, recallDeckCards, recallOverview, recallSession, session } from "./fixtures.ts";

async function connect(locale: Locale = "ko", overrides: Partial<FpApi> = {}) {
  const { api, calls } = fakeApi(overrides, session(), locale);
  let clock = Date.parse("2026-10-03T00:00:00.000Z");
  const server = createFpMcpServer({ api, newKey: () => "key-1", now: () => clock });
  const client = new Client({ name: "test", version: "0.0.0" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const r = (await client.callTool({ name, arguments: args })) as CallToolResult;
    const text = r.content.map((c) => (c.type === "text" ? c.text : "")).join("\n");
    return { ...r, text, structured: (r.structuredContent ?? {}) as Record<string, unknown> };
  };
  const called = (m: string) => calls.filter((c) => c.method === m);
  const advance = (ms: number) => (clock += ms);
  return { client, calls, call, called, advance };
}

describe("recall tools", () => {
  it("lists the five recall tools; descriptions forbid revealing answers first", async () => {
    const { client } = await connect();
    const tools = (await client.listTools()).tools;
    const byName = new Map(tools.map((t) => [t.name, t]));
    for (const name of ["recall_overview", "recall_start", "recall_answer", "recall_finish", "recall_cards"]) expect(byName.has(name), name).toBe(true);
    for (const name of ["recall_start", "recall_answer"]) {
      expect(byName.get(name)?.description, name).toMatch(/Never reveal, hint at or fill in the answer/);
    }
    expect(byName.get("recall_start")?.description).toMatch(/one item at a time/);
    expect(byName.get("recall_answer")?.description).toMatch(/learner's own answer/);
    expect(byName.get("recall_cards")?.description).toMatch(/no answers/);
    const instructions = client.getInstructions() ?? "";
    expect(instructions).toMatch(/recall_start/);
    expect(instructions).toMatch(/Present exactly one recall item at a time/);
    expect(instructions).toMatch(/never reveal, hint at or fill in the answer/);
  });

  it("recall_overview shows decks and how to start", async () => {
    const { call } = await connect();
    const r = await call("recall_overview");
    expect(r.isError).toBeFalsy();
    expect(r.text).toContain("## 암기: Gleam 문법과 핵심 라이브러리");
    expect(r.text).toContain("지금 복습할 카드 5장 · 오늘 남은 새 카드 7장 (하루 10장)");
    expect(r.text).toContain("- 문법 (`syntax`) · 본 카드 12/60 · 숙달 3 · 복습 대기 4");
    expect(r.text).toContain("recall_start");
    expect(r.structured).toMatchObject({ overview: recallOverview(), locale: "ko" });
  });

  it("recall_start renders every item without answers and ends with a no-spoiler note", async () => {
    const { call, called } = await connect();
    const r = await call("recall_start", { minutes: 12, deck_ids: ["stdlib"] });
    expect(called("startRecall")[0]?.args).toEqual([{ minutes: 12, deckIds: ["stdlib"] }]);
    expect(r.text).toContain("## 암기 세션 · 4개 항목");
    expect(r.text).toContain("세션 ID (session_id): `rs-1`");
    expect(r.text).toContain("### 항목 1/4 (item_id `i-new`) · list.fold · 새 카드 · 고르기");
    expect(r.text).toContain("새 카드예요. 먼저 요약과 예를 보여 준 뒤 질문하세요.");
    expect(r.text).toContain("```gleam\nlist.fold([1, 2, 3], 0, fn(acc, x) { acc + x })  // -> 6\n```");
    expect(r.text).toContain("- [0] `fn(원소, 누적값)`\n- [1] `fn(누적값, 원소)`");
    expect(r.text).toContain("```gleam\nlist.____([1, 2, 3], 0, fn(acc, x) { acc + x })\n```");
    expect(r.text).toContain("```gleam\nimport gleam/list\n\npub fn total(xs: List(Int)) -> Int {\n  ...\n}\n```");
    expect(r.text).toContain("힌트 (학습자가 원할 때만): 시작값은 0이에요.");
    expect(r.text).toContain("recall_finish (session_id `rs-1`)");
    expect(r.text).toContain("학습자가 답하기 전에는 정답이나 빈칸, 값, 코드를 알려 주지 마세요");
    expect(r.text).toContain("never reveal or hint at the choice, the blank, the value or the body");
    // Nothing from the answer key: no reference body, no expected values.
    expect(r.text).not.toContain("acc + x })\n```\n\n모범");
    expect(r.text).not.toContain("-6");
    expect(r.structured).toMatchObject({ session: recallSession("ko"), locale: "ko" });
  });

  it("recall_start without options sends none; an empty session says so without a note", async () => {
    const { call, called } = await connect("en", { startRecall: async () => ({ ...recallSession(), items: [] }) });
    const r = await call("recall_start");
    expect(called("startRecall")[0]?.args).toEqual([{}]);
    expect(r.text).toBe("Nothing to review and no new cards right now. See you tomorrow.");
  });

  it("recall_answer maps choice, text and body and measures time since the previous recall call", async () => {
    const { call, called, advance } = await connect();
    await call("recall_start");
    advance(4000);
    const right = await call("recall_answer", { session_id: RECALL_SESSION, item_id: "i-new", choice: 1 });
    advance(2500);
    await call("recall_answer", { session_id: RECALL_SESSION, item_id: "i-cloze", text: "fold" });
    await call("recall_answer", { session_id: RECALL_SESSION, item_id: "i-predict", text: "6", elapsed_ms: 1234.4 });
    const body = "list.fold(xs, 0, fn(acc, x) { acc + x })";
    await call("recall_answer", { session_id: RECALL_SESSION, item_id: "i-produce", body });
    expect(called("recallAnswer").map((c) => c.args)).toEqual([
      [RECALL_SESSION, { itemId: "i-new", response: { kind: "choice", choice: 1 }, elapsedMs: 4000 }],
      [RECALL_SESSION, { itemId: "i-cloze", response: { kind: "text", text: "fold" }, elapsedMs: 2500 }],
      [RECALL_SESSION, { itemId: "i-predict", response: { kind: "text", text: "6" }, elapsedMs: 1234 }],
      [RECALL_SESSION, { itemId: "i-produce", response: { kind: "code", body }, elapsedMs: 0 }],
    ]);
    expect(right.text).toContain("✓ 정답이에요\n\n맞아요. 누적값이 먼저예요.");
    expect(right.text).toContain("다음 복습: 2026-10-05 09:30 UTC · 단계: 고르기");
    expect(right.structured).toMatchObject({ result: { correct: true, rating: "good" }, locale: "ko" });
  });

  it("recall_answer relays expected/actual, diagnostics, missing tokens and the reference after wrong answers", async () => {
    const { call } = await connect();
    const predict = await call("recall_answer", { session_id: RECALL_SESSION, item_id: "i-predict", text: "6" });
    expect(predict.text).toContain("✗ 아직 아니에요");
    expect(predict.text).toContain("정답: `-6`\n학습자 답의 값: `6`");
    const produce = await call("recall_answer", { session_id: RECALL_SESSION, item_id: "i-produce", body: "0" });
    expect(produce.text).toContain("꼭 써야 하는 것: `list.fold`");
    expect(produce.text).toContain("컴파일/실행 문제:\n\n```\nwarning: unused variable xs\n```");
    expect(produce.text).toContain("모범 답안:\n\n```gleam\nlist.fold(xs, 0, fn(acc, x) { acc + x })\n```");
    expect(produce.text).toContain("단계: 빈칸 채우기");
  });

  it.each([
    [{}],
    [{ choice: 1, text: "fold" }],
    [{ text: "fold", body: "x" }],
  ])("recall_answer needs exactly one of choice, text, body (%j)", async (args) => {
    const { call, called } = await connect("en");
    const r = await call("recall_answer", { session_id: RECALL_SESSION, item_id: "i-new", ...args });
    expect(r.isError).toBe(true);
    expect(r.text).toBe("Send exactly one of choice, text or body.");
    expect(called("recallAnswer")).toHaveLength(0);
  });

  it("recall_finish returns the summary", async () => {
    const { call, called } = await connect();
    await call("recall_answer", { session_id: RECALL_SESSION, item_id: "i-new", choice: 1 });
    const r = await call("recall_finish", { session_id: RECALL_SESSION });
    expect(called("finishRecall")[0]?.args).toEqual([RECALL_SESSION]);
    expect(r.text).toContain("## 세션 요약");
    expect(r.text).toContain("답한 항목 1개 · 정답 1개 (100%) · 새로 익힌 카드 1장 · 내일 복습 2장");
    expect(r.text).toContain("- 핵심 라이브러리 (`stdlib`) · 본 카드 5/50 · 숙달 0 · 복습 대기 1");
  });

  it("recall_cards lists the deck with the learner's state", async () => {
    const { call, called } = await connect("zh");
    const r = await call("recall_cards", { deck_id: "stdlib" });
    expect(called("recallDeckCards")[0]?.args).toEqual(["stdlib"]);
    expect(r.text).toContain("## 卡组 `stdlib` · 共 2 张卡片");
    expect(r.text).toContain("- **list.fold** (`stdlib/list-fold`) · 阶段：填空 · 已复习 3 次 · 下次复习 2026-10-05 09:30 UTC");
    expect(r.text).toContain("- **list.map** (`stdlib/list-map`) · 尚未学习");
    expect(r.text).toContain("从左到右把列表折叠成一个值。");
    expect(r.structured).toMatchObject({ deckId: "stdlib", cards: recallDeckCards("zh"), locale: "zh" });
  });

  it("renders recall chrome in en and zh around server-localized content", async () => {
    const en = await (await connect("en")).call("recall_start");
    expect(en.text).toContain("## Recall session · 4 items");
    expect(en.text).toContain("### Item 1/4 (item_id `i-new`) · list.fold · new card · recognize");
    expect(en.text).toContain("Folds a list from the left into a single value.");
    expect(en.text).toContain("Hint (only if the learner asks)");
    const zh = await (await connect("zh")).call("recall_start");
    expect(zh.text).toContain("## 记忆训练回合 · 共 4 项");
    expect(zh.text).toContain("### 第 4/4 项（item_id `i-produce`） · list.fold · 收尾 · 编写代码");
    expect(zh.structured.locale).toBe("zh");
  });

  it("turns API errors into localized isError results", async () => {
    const { call } = await connect("en", {
      recallAnswer: async () => {
        throw new ApiError(429, { code: "rate_limited", message: "slow down" });
      },
      recallDeckCards: async () => {
        throw new ApiError(404, { code: "not_found", message: "deck missing" });
      },
    });
    const a = await call("recall_answer", { session_id: RECALL_SESSION, item_id: "i-new", choice: 0 });
    expect(a.isError).toBe(true);
    expect(a.text).toBe("Too many requests. Please try again in a moment.");
    const c = await call("recall_cards", { deck_id: "nope" });
    expect(c.isError).toBe(true);
    expect(c.text).toBe("Not found: deck missing");
  });
});
