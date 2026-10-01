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

/**
 * Mixed into the bundle hash only (variant hashes are unaffected, so no exercise gets a new version). Bump it when
 * the importer starts storing data it skipped before, e.g. "lessons-v1" when content/lessons began to be imported:
 * otherwise a database whose current bundle has the same files would treat the next import as a no-op.
 */
export const BUNDLE_FORMAT_VERSION = "fp-bundle-lessons-v1";

/** Hash of the whole content tree (BundleInfo.contentHash). */
export function hashBundle(files: readonly { readonly path: string; readonly bytes: Uint8Array }[]): string {
  // "\0" never occurs in a file path, so this entry cannot collide with a real file.
  return hashFiles([{ path: "\0bundle-format", bytes: new TextEncoder().encode(BUNDLE_FORMAT_VERSION) }, ...files]);
}
