#!/usr/bin/env node
// PreToolUse hook: when a `.fp-scope` file exists at the project root, Edit/Write/NotebookEdit may only
// touch paths under the prefixes it lists (one per line, relative to the project root, `#` comments).
// No `.fp-scope` file means no restriction. Exit code 2 blocks the tool call and shows stderr to Claude.
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";

const input = JSON.parse(readFileSync(0, "utf8") || "{}");
const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const scopeFile = join(root, ".fp-scope");
if (!existsSync(scopeFile)) process.exit(0);

const prefixes = readFileSync(scopeFile, "utf8")
  .split("\n")
  .map((l) => l.replace(/#.*/, "").trim())
  .filter(Boolean)
  .map((p) => p.replace(/\/+$/, ""));
const target = input.tool_input?.file_path ?? input.tool_input?.notebook_path;
if (!target) process.exit(0);
const rel = relative(root, isAbsolute(target) ? target : resolve(root, target));
const allowed = prefixes.some((p) => rel === p || rel.startsWith(p + "/"));
if (!allowed) {
  console.error(
    `scope-guard: "${rel}" is outside this task's scope (${prefixes.join(", ")}). ` +
      `Change the contract first in a separate task, or ask for the scope to be widened.`,
  );
  process.exit(2);
}
