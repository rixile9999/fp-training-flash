import { useEffect, useRef } from "react";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, indentOnInput, syntaxHighlighting } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { EditorView, drawSelection, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers } from "@codemirror/view";
import { gleamHighlighter, gleamLanguage } from "./gleam.ts";

export interface CodeEditorProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  /** Accessible name of the editing surface. */
  readonly label: string;
  readonly describedBy?: string;
}

const theme = EditorView.theme(
  {
    "&": { height: "100%", backgroundColor: "var(--editor-bg)", color: "var(--editor-ink)", fontSize: "14px" },
    ".cm-scroller": { fontFamily: "var(--font-mono)", lineHeight: "1.6" },
    ".cm-content": { padding: "12px 0", caretColor: "var(--gleam-pink)" },
    ".cm-cursor": { borderLeftColor: "var(--gleam-pink)", borderLeftWidth: "2px" },
    ".cm-gutters": { backgroundColor: "var(--editor-bg)", color: "#6f7086", border: "none" },
    ".cm-activeLine": { backgroundColor: "rgba(255,175,243,0.06)" },
    ".cm-activeLineGutter": { backgroundColor: "rgba(255,175,243,0.08)", color: "#c9c9d6" },
    "&.cm-focused": { outline: "none" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": { backgroundColor: "rgba(255,175,243,0.25) !important" },
    ".cm-matchingBracket": { backgroundColor: "rgba(166,240,252,0.18)", outline: "1px solid rgba(166,240,252,0.4)" },
  },
  { dark: true },
);

/** CodeMirror 6 editor with Gleam highlighting. Uncontrolled internally; `value` changes from outside replace the doc. */
export function CodeEditor({ value, onChange, label, describedBy }: CodeEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const attrs: Record<string, string> = { "aria-label": label, "aria-multiline": "true" };
    if (describedBy) attrs["aria-describedby"] = describedBy;
    const v = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          history(),
          drawSelection(),
          indentOnInput(),
          bracketMatching(),
          EditorState.tabSize.of(2),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          gleamLanguage,
          syntaxHighlighting(gleamHighlighter),
          theme,
          EditorView.contentAttributes.of(attrs),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) onChangeRef.current(u.state.doc.toString());
          }),
        ],
      }),
    });
    view.current = v;
    return () => {
      v.destroy();
      view.current = null;
    };
    // The editor is created once; later `value` changes are synced by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== value) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
  }, [value]);

  return <div ref={host} className="code-editor" />;
}
