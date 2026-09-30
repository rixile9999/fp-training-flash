# ADR 0001: Platform stack and module enforcement

- Status: accepted (2026-09-30)

## Decision

TypeScript on Node 25 (native type stripping, no build step for server packages), pnpm workspaces,
PostgreSQL (PGlite in-process for dev/test), Hono for HTTP, React + Vite + CodeMirror for web, the official MCP
TypeScript SDK, the Anthropic SDK for coaching. Gleam 1.18 on Erlang/OTP in a Docker sandbox for grading.

## Why

- One language across web, API, MCP and CLI, and official SDKs for MCP and Anthropic.
- Module boundaries are enforced mechanically: package.json declares dependencies (pnpm refuses undeclared
  ones), package `exports` expose only `./contract` (Node refuses other subpaths), and tools/check-boundaries.mjs
  adds the contract-only rule and cycle detection. This makes the context a coding agent needs per package
  computable (tools/ctx.mjs) and bounded (context budget check).
- PGlite lets every module test run against real PostgreSQL semantics without external services.

## Consequences

- TypeScript must stay within erasable syntax.
- Web is the only package with a build step.
- Adding a teaching language means a new CodeRunner implementation and runner image, not changes to other modules.
