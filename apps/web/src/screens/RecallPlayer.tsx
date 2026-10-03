import { useEffect, useRef, useState } from "react";
import type { ApiClient, RecallAnswerResult, RecallResponse } from "@fp/api-contract";
import { errorMessage } from "../api/client.ts";
import type { RecallItem } from "../api/types.ts";
import { CodeEditor } from "../editor/CodeEditor.tsx";
import { highlightGleam } from "../editor/gleam.ts";
import { useI18n } from "../i18n/I18n.tsx";
import { sessionRoute } from "../recall.ts";
import type { RecallRoute } from "../recall.ts";
import { CodeBlock } from "../ui/CodeBlock.tsx";
import { Icon } from "../ui/Icon.tsx";
import { Markdown, renderInline } from "../ui/Markdown.tsx";
import { PageTitle } from "../ui/PageTitle.tsx";
import { Alert } from "../ui/Status.tsx";
import { Choice } from "./Lesson.tsx";

type SessionRoute = Extract<RecallRoute, { screen: "session" }>;
type Props = Readonly<{ api: ApiClient; now: () => number; route: SessionRoute; onRoute: (r: RecallRoute) => void }>;

const Hl = ({ code }: { readonly code: string }) => (
  <>
    {highlightGleam(code).map((s, i) => (s.cls ? <span key={i} className={s.cls}>{s.text}</span> : s.text))}
  </>
);

/** The learner's body inside the header; a server reference that already has the header is shown as it is. */
const wrapBody = (header: string, body: string) => (body.includes(header) ? body : `${header} {\n${body.replace(/^/gm, "  ")}\n}`);

