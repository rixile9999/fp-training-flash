import { err, ok, type Result } from "@fp/kernel";
import { parseContent, type ContentIssue, type ParsedContent } from "./loader/parse.ts";
import { readContentTree, type ContentTree } from "./loader/tree.ts";

/** Fully parsed, validated content tree. Opaque to other modules. */
export interface ContentBundle {
  readonly bundleId: string;
  readonly contentHash: string;
}

/** Parsed content behind each bundle handed out by the loader. Only bundles we created can be imported. */
const parsedByBundle = new WeakMap<ContentBundle, ParsedContent>();

export function bundleIdOf(contentHash: string): string {
  return `bundle-${contentHash.slice(0, 16)}`;
}

export function parsedContentOf(bundle: ContentBundle): ParsedContent | undefined {
  return parsedByBundle.get(bundle);
}

export function bundleFromTree(tree: ContentTree): Result<ContentBundle, readonly ContentIssue[]> {
  const parsed = parseContent(tree);
  if (!parsed.ok) return parsed;
  const bundle: ContentBundle = Object.freeze({
    bundleId: bundleIdOf(parsed.value.contentHash),
    contentHash: parsed.value.contentHash,
  });
  parsedByBundle.set(bundle, parsed.value);
  return ok(bundle);
}

export async function loadDirectory(dir: string): Promise<Result<ContentBundle, readonly ContentIssue[]>> {
  const tree = await readContentTree(dir);
  if (!tree) return err([{ path: ".", message: `content directory not found: ${dir}` }]);
  return bundleFromTree(tree);
}
