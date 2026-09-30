/**
 * A small Gleam highlighter built on StreamLanguage (no lezer grammar). The same tokenizer drives
 * the CodeMirror editor and static code blocks (`highlightGleam`), styled by `tok-*` CSS classes.
 */
import { StreamLanguage } from "@codemirror/language";
import type { StreamParser } from "@codemirror/language";
import { highlightTree, tagHighlighter, tags as t } from "@lezer/highlight";

const KEYWORDS = new Set([
  "as", "assert", "case", "const", "echo", "fn", "if", "import", "let", "opaque", "panic", "pub", "todo", "type", "use",
]);

interface GleamState {
  inString: boolean;
}

function readString(stream: Parameters<StreamParser<GleamState>["token"]>[0], state: GleamState): string {
  let escaped = false;
  let ch: string | void;
  while ((ch = stream.next()) !== undefined) {
    if (ch === '"' && !escaped) {
      state.inString = false;
      return "string";
    }
    escaped = !escaped && ch === "\\";
  }
  state.inString = true;
  return "string";
}

const parser: StreamParser<GleamState> = {
  name: "gleam",
  startState: () => ({ inString: false }),
  copyState: (s) => ({ ...s }),
  token(stream, state) {
    if (state.inString) return readString(stream, state);
    if (stream.eatSpace()) return null;
    if (stream.match("//")) {
      stream.skipToEnd();
      return "comment";
    }
    if (stream.eat('"')) return readString(stream, state);
    if (stream.match(/^@[a-z_]+/)) return "meta";
    if (stream.match(/^(0x[0-9a-fA-F_]+|\d[\d_]*(\.\d[\d_]*)?)/)) return "number";
    if (stream.match(/^[A-Z][A-Za-z0-9_]*/)) return "typeName";
    if (stream.match(/^[a-z_][a-z0-9_]*/)) {
      const word = stream.current();
      if (KEYWORDS.has(word)) return "keyword";
      if (stream.peek() === "(") return "variableName.function";
      return "variableName";
    }
    if (stream.match(/^(\|>|->|<-|\.\.|<>|==|!=|<=\.?|>=\.?|&&|\|\||[+\-*/%]\.?|[<>=!|])/)) return "operator";
    stream.next();
    return "punctuation";
  },
  languageData: { commentTokens: { line: "//" } },
};

export const gleamLanguage = StreamLanguage.define(parser);

/** Maps highlight tags to CSS classes defined in ui/styles.css (shared by editor and static blocks). */
export const gleamHighlighter = tagHighlighter([
  { tag: t.keyword, class: "tok-kw" },
  { tag: t.string, class: "tok-str" },
  { tag: t.comment, class: "tok-com" },
  { tag: t.number, class: "tok-num" },
  { tag: t.typeName, class: "tok-type" },
  { tag: t.function(t.variableName), class: "tok-fn" },
  { tag: t.operator, class: "tok-op" },
  { tag: t.meta, class: "tok-meta" },
]);

export interface Span {
  readonly text: string;
  readonly cls: string;
}

/** Splits code into highlighted spans (unstyled gaps get cls ""). */
export function highlightGleam(code: string): Span[] {
  const tree = gleamLanguage.parser.parse(code);
  const spans: Span[] = [];
  let pos = 0;
  highlightTree(tree, gleamHighlighter, (from, to, cls) => {
    if (from > pos) spans.push({ text: code.slice(pos, from), cls: "" });
    spans.push({ text: code.slice(from, to), cls });
    pos = to;
  });
  if (pos < code.length) spans.push({ text: code.slice(pos), cls: "" });
  return spans;
}
