/** Minimal Gleam source scanning: enough to find public test functions and cut out their bodies. */

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pubFnRegExp(fnName: string): RegExp {
  return new RegExp(`(?:^|[^A-Za-z0-9_])pub\\s+fn\\s+${escapeRegExp(fnName)}\\s*\\(`, "m");
}

/** True when the source declares `pub fn <fnName>(`. */
export function declaresPubFn(source: string, fnName: string): boolean {
  return pubFnRegExp(fnName).test(source);
}

/**
 * Returns the body of `pub fn <fnName>(...) { body }` without the braces, dedented and trimmed, or null
 * when the function is missing or its braces do not balance. String literals and `//` comments are skipped.
 */
export function extractPubFnBody(source: string, fnName: string): string | null {
  const m = pubFnRegExp(fnName).exec(source);
  if (!m) return null;
  let i = m.index + m[0].length; // just after the opening "(" of the parameter list
  let parens = 1;
  let braces = 0;
  let bodyStart = -1;
  while (i < source.length) {
    const c = source[i];
    if (c === '"') {
      i = skipString(source, i);
      continue;
    }
    if (c === "/" && source[i + 1] === "/") {
      const nl = source.indexOf("\n", i);
      i = nl < 0 ? source.length : nl;
      continue;
    }
    if (bodyStart < 0) {
      if (c === "(") parens++;
      else if (c === ")") parens--;
      else if (c === "{" && parens === 0) {
        bodyStart = i + 1;
        braces = 1;
      }
    } else if (c === "{") braces++;
    else if (c === "}") {
      braces--;
      if (braces === 0) return dedent(source.slice(bodyStart, i));
    }
    i++;
  }
  return null;
}

function skipString(source: string, start: number): number {
  let i = start + 1;
  while (i < source.length) {
    const c = source[i];
    if (c === "\\") i += 2;
    else if (c === '"') return i + 1;
    else i++;
  }
  return i;
}

function dedent(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  while (lines.length > 0 && (lines[0] ?? "").trim() === "") lines.shift();
  while (lines.length > 0 && (lines[lines.length - 1] ?? "").trim() === "") lines.pop();
  let min = Infinity;
  for (const l of lines) {
    if (l.trim() === "") continue;
    min = Math.min(min, l.length - l.trimStart().length);
  }
  if (!Number.isFinite(min)) return "";
  return lines.map((l) => (l.trim() === "" ? "" : l.slice(min).trimEnd())).join("\n");
}
