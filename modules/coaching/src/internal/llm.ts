/**
 * Internal LLM gateway. Everything outside this file talks to `LlmClient`, so tests use a fake
 * and the provider can be swapped. `complete` throws on any failure; callers fall back to rules.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

/** Default model id (per the claude-api skill); override with LlmConfig.model / FP_COACH_MODEL. */
export const DEFAULT_COACH_MODEL = "claude-opus-5";

export interface LlmMessage {
  readonly role: "user" | "assistant";
  readonly content: string;
}

export interface LlmRequest {
  /** Operator instructions only. Never put learner-controlled text here. */
  readonly system: string;
  readonly messages: readonly LlmMessage[];
  /** When set, the model is constrained to JSON for this schema. Callers still validate the text. */
  readonly jsonSchema?: z.ZodType;
  readonly maxOutputTokens?: number;
}

/** A tool the model may call; `parameters` is a JSON Schema object. */
export interface ToolSpec {
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<string, unknown>;
}

export interface ToolCall {
  readonly id: string;
  readonly name: string;
  /** Raw JSON arguments as produced by the model; may be invalid. */
  readonly arguments: string;
}

export type AgentMessage =
  | { readonly role: "user"; readonly content: string }
  | { readonly role: "assistant"; readonly content: string; readonly toolCalls?: readonly ToolCall[] }
  | { readonly role: "tool"; readonly toolCallId: string; readonly content: string };

export interface ToolChatRequest {
  readonly system: string;
  readonly messages: readonly AgentMessage[];
  /** Empty means the model must answer in text. */
  readonly tools: readonly ToolSpec[];
  readonly maxOutputTokens?: number;
}

export interface ToolChatResponse {
  readonly text: string;
  readonly toolCalls: readonly ToolCall[];
}

export interface LlmClient {
  readonly model: string;
  /** Returns the text of the reply. Throws on API errors, refusals and truncation. */
  complete(req: LlmRequest): Promise<string>;
  /** One tool-calling turn. Optional: providers without it use the single-call chat path. */
  chatWithTools?(req: ToolChatRequest): Promise<ToolChatResponse>;
}

export interface AnthropicLlmOptions {
  readonly apiKey: string;
  readonly model?: string;
  readonly maxOutputTokens?: number;
  readonly timeoutMs?: number;
}

export function createAnthropicLlmClient(opts: AnthropicLlmOptions): LlmClient {
  const client = new Anthropic({ apiKey: opts.apiKey, maxRetries: 1, timeout: opts.timeoutMs ?? 30_000 });
  const model = opts.model ?? DEFAULT_COACH_MODEL;
  return {
    model,
    async complete(req) {
      // Server-side refusal fallback: if the model declines, the API re-runs the request on a fallback model
      // chosen by refusal category. A refusal of the whole chain still throws below (rule-based feedback).
      const response = await client.beta.messages.create({
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        model,
        max_tokens: req.maxOutputTokens ?? opts.maxOutputTokens ?? 8000,
        // The system prompt is static per prompt version, so it is a stable cache prefix.
        system: [{ type: "text", text: req.system, cache_control: { type: "ephemeral" } }],
        messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
        output_config: req.jsonSchema
          ? { effort: "medium", format: zodOutputFormat(req.jsonSchema) }
          : { effort: "medium" },
      });
      if (response.stop_reason === "refusal") throw new Error("llm refused");
      if (response.stop_reason === "max_tokens") throw new Error("llm output truncated");
      const text = response.content
        .flatMap((block) => (block.type === "text" ? [block.text] : []))
        .join("")
        .trim();
      if (text.length === 0) throw new Error("llm returned no text");
      return text;
    },
  };
}

/** Rejects when `promise` does not settle within `ms`. */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`llm timeout after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
