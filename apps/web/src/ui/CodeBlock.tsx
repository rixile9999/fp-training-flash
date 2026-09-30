import { highlightGleam } from "../editor/gleam.ts";

/** Read-only, statically highlighted Gleam code on the dark editor ground (same classes as the editor). */
export function CodeBlock({ code, label }: { readonly code: string; readonly label?: string }) {
  const spans = highlightGleam(code.replace(/\n$/, ""));
  return (
    <pre className="code-block" aria-label={label} tabIndex={0}>
      <code>{spans.map((s, i) => (s.cls ? <span key={i} className={s.cls}>{s.text}</span> : s.text))}</code>
    </pre>
  );
}