/** One recall item at a time: new cards show an intro first; answers are judged by the server only. */
export function RecallPlayer({ api, now, route, onRoute }: Props) {
  const tr = useI18n();
  const { t } = tr;
  const { session, index, intro, draft, result } = route;
  const item = session.items[index]!;
  const last = index === session.items.length - 1;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState(false);
  // elapsedMs counts from the question being shown (not the intro) to submit.
  const shownAt = useRef(now());
  const nextRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!intro) shownAt.current = now();
    setHint(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.itemId, intro]);
  useEffect(() => {
    if (result) nextRef.current?.focus();
  }, [result]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e, tr));
    } finally {
      setBusy(false);
    }
  };
  const answer = (response: RecallResponse, text = draft) => {
    if (busy || result) return;
    void run(async () => {
      const r = await api.recallAnswer(session.sessionId, { itemId: item.itemId, response, elapsedMs: Math.max(0, now() - shownAt.current) });
      onRoute({ ...route, draft: text, result: r });
    });
  };
  const finish = () => void run(async () => onRoute({ screen: "summary", summary: await api.finishRecall(session.sessionId) }));
  const next = () => (last ? finish() : onRoute(sessionRoute(session, index + 1)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target instanceof HTMLElement ? e.target : null;
      if (!el || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable || e.altKey || e.ctrlKey || e.metaKey) return;
      if (result && e.key === "Enter" && el.tagName !== "BUTTON") {
        e.preventDefault();
        next();
      } else if (!result && !intro && item.form === "recognize") {
        // 1-4 or the A-D shown on the choices.
        const i = /^[1-9]$/.test(e.key) ? Number(e.key) - 1 : "abcdefgh".indexOf(e.key.toLowerCase());
        if (e.key.length === 1 && i >= 0 && i < item.card.recognize.choices.length) answer({ kind: "choice", choice: i }, String(i));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const { card } = item;
  return (
    <div className="page recall lesson">
      <div className="quiz-bar recall-bar">
        <p className="strong">{t("quiz.position", { n: index + 1, total: session.items.length })}</p>
        <span className={`chip chip-small${item.kind === "new" ? " chip-accent" : ""}`}>{t(`recallKind.${item.kind}`)}</span>
        <div className="meter recall-progress" aria-hidden="true">
          <span style={{ width: `${((index + (result ? 1 : 0)) / session.items.length) * 100}%` }} />
        </div>
        <button type="button" className="btn btn-ghost btn-small" onClick={finish} disabled={busy}>
          {t("recall.stop")}
        </button>
      </div>
      <div>
        <p className="eyebrow mono">{card.topic}</p>
        <PageTitle key={`${item.itemId}-${intro}`}>{card.title}</PageTitle>
      </div>
      {intro ? (
        <section className="panel exercise" aria-label={t("recallKind.new")}>
          <p className="lesson-prose">{renderInline(card.summary)}</p>
          {card.signature && (
            <p>
              <span className="field-label">{t("recall.signature")}</span> <code className="mono small">{card.signature}</code>
            </p>
          )}
          {card.definitions && <CodeBlock code={card.definitions} label={t("recall.definitions")} />}
          <CodeBlock code={card.example} label={t("recall.example")} />
          <p>
            <button type="button" className="btn btn-primary" onClick={() => onRoute({ ...route, intro: false })}>
              {t("recall.solve")} <Icon name="arrowRight" />
            </button>
          </p>
        </section>
      ) : (
        <section className="panel exercise" aria-labelledby="recall-prompt">
          <p className="exercise-top">
            <span className="chip chip-small">{t(`stage.${item.form}`)}</span>
          </p>
          <h2 id="recall-prompt" className="exercise-prompt">
            {renderInline(item.form === "predict" ? (card.predict?.prompt ?? "") : card[item.form].prompt)}
          </h2>
          <Question item={item} draft={draft} result={result} busy={busy} hint={hint} onHint={() => setHint(true)} onDraft={(d) => onRoute({ ...route, draft: d })} onAnswer={answer} />
          <div role="status">{result && <ResultView item={item} r={result} now={now} />}</div>
          <Alert message={error} />
          {result && (
            <p className="exercise-actions">
              <button ref={nextRef} type="button" className="btn btn-primary" onClick={next} disabled={busy}>
                {t(last ? "recall.finish" : "recall.next")} <Icon name="arrowRight" />
              </button>
              <span className="small muted">{t("recall.enterNote")}</span>
            </p>
          )}
        </section>
      )}
      {intro && <Alert message={error} />}
    </div>
  );
}

type QuestionProps = Readonly<{
  item: RecallItem;
  draft: string;
  result: RecallAnswerResult | null;
  busy: boolean;
  hint: boolean;
  onHint: () => void;
  onDraft: (d: string) => void;
  onAnswer: (r: RecallResponse, text?: string) => void;
}>;

function Question({ item, draft, result, busy, hint, onHint, onDraft, onAnswer }: QuestionProps) {
  const { t } = useI18n();
  const { card } = item;
  const done = !!result;
  const check = (
    <button type="submit" className="btn btn-primary" disabled={busy || !draft.trim()}>
      {t(busy ? "recall.checking" : "recall.check")}
    </button>
  );
  const submit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (draft.trim()) onAnswer(item.form === "produce" ? { kind: "code", body: draft } : { kind: "text", text: draft });
  };

  if (item.form === "recognize")
    return (
      <>
        <ul className="choices plain-list">
          {card.recognize.choices.map((c, i) => (
            <li key={i}>
              <Choice i={i} text={c} mark={!done ? null : draft === String(i) ? (result.correct ? "correct" : "wrong") : !result.correct && result.expected === c ? "correct" : null} disabled={done || busy} onClick={() => onAnswer({ kind: "choice", choice: i }, String(i))} />
            </li>
          ))}
        </ul>
        {!done && <p className="small muted">{t("recall.keys")}</p>}
      </>
    );

  if (item.form === "cloze") {
    const [before = "", after = ""] = card.cloze.code.split("____");
    return (
      <form onSubmit={submit} className="recall-form">
        <pre className="code-block">
          <code>
            <Hl code={before} />
            <input className="cloze-input" aria-label={t("recall.blank")} value={draft} size={Math.max(4, draft.length + 1)} readOnly={done} onChange={(e) => onDraft(e.target.value)} autoFocus autoComplete="off" spellCheck={false} />
            <Hl code={after} />
          </code>
        </pre>
        {!done && check}
      </form>
    );
  }

  if (item.form === "predict")
    return (
      <form onSubmit={submit} className="recall-form">
        <CodeBlock code={card.predict?.code ?? ""} label={t("lesson.code")} />
        <label className="field-label" htmlFor="recall-value">
          {t("recall.value")}
        </label>
        <input id="recall-value" className="input mono" value={draft} readOnly={done} onChange={(e) => onDraft(e.target.value)} autoFocus autoComplete="off" spellCheck={false} />
        <p className="small muted">{t("recall.valueNote")}</p>
        {!done && check}
      </form>
    );

  const { header, hint: hintText } = card.produce;
  const name = /fn\s+(\w+)/.exec(header)?.[1] ?? header;
  const imports = card.imports.map((i) => `import ${i}\n`).join("");
  return (
    <form
      onSubmit={submit}
      className="recall-form"
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !done) submit(e);
      }}
    >
      {card.definitions && <CodeBlock code={card.definitions} label={t("recall.definitions")} />}
      <div className="recall-produce">
        <CodeBlock code={`${imports ? `${imports}\n` : ""}${header} {`} />
        {done ? (
          <CodeBlock code={draft.replace(/^/gm, "  ")} />
        ) : (
          <div className="recall-editor">
            <CodeEditor value={draft} onChange={onDraft} label={t("recall.editor", { name })} describedBy="recall-body-note" />
          </div>
        )}
        <CodeBlock code="}" />
      </div>
      {!done && (
        <p id="recall-body-note" className="small muted">
          {t("recall.bodyNote")}
        </p>
      )}
      {hintText &&
        (hint ? (
          <p className="hint">
            <Icon name="bulb" size={16} /> {renderInline(hintText)}
          </p>
        ) : (
          !done && (
            <button type="button" className="btn btn-quiet btn-small" onClick={onHint}>
              <Icon name="bulb" size={16} /> {t("recall.hint")}
            </button>
          )
        ))}
      {!done && check}
    </form>
  );
}

