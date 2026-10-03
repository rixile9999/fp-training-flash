#!/usr/bin/env node
// Prints the deterministic context file set for working on one package:
//   repo guides + the package itself + contracts (transitively) of its @fp dependencies
//   (+ module root entry files when the package is a composition root) + manifest "fp.contextExtras".
// Usage: node tools/ctx.mjs <package>|--all [--tokens] [--cat] [--check]
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { ROOT, findPackage, listPackages, walk } from "./workspace.mjs";

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const targets = args.filter((a) => !a.startsWith("--"));
const pkgs = listPackages();
const byName = new Map(pkgs.map((p) => [p.name, p]));
const rootManifest = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const defaultBudget = rootManifest.fp?.contextBudgetTokens ?? 120000;
const TEXT = /\.(ts|tsx|mjs|js|json|md|gleam|erl|toml|yaml|yml|css|html|sh|txt)$|Dockerfile$/;

const GUIDES = ["CLAUDE.md", "docs/architecture.md"];

function contractFiles(p) {
  if (p.kind === "module") return walk(join(p.dir, "src", "contract"), (f) => TEXT.test(f));
  if (p.kind === "shared") return walk(join(p.dir, "src"), (f) => TEXT.test(f) && !f.includes("/testing/"));
  return [];
}

export function contextFor(pkg) {
  const files = new Set(GUIDES.map((g) => join(ROOT, g)).filter(existsSync));
  // Generated data (e.g. reference tables) is read by code, not by people working on the package.
  for (const f of walk(pkg.dir, (f) => TEXT.test(f) && !f.endsWith("pnpm-lock.yaml") && !f.includes("/generated/"))) files.add(f);
  const composition = pkg.group === "apps" || pkg.group === "tools";
  const seen = new Set();
  const queue = Object.keys(pkg.deps).filter((d) => byName.has(d));
  while (queue.length) {
    const name = queue.shift();
    if (seen.has(name)) continue;
    seen.add(name);
    const dep = byName.get(name);
    for (const f of contractFiles(dep)) files.add(f);
    if (composition && dep.kind === "module" && queue !== null && Object.keys(pkg.deps).includes(name)) {
      const entry = join(dep.dir, "src", "index.ts");
      if (existsSync(entry)) files.add(entry);
    }
    // Contracts reference other contracts: follow the dependency's own @fp deps.
    for (const d of Object.keys(dep.deps)) if (byName.has(d) && !seen.has(d)) queue.push(d);
  }
  for (const extra of pkg.manifest.fp?.contextExtras ?? []) {
    const p = join(ROOT, extra);
    if (!existsSync(p)) continue;
    if (statSync(p).isDirectory()) for (const f of walk(p, (f) => TEXT.test(f))) files.add(f);
    else files.add(p);
  }
  return [...files].sort();
}

// Rough estimate: ~3.5 bytes per token for code/English; Korean text is closer to 1 token per 3 bytes.
const estimateTokens = (files) => Math.round(files.reduce((n, f) => n + statSync(f).size, 0) / 3.3);

const selected = flags.has("--all") ? pkgs : targets.map((t) => findPackage(pkgs, t) ?? (console.error(`unknown package: ${t}`), process.exit(2)));
if (!selected.length) {
  console.error("usage: node tools/ctx.mjs <package>|--all [--tokens] [--cat] [--check]");
  process.exit(2);
}
let over = 0;
for (const pkg of selected) {
  const files = contextFor(pkg);
  const tokens = estimateTokens(files);
  // A package may raise its own budget deliberately (package.json "fp.contextBudgetTokens"); see docs/backlog.md.
  const budget = pkg.manifest.fp?.contextBudgetTokens ?? defaultBudget;
  if (tokens > budget) over++;
  if (flags.has("--tokens") || flags.has("--check") || flags.has("--all")) {
    console.log(`${pkg.name.padEnd(20)} files=${String(files.length).padStart(4)} ~tokens=${String(tokens).padStart(7)} ${tokens > budget ? `OVER BUDGET (${budget})` : ""}`);
  }
  if (!flags.has("--all") && !flags.has("--check")) {
    for (const f of files) {
      if (flags.has("--cat")) console.log(`\n===== ${relative(ROOT, f)} =====\n${readFileSync(f, "utf8")}`);
      else console.log(relative(ROOT, f));
    }
  }
}
if (flags.has("--check") && over) {
  console.error(`${over} package(s) exceed their context budget`);
  process.exit(1);
}
