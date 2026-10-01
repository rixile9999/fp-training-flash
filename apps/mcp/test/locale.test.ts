import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ApiError } from "@fp/api-contract";
import type { Locale } from "@fp/api-contract";
import { describeError } from "../src/api.ts";
import { renderTrialRun } from "../src/format.ts";
import { MESSAGES, formatMessage, msg, normalizeLocale, pickLocale } from "../src/messages.ts";
import { createFpMcpServer } from "../src/server.ts";
import type { FpApi } from "../src/api.ts";
import { EX_ID, exerciseView, failingRun, fakeApi, session } from "./fixtures.ts";

const HANGUL = /[가-힣]/;
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

async function connect(opts: { locale?: Locale; fixed?: Locale; overrides?: Partial<FpApi> } = {}) {
  const { api, calls } = fakeApi(opts.overrides ?? {}, session(), opts.locale ?? "ko");
  const server = createFpMcpServer({ api, newKey: () => "key-1", ...(opts.fixed ? { locale: opts.fixed } : {}) });
  const client = new Client({ name: "test", version: "0.0.0" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const r = (await client.callTool({ name, arguments: args })) as CallToolResult;
    const text = r.content.map((c) => (c.type === "text" ? c.text : "")).join("\n");
    return { ...r, text, locale: (r.structuredContent as { locale?: string } | undefined)?.locale };
  };
  return { client, calls, call };
}

describe("message catalog", () => {
  it("has en and zh for every message, different from ko, with the same placeholders", () => {
    for (const [id, text] of Object.entries(MESSAGES)) {
      const t = text as { ko: string; en?: string; zh?: string };
      for (const loc of ["en", "zh"] as const) {
        expect(t[loc], `${id}.${loc}`).toBeTruthy();
        expect(t[loc], `${id}.${loc}`).not.toBe(t.ko);
        expect(placeholders(t[loc] ?? ""), `${id}.${loc}`).toEqual(placeholders(t.ko));
      }
    }
  });

  it("falls back to Korean for missing translations and by default", () => {
    expect(pickLocale({ ko: "가" }, "en")).toBe("가");
    expect(pickLocale({ ko: "가", zh: "甲" }, "zh")).toBe("甲");
    expect(formatMessage("{x}/{y}", { x: 1 })).toBe("1/{y}");
    expect(msg("ko", "sessionStarted")).toBe("새 세션을 시작했습니다.");
    expect(renderTrialRun(failingRun)).toContain("결과: 테스트 실패");
    expect(describeError(new ApiError(401, { code: "unauthorized", message: "x" }))).toContain("인증에 실패했습니다");
    expect(normalizeLocale("zh_CN.UTF-8")).toBe("zh");
    expect(normalizeLocale("fr")).toBeUndefined();
  });

  it("renders en and zh differently from ko", () => {
    const [ko, en, zh] = (["ko", "en", "zh"] as const).map((l) => renderTrialRun(failingRun, l));
    expect(en).toContain("Result: tests failed (1/2 tests passed)");
    expect(zh).toContain("结果：测试未通过（测试 1/2 通过）");
    expect(new Set([ko, en, zh]).size).toBe(3);
    const err = new ApiError(429, { code: "rate_limited", message: "slow down" });
    expect(describeError(err, "en")).toBe("Too many requests. Please try again in a moment.");
    expect(describeError(err, "zh")).toBe("请求过多，请稍后再试。");
  });
});

describe("MCP server in the learner's locale", () => {
  it("keeps tool titles, descriptions and the instructions in English, and asks the host to use user.locale", async () => {
    const { client } = await connect({ locale: "zh" });
    const { tools } = await client.listTools();
    for (const tool of tools) expect(JSON.stringify({ t: tool.title, d: tool.description, s: tool.inputSchema }), tool.name).not.toMatch(HANGUL);
    const instructions = client.getInstructions() ?? "";
    expect(instructions).toContain("user.locale");
    expect(instructions).toMatch(/talk to the learner in the learner's language/);
    expect(instructions).not.toMatch(HANGUL);
  });

  it("renders tool output in English for an en account, with the locale in structuredContent", async () => {
    const { call } = await connect({ locale: "en" });
    const r = await call("current_exercise");
    expect(r.text).toContain("This is your active session.");
    expect(r.text).toContain("Current exercise (1/2)");
    expect(r.text).toContain("### Problem");
    expect(r.text).toContain("1 of 3 levels revealed.");
    expect(r.text).toContain("Coach note: let the learner write the code.");
    expect(r.text).toContain("the learner's language is English (en)");
    expect(r.text).not.toContain("SECRET-HINT");
    expect(r.locale).toBe("en");
    // Server-provided content is passed through (the fake API serves Korean text).
    expect(r.text).toContain(exerciseView().exercise.promptMarkdown);
  });

  it("renders tool output and errors in Simplified Chinese for a zh account", async () => {
    const { call } = await connect({
      locale: "zh",
      overrides: { submit: async () => Promise.reject(new ApiError(401, { code: "unauthorized", message: "bad token" })) },
    });
    const run = await call("run_code", { exercise_id: EX_ID, code: "x" });
    expect(run.text).toContain("## 运行结果（仅公开测试，不记录）");
    expect(run.text).toContain("[未通过] 다른 주문은 유지");
    const hint = await call("request_hint", { exercise_id: EX_ID, level: 3 });
    expect(hint.text).toContain("## 提示（至第 3 级）");
    expect(hint.text).toContain("本题的提交将不计入评分");
    const progress = await call("get_progress");
    expect(progress.text).toContain("## 学习进度");
    const sub = await call("submit_solution", { exercise_id: EX_ID, code: "x", session_id: "s" });
    expect(sub.isError).toBe(true);
    expect(sub.text).toContain("认证失败");
  });

  it("fetches /v1/me once per server instance", async () => {
    const { call, calls } = await connect({ locale: "en" });
    await call("get_progress");
    await call("current_exercise");
    await call("run_code", { exercise_id: EX_ID, code: "x" });
    expect(calls.filter((c) => c.method === "me")).toHaveLength(1);
  });

  it("falls back to Korean when /v1/me fails, and retries on the next call", async () => {
    let fail = true;
    const { call, calls } = await connect({
      overrides: {
        me: async () => {
          if (fail) throw new TypeError("fetch failed");
          return { id: "user-1" as never, displayName: "Alex", locale: "en", createdAt: "2026-09-30T00:00:00.000Z" };
        },
      },
    });
    const first = await call("get_progress");
    expect(first.text).toContain("## 학습 현황");
    expect(first.locale).toBe("ko");
    fail = false;
    const second = await call("get_progress");
    expect(second.text).toContain("## Progress");
    await call("get_progress");
    expect(calls.filter((c) => c.method === "me")).toHaveLength(2);
  });

  it("uses a fixed locale without asking the server", async () => {
    const { call, calls } = await connect({ locale: "ko", fixed: "zh" });
    const r = await call("current_exercise");
    expect(r.text).toContain("当前题目（1/2）");
    expect(calls.filter((c) => c.method === "me")).toEqual([]);
  });

  it("localizes resource fallbacks", async () => {
    const view = exerciseView();
    const { client } = await connect({ locale: "en", overrides: { exercise: async () => ({ ...view, conceptNotes: [] }) } });
    const res = await client.readResource({ uri: `fp://exercise/${encodeURIComponent(EX_ID)}/concepts` });
    expect((res.contents[0] as { text: string }).text).toBe("This exercise has no linked coding concept notes.");
  });
});
