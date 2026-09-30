#!/usr/bin/env node
// Enforces module boundaries statically (pnpm + package "exports" enforce them at runtime too).
// Rules:
//  1. Every @fp/* and third-party import must be declared in the importing package's package.json
//     (root devDependencies are allowed in test files and config only).
//  2. modules/* and shared/* may import other @fp packages only through "@fp/<m>/contract",
//     "@fp/kernel" or "@fp/kernel/testing" (the latter only from test/ files). apps/* and tools/*
//     are composition roots and may also import module root entries.
//  3. Files under src/contract/ may import only @fp/kernel, other contracts, and files inside contract/.
//  4. Relative imports must stay inside the package.
//  5. The package dependency graph between @fp packages must be acyclic.
import { readFileSync } from "node:fs";
import { builtinModules } from "node:module";
import { dirname, join, relative, resolve, sep } from "node:path";
import { ROOT, listPackages, walk } from "./workspace.mjs";

const rootManifest = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const rootDev = new Set(Object.keys(rootManifest.devDependencies ?? {}));
const builtins = new Set(builtinModules.flatMap((m) => [m, `node:${m}`]));
const IMPORT_RE = /(?:^|[\s;])(?:import|export)\s+(?:type\s+)?(?:[^"'`;]*?\sfrom\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/gm;

const pkgs = listPackages();
const byName = new Map(pkgs.map((p) => [p.name, p]));
const violations = [];
const v = (file, msg) => violations.push(`${relative(ROOT, file)}: ${msg}`);

function packageNameOf(spec) {
  const parts = spec.split("/");
  return spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

for (const pkg of pkgs) {
  const files = walk(pkg.dir, (f) => /\.(m?ts|tsx|mjs|js|jsx)$/.test(f) && !f.endsWith(".d.ts"));
  const composition = pkg.group === "apps" || pkg.group === "tools";
  for (const file of files) {
    const relInPkg = relative(pkg.dir, file);
    const isTest = relInPkg.startsWith(`test${sep}`) || /\.test\.[mt]?[jt]sx?$/.test(file) || /(^|\/)(vite|vitest)\.config\./.test(relInPkg);
    const isContract = relInPkg.startsWith(join("src", "contract") + sep);
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(IMPORT_RE)) {
      const spec = m[1] ?? m[2];
      if (!spec) continue;
      if (spec.startsWith(".")) {
        const target = resolve(dirname(file), spec);
        if (!target.startsWith(pkg.dir + sep)) v(file, `relative import escapes package: ${spec}`);
        if (isContract && !target.startsWith(join(pkg.dir, "src", "contract"))) v(file, `contract file imports implementation: ${spec}`);
        continue;
      }
      if (builtins.has(spec) || spec.startsWith("node:")) continue;
      const name = packageNameOf(spec);
      const declared = name in pkg.deps || (isTest && rootDev.has(name));
      if (!declared) v(file, `undeclared dependency "${name}" (add it to ${pkg.rel}/package.json)`);
      if (!name.startsWith("@fp/")) {
        if (isContract) v(file, `contract file imports third-party package "${spec}"`);
        continue;
      }
      const target = byName.get(name);
      if (!target) {
        v(file, `unknown workspace package ${name}`);
        continue;
      }
      const sub = spec.slice(name.length); // "", "/contract", "/testing", ...
      if (name === "@fp/kernel") {
        if (sub === "/testing" && !isTest) v(file, `@fp/kernel/testing may only be imported from tests`);
        else if (sub !== "" && sub !== "/testing") v(file, `unsupported kernel subpath ${spec}`);
        continue;
      }
      if (target.kind === "module") {
        if (sub === "/contract") continue;
        if (sub === "" && composition) continue;
        v(file, `must import "${name}/contract"${composition ? " or the module root" : ""}, not "${spec}"`);
        continue;
      }
      if (target.kind === "shared") {
        if (isContract) v(file, `contract file imports shared package ${spec}`);
        if (sub !== "") v(file, `unsupported subpath ${spec}`);
        continue;
      }
      if (!composition) v(file, `${pkg.kind} package may not import ${target.kind} package ${name}`);
    }
  }
}

// Cycle detection on declared @fp dependencies.
const graph = new Map(pkgs.map((p) => [p.name, Object.keys(p.deps).filter((d) => byName.has(d))]));
const state = new Map();
function dfs(n, stack) {
  state.set(n, "visiting");
  for (const d of graph.get(n) ?? []) {
    if (state.get(d) === "visiting") violations.push(`dependency cycle: ${[...stack, n, d].join(" -> ")}`);
    else if (!state.has(d)) dfs(d, [...stack, n]);
  }
  state.set(n, "done");
}
for (const n of graph.keys()) if (!state.has(n)) dfs(n, []);

if (violations.length) {
  console.error(`Boundary violations (${violations.length}):`);
  for (const line of violations) console.error("  " + line);
  process.exit(1);
}
console.log(`boundaries ok (${pkgs.length} packages)`);
