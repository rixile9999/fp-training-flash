/**
 * Tiny, safe Markdown subset renderer (no HTML injection): paragraphs, "-"/"1." lists, fenced code,
 * inline `code`, **bold**. Content comes from authored exercises and coach output.
 */
import type { ReactNode } from "react";
import { CodeBlock } from "./CodeBlock.tsx";

type Block =
  | { readonly kind: "p"; readonly text: string }
  | { readonly kind: "ul" | "ol"; readonly items: readonly string[] }
  | { readonly kind: "code"; readonly code: string };

export function parseBlocks(md: string): Block[] {
  const blocks: Block[] = [];
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (line.trimStart().startsWith("```")) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.trimStart().startsWith("```")) body.push(lines[i++]!);
      i++;
      blocks.push({ kind: "code", code: body.join("\n") });
      continue;
    }
    if (!line.trim()) {
      i++;
      continue;
    }
    const listKind = /^\s*[-*]\s+/.test(line) ? "ul" : /^\s*\d+\.\s+/.test(line) ? "ol" : null;
    if (listKind) {
      const re = listKind === "ul" ? /^\s*[-*]\s+/ : /^\s*\d+\.\s+/;
      const items: string[] = [];
      while (i < lines.length && re.test(lines[i]!)) items.push(lines[i++]!.replace(re, ""));
      blocks.push({ kind: listKind, items });
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i]!.trim() && !lines[i]!.trimStart().startsWith("```") && !/^\s*([-*]|\d+\.)\s+/.test(lines[i]!)) {
      para.push(lines[i++]!.trim());
    }
    blocks.push({ kind: "p", text: para.join(" ") });
  }
  return blocks;
}

export function renderInline(text: string, keyPrefix = ""): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|`([^`]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${keyPrefix}${k++}`;
    if (m[1] !== undefined) out.push(<strong key={key}>{renderInline(m[1], `${key}.`)}</strong>);
    else out.push(<code key={key}>{m[2]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source, className }: { readonly source: string; readonly className?: string }) {
  return (
    <div className={className ? `md ${className}` : "md"}>
      {parseBlocks(source).map((b, i) => {
        if (b.kind === "code") return <CodeBlock key={i} code={b.code} />;
        if (b.kind === "p") return <p key={i}>{renderInline(b.text)}</p>;
        const items = b.items.map((it, j) => <li key={j}>{renderInline(it)}</li>);
        return b.kind === "ul" ? <ul key={i}>{items}</ul> : <ol key={i}>{items}</ol>;
      })}
    </div>
  );
}
