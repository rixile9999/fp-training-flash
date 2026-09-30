#!/usr/bin/env node
// stdio entry point. Configure the host with FP_TOKEN (from `fp token issue mcp`) and optionally FP_API_URL.
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { apiFromEnv } from "./api.ts";
import { createFpMcpServer } from "./server.ts";

if (!process.env.FP_TOKEN) {
  // stdout is the protocol channel; diagnostics go to stderr.
  console.error("[fp-mcp] FP_TOKEN이 설정되지 않았습니다. `fp token issue mcp`로 발급한 토큰을 설정하세요.");
}

const server = createFpMcpServer({ api: apiFromEnv(process.env) });
await server.connect(new StdioServerTransport());
