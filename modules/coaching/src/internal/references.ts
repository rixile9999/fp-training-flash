/**
 * Extracts code line references from coach text in any locale — ko "15행" / "15번째 줄" / "15번 줄",
 * en "line 15" / "lines 3", zh "第15行" / "第 15 行" — in order of first appearance, without duplicates.
 * `maxLine` drops references beyond the code.
 */
export function extractLineReferences(text: string, maxLine?: number): readonly { readonly line: number }[] {
  const pattern = /第\s*(\d{1,5})\s*行|(\d{1,5})\s*(?:행|번째\s*줄|번\s*줄)|\blines?\s*(\d{1,5})\b/gi;
  const seen = new Set<number>();
  const out: { line: number }[] = [];
  for (const m of text.matchAll(pattern)) {
    const line = Number(m[1] ?? m[2] ?? m[3]);
    if (!Number.isInteger(line) || line < 1) continue;
    if (maxLine !== undefined && line > maxLine) continue;
    if (seen.has(line)) continue;
    seen.add(line);
    out.push({ line });
  }
  return out;
}

export function countLines(code: string | undefined): number | undefined {
  if (code === undefined) return undefined;
  return code.split("\n").length;
}
