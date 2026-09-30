// Shared helpers for repo tools: discover workspace packages and their manifests.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("..", import.meta.url)).replace(/\/$/, "");
const GROUPS = ["shared", "modules", "apps", "tools"];

export function listPackages() {
  const pkgs = [];
  for (const g of GROUPS) {
    const gdir = join(ROOT, g);
    if (!existsSync(gdir)) continue;
    for (const name of readdirSync(gdir)) {
      const dir = join(gdir, name);
      const pj = join(dir, "package.json");
      if (!statSync(dir).isDirectory() || !existsSync(pj)) continue;
      const manifest = JSON.parse(readFileSync(pj, "utf8"));
      pkgs.push({
        name: manifest.name,
        dir,
        rel: relative(ROOT, dir),
        group: g,
        kind: manifest.fp?.kind ?? "unknown",
        manifest,
        deps: { ...(manifest.dependencies ?? {}), ...(manifest.devDependencies ?? {}) },
      });
    }
  }
  return pkgs;
}

export function walk(dir, filter = () => true, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "build" || entry === "dist" || entry.startsWith(".")) continue;
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, filter, out);
    else if (filter(p)) out.push(p);
  }
  return out;
}

export function findPackage(pkgs, query) {
  return pkgs.find((p) => p.name === query || p.rel === query || p.rel.split(sep).pop() === query || p.dir === query);
}
