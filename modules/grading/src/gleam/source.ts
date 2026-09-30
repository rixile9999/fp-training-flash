/**
 * Tiny lexical helpers for Gleam source text (no full parser). Used by static checks, rubric checks,
 * test-code extraction and compile-error attribution.
 */

function scan(code: string, blankStrings: boolean): string {
  const out = code.split("");
  let i = 0;
  while (i < code.length) {
    if (code[i] === "/" && code[i + 1] === "/") {
      while (i < code.length && code[i] !== "\n") out[i++] = " ";
      continue;
    }
    if (code[i] === '"') {
      i++;
      while (i < code.length && code[i] !== '"') {
        const step = code[i] === "\\" ? 2 : 1;
        for (let k = 0; k < step && i < code.length; k++, i++) if (blankStrings && code[i] !== "\n") out[i] = " ";
      }
      i++;
      continue;
    }
    i++;
  }
  return out.join("");
}

/**
 * Replaces comment and string-literal contents with spaces, keeping offsets and newlines intact, so
 * that pattern searches only see code. String quotes are kept (`"   "`).
 */
export function blankCommentsAndStrings(code: string): string {
  return scan(code, true);
}

/** Blanks comments only (strings stay), for rubric patterns that may target literals. */
export function stripComments(code: string): string {
  return scan(code, false);
}

export interface TopLevelFunction {
  readonly name: string;
  readonly isPublic: boolean;
  /** Offset of the `fn` keyword line start (includes `pub` and attributes on the same line). */
  readonly start: number;
  /** Offset just after the closing brace. */
  readonly end: number;
  /** 1-based lines of the signature start and closing brace. */
  readonly startLine: number;
  readonly endLine: number;
}

const FN_HEAD = /(^|\n)((?:pub\s+)?fn\s+([a-z_][a-z0-9_]*)\s*\()/g;

/** Finds top-level (column 0) function definitions with a body. */
export function topLevelFunctions(code: string): TopLevelFunction[] {
  const blanked = blankCommentsAndStrings(code);
  const found: TopLevelFunction[] = [];
  for (const m of blanked.matchAll(FN_HEAD)) {
    const start = m.index + m[1]!.length;
    // Body starts at the first "{" at paren depth 0 after the parameter list.
    let i = start + m[2]!.length;
    let paren = 1;
    while (i < blanked.length && paren > 0) {
      if (blanked[i] === "(") paren++;
      else if (blanked[i] === ")") paren--;
      i++;
    }
    // Stop at the next top-level item (a line starting in column 0): `@external` functions have no body.
    while (i < blanked.length && blanked[i] !== "{" && !/\n\S/.test(blanked.slice(i, i + 2))) i++;
    if (blanked[i] !== "{") continue; // external or malformed: no body
    let depth = 0;
    let end = i;
    for (; end < blanked.length; end++) {
      if (blanked[end] === "{") depth++;
      else if (blanked[end] === "}" && --depth === 0) break;
    }
    if (depth !== 0) continue;
    found.push({
      name: m[3]!,
      isPublic: m[2]!.startsWith("pub"),
      start,
      end: end + 1,
      startLine: lineOf(code, start),
      endLine: lineOf(code, end),
    });
  }
  return found;
}

function lineOf(code: string, offset: number): number {
  let n = 1;
  for (let i = 0; i < offset; i++) if (code[i] === "\n") n++;
  return n;
}

/** Source text of a top-level function, or null when it is not defined in `code`. */
export function extractFunction(code: string, name: string): string | null {
  const fn = topLevelFunctions(code).find((f) => f.name === name);
  return fn ? code.slice(fn.start, fn.end) : null;
}

/** "src/foo/bar.gleam" | "test/foo/bar.gleam" | "foo/bar.gleam" -> "foo/bar". */
export function moduleNameFromPath(path: string): string {
  return path
    .replace(/^\.\//, "")
    .replace(/^(src|test)\//, "")
    .replace(/\.gleam$/, "");
}

/** Module paths imported by the file, e.g. ["gleam/list", "coupon"]. */
export function importedModules(code: string): string[] {
  const blanked = blankCommentsAndStrings(code);
  return [...blanked.matchAll(/(?:^|\n)\s*import\s+([a-z][a-z0-9_]*(?:\s*\/\s*[a-z][a-z0-9_]*)*)/g)].map((m) =>
    m[1]!.replace(/\s+/g, ""),
  );
}

/** Public names a module exposes (functions, constants, types and their constructors). */
export function publicNames(code: string): string[] {
  const blanked = blankCommentsAndStrings(code);
  const names = new Set<string>();
  for (const m of blanked.matchAll(/(?:^|\n)pub\s+(?:fn|const)\s+([a-z_][a-z0-9_]*)/g)) names.add(m[1]!);
  for (const m of blanked.matchAll(/(?:^|\n)pub\s+(?:opaque\s+)?type\s+([A-Z][A-Za-z0-9]*)/g)) {
    names.add(m[1]!);
    // Constructors: capitalised names at the start of a line inside the type body.
    const bodyStart = blanked.indexOf("{", m.index);
    const bodyEnd = bodyStart >= 0 ? blanked.indexOf("\n}", bodyStart) : -1;
    if (bodyStart < 0 || bodyEnd < 0) continue;
    for (const c of blanked.slice(bodyStart, bodyEnd).matchAll(/\n\s*([A-Z][A-Za-z0-9]*)/g)) names.add(c[1]!);
  }
  return [...names];
}
