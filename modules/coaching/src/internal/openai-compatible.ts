/**
 * LLM client for OpenAI-compatible Chat Completions endpoints, used for Alibaba Cloud Model Studio
 * (DashScope compatible mode). Same `LlmClient` contract as the Anthropic client: returns the reply text and
 * throws on HTTP errors, content filtering, truncation or empty output, so callers fall back to rule-based output.
 */
import { z } from "zod";
import type { AgentMessage, LlmClient, LlmRequest, ToolCall, ToolChatRequest, ToolChatResponse } from "./llm.ts";

/** International (Singapore) Model Studio endpoint. */
export const DASHSCOPE_INTL_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

export interface OpenAiCompatibleOptions {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly model: string;
  readonly maxOutputTokens?: number;
  /**
   * DashScope `enable_thinking`. Reasoning tokens count against max_tokens and add latency; coaching output is
   * short and evidence-bound, so the default is off. Undefined leaves the model's own default.
   */
  readonly enableThinking?: boolean;
  readonly fetch?: typeof fetch;
}

interface ChatCompletion {
  readonly choices?: readonly {
    readonly finish_reason?: string | null;
    readonly message?: {
      readonly content?: string | null;
      readonly tool_calls?: readonly { readonly id: string; readonly function: { readonly name: string; readonly arguments: string } }[];
    };
  }[];
  readonly error?: { readonly message?: string; readonly code?: string } | null;
}

export function createOpenAiCompatibleLlmClient(opts: OpenAiCompatibleOptions): LlmClient {
  const doFetch = opts.fetch ?? globalThis.fetch.bind(globalThis);
  const url = `${opts.baseUrl.replace(/\/+$/, "")}/chat/completions`;
  async function post(body: Record<string, unknown>): Promise<ChatCompletion> {
    const res = await doFetch(url, {
      method: "POST",
      headers: { authorization: `Bearer ${opts.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json: ChatCompletion;
    try {
      json = JSON.parse(text) as ChatCompletion;
    } catch {
      throw new Error(`llm http ${res.status}: non-JSON response`);
    }
    if (!res.ok || json.error) {
      throw new Error(`llm http ${res.status}: ${json.error?.code ?? ""} ${json.error?.message ?? ""}`.trim());
    }
    return json;
  }

  return {
    model: opts.model,
    async chatWithTools(req: ToolChatRequest): Promise<ToolChatResponse> {
      const body: Record<string, unknown> = {
        model: opts.model,
        max_tokens: req.maxOutputTokens ?? opts.maxOutputTokens ?? 4000,
        messages: [{ role: "system", content: req.system }, ...req.messages.map(toWire)],
      };
      if (opts.enableThinking !== undefined) body.enable_thinking = opts.enableThinking;
      if (req.tools.length > 0) {
        body.tools = req.tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.parameters } }));
      }
      const json = await post(body);
      const choice = json.choices?.[0];
      if (choice?.finish_reason === "length") throw new Error("llm output truncated");
      if (choice?.finish_reason === "content_filter") throw new Error("llm refused");
      const toolCalls: ToolCall[] = (choice?.message?.tool_calls ?? []).map((c) => ({
        id: c.id,
        name: c.function.name,
        arguments: c.function.arguments,
      }));
      return { text: (choice?.message?.content ?? "").trim(), toolCalls };
    },
    async complete(req: LlmRequest): Promise<string> {
      const body: Record<string, unknown> = {
        model: opts.model,
        max_tokens: req.maxOutputTokens ?? opts.maxOutputTokens ?? 4000,
        messages: [{ role: "system", content: req.system }, ...req.messages.map((m) => ({ role: m.role, content: m.content }))],
      };
      if (opts.enableThinking !== undefined) body.enable_thinking = opts.enableThinking;
      if (req.jsonSchema) {
        body.response_format = {
          type: "json_schema",
          json_schema: { name: "coach_output", strict: true, schema: z.toJSONSchema(req.jsonSchema) },
        };
      }
      const json = await post(body);
      const choice = json.choices?.[0];
      if (choice?.finish_reason === "length") throw new Error("llm output truncated");
      if (choice?.finish_reason === "content_filter") throw new Error("llm refused");
      const content = (choice?.message?.content ?? "").trim();
      if (content.length === 0) throw new Error("llm returned no text");
      return content;
    },
  };
}

function toWire(m: AgentMessage): Record<string, unknown> {
  if (m.role === "tool") return { role: "tool", tool_call_id: m.toolCallId, content: m.content };
  if (m.role === "assistant" && m.toolCalls && m.toolCalls.length > 0) {
    return {
      role: "assistant",
      content: m.content,
      tool_calls: m.toolCalls.map((c) => ({ id: c.id, type: "function", function: { name: c.name, arguments: c.arguments } })),
    };
  }
  return { role: m.role, content: m.content };
}
