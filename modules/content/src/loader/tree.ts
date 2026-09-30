import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";

/** One file of the content tree, keyed by its POSIX path relative to the content root. */
export interface TreeFile {
  readonly path: string;
  readonly bytes: Uint8Array;
  readonly text: string;
}

/** In-memory snapshot of a content directory. Paths use "/" and iterate in sorted order. */
export interface ContentTree {
  readonly files: ReadonlyMap<string, TreeFile>;
}

const decoder = new TextDecoder("utf-8");

/** Reads every non-hidden file below `root`. Returns null when `root` is not a directory. */
export async function readContentTree(root: string): Promise<ContentTree | null> {
  try {
    if (!(await stat(root)).isDirectory()) return null;
  } catch {
    return null;
  }
  const found: { full: string; rel: string }[] = [];
  const walk = async (dir: string): Promise<void> => {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      if (e.name.startsWith(".")) continue;
      const full = join(dir, e.name);
      if (e.isDirectory()) await walk(full);
      else if (e.isFile()) found.push({ full, rel: relative(root, full).split(sep).join("/") });
    }
  };
  await walk(root);
  found.sort((a, b) => compareStrings(a.rel, b.rel));
  const files = new Map<string, TreeFile>();
  for (const { full, rel } of found) {
    const bytes = new Uint8Array(await readFile(full));
    files.set(rel, { path: rel, bytes, text: decoder.decode(bytes) });
  }
  return { files };
}

/** Builds a tree from literal text files (tests and tools). */
export function treeFromTexts(texts: Readonly<Record<string, string>>): ContentTree {
  const encoder = new TextEncoder();
  const files = new Map<string, TreeFile>();
  for (const path of Object.keys(texts).sort(compareStrings)) {
    const text = texts[path] ?? "";
    files.set(path, { path, bytes: encoder.encode(text), text });
  }
  return { files };
}

/** Code-unit comparison: stable across locales, unlike localeCompare. */
export function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Files whose path starts with `prefix` (e.g. "dir/"), in sorted order. */
export function filesUnder(tree: ContentTree, prefix: string): TreeFile[] {
  const out: TreeFile[] = [];
  for (const f of tree.files.values()) if (f.path.startsWith(prefix)) out.push(f);
  return out;
}

/** Names of the immediate subdirectories of `prefix` ("dir/", or "" for the root), sorted. */
export function subdirs(tree: ContentTree, prefix: string): string[] {
  const names = new Set<string>();
  for (const p of tree.files.keys()) {
    if (!p.startsWith(prefix)) continue;
    const rest = p.slice(prefix.length);
    const slash = rest.indexOf("/");
    if (slash > 0) names.add(rest.slice(0, slash));
  }
  return [...names].sort(compareStrings);
}
