#!/usr/bin/env node
/**
 * Regenerates modules/coaching/src/reference/gleam/generated/stdlib.json from the gleam_stdlib version pinned
 * by the grader template. Run after changing the template's dependencies:
 *   node tools/gleam-reference/src/main.ts
 */
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderPackage, type PackageInterface } from "./render.ts";

const root = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const template = join(root, "modules/grading/runners/gleam/template");
const pkgDir = join(template, "build/packages/gleam_stdlib");
if (!existsSync(pkgDir)) {
  console.log("downloading grader template dependencies…");
  execFileSync("gleam", ["deps", "download"], { cwd: template, stdio: "inherit" });
}
const work = mkdtempSync(join(tmpdir(), "fp-gleam-ref-"));
try {
  cpSync(pkgDir, join(work, "gleam_stdlib"), { recursive: true });
  const out = join(work, "iface.json");
  execFileSync("gleam", ["export", "package-interface", "--out", out], { cwd: join(work, "gleam_stdlib"), stdio: "pipe" });
  const iface = JSON.parse(readFileSync(out, "utf8")) as PackageInterface;
  const gleamVersion = execFileSync("gleam", ["--version"]).toString().trim();
  const modules = renderPackage(iface);
  const target = join(root, "modules/coaching/src/reference/gleam/generated");
  mkdirSync(target, { recursive: true });
  writeFileSync(
    join(target, "stdlib.json"),
    JSON.stringify({ generatedBy: "tools/gleam-reference", package: iface.name, version: iface.version, compiler: gleamVersion, modules }, null, 1) + "\n",
  );
  const lines = modules.reduce((n, m) => n + m.lines.length, 0);
  console.log(`wrote ${modules.length} modules, ${lines} entries for ${iface.name} ${iface.version}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
