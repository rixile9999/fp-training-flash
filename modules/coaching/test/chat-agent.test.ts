import { afterEach, describe, expect, it } from "vitest";
import { ok, runMigrations, silentLogger, type Db } from "@fp/kernel";
import { createFixedClock, createTestDb } from "@fp/kernel/testing";
import type { GradingService, SnippetRequest } from "@fp/grading/contract";
import { migrations } from "../src/index.ts";
import { createCoachingService } from "../src/internal/service.ts";
import type { LlmClient, ToolChatRequest, ToolChatResponse } from "../src/internal/llm.ts";
import { lookupStdlib, lookupSyntax } from "../src/internal/gleam-reference.ts";
import { EXERCISE_ID, LEARNER_CODE, USER, fakeCatalog, fakeGrading, fakeLearner } from "./fixtures.ts";

let db: Db | undefined;
afterEach(async () => {
  await db?.close();
  db = undefined;
});

type Step = ToolChatResponse | (() => Promise<ToolChatResponse>);

function toolLlm(steps: readonly Step[], complete = "단일 호출 답변"): LlmClient & { requests: ToolChatRequest[]; completes: number } {
  const requests: ToolChatRequest[] = [];
  const client = {
    model: "fake-tools",
    requests,
    completes: 0,
    async complete() {
      client.completes++;
      return complete;
    },
    async chatWithTools(req: ToolChatRequest) {
      requests.push({ ...req, messages: [...req.messages] });
      const step = steps[Math.min(requests.length - 1, steps.length - 1)]!;
      return typeof step === "function" ? step() : step;
    },
  };
  return client;
}

const call = (id: string, name: string, args: object) => ({ id, name, arguments: JSON.stringify(args) });

async function service(llm: LlmClient, snippets: SnippetRequest[] = []) {
  const fresh = await createTestDb();
  db = fresh;
  await runMigrations(fresh, "coaching", migrations);
  const grading: GradingService = {
    ...fakeGrading([]),
    evaluateSnippet: async (req) => {
      snippets.push(req);
      return ok({ kind: "value" as const, value: "[2, 4]" });
    },
  };
  return createCoachingService({
    db: fresh,
    clock: createFixedClock(),
    logger: silentLogger,
    catalog: fakeCatalog(),
    grading,
    learner: fakeLearner(),
    llm,
    chatAgent: true,
  });
}

const ask = (content: string) => ({ userId: USER, exerciseId: EXERCISE_ID, code: LEARNER_CODE, messages: [{ role: "user" as const, content }] });

describe("chat agent", () => {
  it("runs tools, feeds results back as tool messages, and returns the final answer", async () => {
    const snippets: SnippetRequest[] = [];
    const llm = toolLlm([
      { text: "", toolCalls: [call("c1", "lookup_stdlib", { module: "list", query: "fold_right" }), call("c2", "evaluate_gleam", { imports: ["gleam/list"], expression: "list.map([1, 2], fn(x) { x * 2 })" })] },
      { text: "fold_right가 있어요. 15행을 보세요.", toolCalls: [] },
    ]);
    const svc = await service(llm, snippets);
    const r = await svc.chat(ask("오른쪽부터 접는 함수가 있나요?"));
    expect(r.ok && r.value.message.content).toBe("fold_right가 있어요. 15행을 보세요.");
    expect(r.ok && r.value.source).toBe("llm");
    expect(snippets).toEqual([{ imports: ["gleam/list"], expression: "list.map([1, 2], fn(x) { x * 2 })" }]);
    const second = llm.requests[1]!;
    const toolMsgs = second.messages.filter((m) => m.role === "tool");
    expect(toolMsgs).toHaveLength(2);
    expect(toolMsgs[0]!.content).toContain("list.fold_right(");
    expect(toolMsgs[1]!.content).toBe("value: [2, 4]");
    expect(second.system).toContain("Tools:");
    expect(llm.completes).toBe(0);
  });

  it("stops offering tools after the budget and forces a text answer", async () => {
    const llm = toolLlm([
      { text: "", toolCalls: [call("a", "syntax_reference", { topic: "case" })] },
      { text: "", toolCalls: [call("b", "syntax_reference", { topic: "pipe" })] },
      { text: "", toolCalls: [call("c", "syntax_reference", { topic: "use" })] },
      { text: "최종 답변", toolCalls: [call("d", "syntax_reference", { topic: "let" })] },
    ]);
    const svc = await service(llm);
    const r = await svc.chat(ask("case 문법?"));
    expect(r.ok && r.value.message.content).toBe("최종 답변");
    expect(llm.requests).toHaveLength(4);
    expect(llm.requests[3]!.tools).toEqual([]);
  });

  it("falls back to the single-call chat when the agent fails", async () => {
    const llm = toolLlm([() => Promise.reject(new Error("tool api down"))], "단일 호출 답변");
    const svc = await service(llm);
    const r = await svc.chat(ask("질문"));
    expect(r.ok && r.value.message.content).toBe("단일 호출 답변");
    expect(llm.completes).toBe(1);
  });
});

describe("reference lookups", () => {
  it("finds stdlib functions by module and name fragment", () => {
    expect(lookupStdlib("list", "fold")).toMatch(/list\.fold\(/);
    expect(lookupStdlib("gleam/nope")).toContain("모듈이 없습니다");
    expect(lookupStdlib("list", "zzz")).toContain("일치하는 함수가 없습니다");
  });

  it("returns the best matching syntax sections", () => {
    expect(lookupSyntax("if else loops")).toContain("No `if`/`else`");
    expect(lookupSyntax("qqqq")).toContain("일치하는 문법 항목이 없습니다");
  });
});
