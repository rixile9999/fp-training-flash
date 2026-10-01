import { createHash } from "node:crypto";
import { compareStrings, type TreeFile } from "./tree.ts";

/**
 * Mixed into every hash. Bump it when the loader's interpretation of files changes, so variants whose
 * files did not change are still re-imported (as a new version) with the new interpretation.
 */
export const CONTENT_FORMAT_VERSION = "fp-content-v1";

/** sha256 over (path, content) pairs sorted by path, length-prefixed so boundaries are unambiguous. */
export function hashFiles(entries: readonly { readonly path: string; readonly bytes: Uint8Array }[]): string {
  const h = createHash("sha256");
  h.update(CONTENT_FORMAT_VERSION);
  const sorted = [...entries].sort((a, b) => compareStrings(a.path, b.path));
  for (const e of sorted) {
    const p = Buffer.from(e.path, "utf8");
    h.update(`\n${p.length}:`);
    h.update(p);
    h.update(`:${e.bytes.length}:`);
    h.update(e.bytes);
  }
  return h.digest("hex");
}

/**
 * Hash of one variant: the family files (family.yaml and its translations family.<locale>.yaml, paths relative
 * to the family directory) plus every file of the variant directory (including its translations), with paths
 * relative to that directory. Independent of where the content root lives.
 */
export function hashVariant(
  familyFiles: readonly TreeFile[],
  familyPrefix: string,
  variantFiles: readonly TreeFile[],
  variantPrefix: string,
): string {
  const entries: { path: string; bytes: Uint8Array }[] = [];
  for (const f of familyFiles) entries.push({ path: f.path.slice(familyPrefix.length), bytes: f.bytes });
  for (const f of variantFiles) entries.push({ path: `variant/${f.path.slice(variantPrefix.length)}`, bytes: f.bytes });
  return hashFiles(entries);
}
