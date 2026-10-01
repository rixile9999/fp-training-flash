#!/usr/bin/env node
// stdio entry point. Configure the host with FP_TOKEN (from `fp token issue mcp`) and optionally FP_API_URL
// and FP_LANG (fixed output language; by default the account's user.locale from /v1/me).
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { apiFromEnv } from "./api.ts";
import { DEFAULT_LOCALE, msg, normalizeLocale } from "./messages.ts";
import { createFpMcpServer } from "./server.ts";

const locale = normalizeLocale(process.env.FP_LANG);
if (!process.env.FP_TOKEN) {
  // stdout is the protocol channel; diagnostics go to stderr.
  console.error(msg(locale ?? normalizeLocale(process.env.LANG) ?? DEFAULT_LOCALE, "tokenMissing"));
}

const server = createFpMcpServer({ api: apiFromEnv(process.env), ...(locale ? { locale } : {}) });
await server.connect(new StdioServerTransport());
