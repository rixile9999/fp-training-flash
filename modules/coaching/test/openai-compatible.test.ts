import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createOpenAiCompatibleLlmClient } from "../src/internal/openai-compatible.ts";

interface Captured {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

function fakeFetch(status: number, payload: unknown, captured: Captured[] = []): typeof fetch {
  return (async (url: string, init: RequestInit) => {
    captured.push({ url, headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) });
    return new Response(typeof payload === "string" ? payload : JSON.stringify(payload), { status });
  }) as unknown as typeof fetch;
}

const ok = (content: string, finish = "stop") => ({ choices: [{ finish_reason: finish, message: { content } }] });
const base = { apiKey: "sk-test", baseUrl: "https://example.test/compatible-mode/v1/", model: "qwen-test" };

describe("OpenAI-compatible LLM client", () => {
  it("sends system + messages, the JSON schema and the thinking switch", async () => {
    const captured: Captured[] = [];
    const client = createOpenAiCompatibleLlmClient({ ...base, enableThinking: false, fetch: fakeFetch(200, ok('{"a":1}'), captured) });
    const text = await client.complete({
      system: "SYS",
      messages: [{ role: "user", content: "hi" }],
      jsonSchema: z.object({ a: z.number() }),
      maxOutputTokens: 123,
    });
    expect(text).toBe('{"a":1}');
    const [c] = captured;
    expect(c?.url).toBe("https://example.test/compatible-mode/v1/chat/completions");
    expect(c?.headers.authorization).toBe("Bearer sk-test");
    expect(c?.body).toMatchObject({
      model: "qwen-test",
      max_tokens: 123,
      enable_thinking: false,
      messages: [
        { role: "system", content: "SYS" },
        { role: "user", content: "hi" },
      ],
      response_format: { type: "json_schema", json_schema: { name: "coach_output", strict: true } },
    });
    const schema = (c?.body.response_format as { json_schema: { schema: { properties: object } } }).json_schema.schema;
    expect(schema.properties).toHaveProperty("a");
  });

  it("omits response_format without a schema and enable_thinking when unspecified", async () => {
    const captured: Captured[] = [];
    const client = createOpenAiCompatibleLlmClient({ ...base, fetch: fakeFetch(200, ok("안녕하세요"), captured) });
    await client.complete({ system: "S", messages: [{ role: "user", content: "q" }] });
    expect(captured[0]?.body).not.toHaveProperty("response_format");
    expect(captured[0]?.body).not.toHaveProperty("enable_thinking");
  });

  it("throws on HTTP errors, truncation, content filtering, empty output and non-JSON bodies", async () => {
    const req = { system: "S", messages: [{ role: "user" as const, content: "q" }] };
    const make = (status: number, payload: unknown) => createOpenAiCompatibleLlmClient({ ...base, fetch: fakeFetch(status, payload) });
    await expect(make(401, { error: { code: "invalid_api_key", message: "bad" } }).complete(req)).rejects.toThrow("401");
    await expect(make(200, ok("partial", "length")).complete(req)).rejects.toThrow("truncated");
    await expect(make(200, ok("", "content_filter")).complete(req)).rejects.toThrow("refused");
    await expect(make(200, ok("   ")).complete(req)).rejects.toThrow("no text");
    await expect(make(502, "<html>bad gateway</html>").complete(req)).rejects.toThrow("non-JSON");
  });
});
