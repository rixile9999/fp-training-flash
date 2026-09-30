export interface FrontMatterDoc {
  readonly frontMatter: string;
  readonly body: string;
}

/** Splits `---\n<yaml>\n---\n<body>`. Returns null when the text does not start with front matter. */
export function splitFrontMatter(text: string): FrontMatterDoc | null {
  const normalized = text.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) return null;
  const end = normalized.indexOf("\n---", 3);
  if (end < 0) return null;
  const rest = normalized.slice(end + 4);
  if (rest !== "" && !rest.startsWith("\n")) return null;
  return { frontMatter: normalized.slice(4, end + 1), body: `${rest.replace(/^\n+/, "").trimEnd()}\n` };
}
