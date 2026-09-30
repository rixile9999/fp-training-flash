#!/usr/bin/env node
// Definition of done for one package: boundaries + typecheck + that package's tests + context budget.
// Usage: pnpm check:module <package>
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT, findPackage, listPackages } from "./workspace.mjs";

const target = process.argv[2];
const pkg = target && findPackage(listPackages(), target);
if (!pkg) {
  console.error("usage: pnpm check:module <package name | dir>");
  process.exit(2);
}
const run = (label, cmd, args, cwd = ROOT) => {
  console.log(`\n== ${label}: ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit" });
  if (r.status !== 0) {
    console.error(`\n✗ ${label} failed for ${pkg.name}`);
    process.exit(r.status ?? 1);
  }
};
run("boundaries", "node", ["tools/check-boundaries.mjs"]);
run("context budget", "node", ["tools/ctx.mjs", pkg.name, "--check"]);
if (pkg.name === "@fp/web") {
  run("typecheck", "pnpm", ["--filter", "@fp/web", "typecheck"]);
  run("tests", "pnpm", ["--filter", "@fp/web", "test"]);
} else {
  run("typecheck", "pnpm", ["exec", "tsc", "-p", join(pkg.rel, "tsconfig.json"), "--noEmit"]);
  if (existsSync(join(pkg.dir, "test"))) run("tests", "pnpm", ["exec", "vitest", "run", pkg.rel]);
  else console.log(`\n(no test/ directory in ${pkg.rel})`);
}
console.log(`\n✓ ${pkg.name} passes its definition of done`);