function ResultView({ item, r, now }: Readonly<{ item: RecallItem; r: RecallAnswerResult; now: () => number }>) {
  const tr = useI18n();
  const { t } = tr;
  return (
    <div className={`exercise-feedback is-${r.correct ? "correct" : "wrong"}`}>
      <p className="exercise-feedback-title">
        <Icon name={r.correct ? "checkCircle" : "xCircle"} /> {t(r.correct ? "lesson.correct" : "lesson.wrong")}
      </p>
      {r.feedback && <Markdown source={r.feedback} />}
      {(r.expected !== undefined || r.actual !== undefined) && (
        <dl className="expected-actual">
          {r.expected !== undefined && (
            <>
              <dt>{t("test.expected")}</dt>
              <dd className="mono">{r.expected}</dd>
            </>
          )}
          {r.actual !== undefined && (
            <>
              <dt>{t("test.actual")}</dt>
              <dd className="mono">{r.actual}</dd>
            </>
          )}
        </dl>
      )}
      {!!r.diagnostics?.length && (
        <>
          <p className="strong small">{t("recall.diagnostics")}</p>
          <ul className="small">
            {r.diagnostics.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </>
      )}
      {!!r.missing?.length && <p className="small">{t("recall.missing", { tokens: tr.list(r.missing) })}</p>}
      {r.reference && (
        <>
          <p className="strong small">{t("recall.reference")}</p>
          <CodeBlock code={wrapBody(item.card.produce.header, r.reference)} label={t("recall.reference")} />
        </>
      )}
      <p className="small muted">{t("recall.after", { stage: t(`stage.${r.stage}`), when: tr.relativeDay(r.nextDueAt, now()) })}</p>
    </div>
  );
}
