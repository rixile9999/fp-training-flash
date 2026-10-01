import { useState } from "react";
import type { ApiClient, ExerciseView, Hint, Skill } from "@fp/api-contract";
import type { SessionItem } from "../api/types.ts";
import { errorMessage } from "../api/client.ts";
import { useI18n } from "../i18n/I18n.tsx";
import { CodeBlock } from "../ui/CodeBlock.tsx";
import { Disclosure } from "../ui/Disclosure.tsx";
import { Icon } from "../ui/Icon.tsx";
import { Markdown } from "../ui/Markdown.tsx";
import { hintKindLabel, kindLabel, skillName } from "../ui/labels.ts";

export function ProblemPanel(props: {
  readonly api: ApiClient;
  readonly view: ExerciseView;
  readonly item?: SessionItem | undefined;
  readonly skills: readonly Skill[];
}) {
  const { api, view, item, skills } = props;
  const tr = useI18n();
  const { t } = tr;
  const ex = view.exercise;
  const noteOpened = (kind: "concept" | "theory", ids: readonly string[]) => {
    for (const noteId of ids) void api.noteOpened(ex.id, { kind, noteId }).catch(() => undefined);
  };
  return (
    <div className="panel problem-panel">
      <ul className="chips" aria-label={t("problem.info")}>
        <li className="chip chip-accent">{kindLabel(tr, ex.kind)}</li>
        <li className="chip">{skillName(skills, ex.primarySkill)}</li>
        <li className="chip">
          {t("problem.difficulty")} <span className="mono">{ex.difficulty}</span>
        </li>
        {item && (
          <li className="chip">
            {t("problem.expectedSuccess")} <span className="mono">{tr.percent(item.expectedSuccess)}</span>
          </li>
        )}
      </ul>
      <h1 className="problem-title">{ex.title}</h1>
      <Markdown source={ex.promptMarkdown} className="prompt" />
      {ex.predict && <CodeBlock code={ex.predict.code} label={t("problem.predictCode")} />}

      {ex.publicTests.length > 0 && (
        <section className="public-tests" aria-labelledby="public-tests-h">
          <h2 id="public-tests-h" className="section-label">
            {t("problem.publicTests")} <span className="count">{ex.publicTests.length}</span>
          </h2>
          {ex.publicTests.map((test) => (
            <div key={test.id} className="public-test">
              <p className="public-test-name">{test.name}</p>
              <CodeBlock code={test.code} label={t("problem.testCode", { name: test.name })} />
            </div>
          ))}
        </section>
      )}

      {view.conceptNotes.length > 0 && (
        <Disclosure
          title={t("problem.conceptNotes")}
          icon="code"
          meta={t("problem.noteCount", { n: view.conceptNotes.length })}
          onFirstOpen={() => noteOpened("concept", view.conceptNotes.map((n) => n.id))}
        >
          {view.conceptNotes.map((n) => (
            <article key={n.id} className="note">
              <h4>{n.title}</h4>
              <Markdown source={n.markdown} />
            </article>
          ))}
        </Disclosure>
      )}
      {view.theoryTopics.length > 0 && (
        <Disclosure
          title={t("problem.theoryNotes")}
          icon="book"
          meta={t("problem.noteCount", { n: view.theoryTopics.length })}
          onFirstOpen={() => noteOpened("theory", view.theoryTopics.map((n) => n.id))}
        >
          {view.theoryTopics.map((n) => (
            <article key={n.id} className="note">
              <h4>
                {n.title} <span className="chip chip-small">{n.level === "basic" ? t("problem.basic") : t("problem.advanced")}</span>
              </h4>
              <Markdown source={n.markdown} />
              {n.furtherReading.length > 0 && (
                <p className="further">
                  {t("problem.furtherReading", { items: n.furtherReading.map((c) => c.text + (c.verified ? "" : t("problem.unverified"))).join(" · ") })}
                </p>
              )}
            </article>
          ))}
        </Disclosure>
      )}

      {ex.hints.length > 0 && <HintPanel key={ex.id} api={api} exerciseId={ex.id} total={ex.hints.length} initial={view.revealedHints} />}
    </div>
  );
}

export function HintPanel(props: { readonly api: ApiClient; readonly exerciseId: string; readonly total: number; readonly initial: readonly Hint[] }) {
  const tr = useI18n();
  const { t } = tr;
  const [hints, setHints] = useState<readonly Hint[]>(() => [...props.initial].sort((a, b) => a.level - b.level));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const used = hints.length;
  const next = used + 1;
  const reveal = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await props.api.revealHint(props.exerciseId, { level: next });
      setHints([...res].sort((a, b) => a.level - b.level));
    } catch (e) {
      setError(errorMessage(e, tr));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="hints" aria-labelledby="hints-h">
      <div className="hints-head">
        <h2 id="hints-h" className="section-label">
          <Icon name="bulb" /> {t("hint.title")}
        </h2>
        <span className="hint-dots" role="img" aria-label={t("hint.progress", { total: props.total, used })}>
          {[1, 2, 3, 4, 5].map((l) => (
            <span key={l} className={`hint-dot${l <= used ? " is-used" : ""}${l > props.total ? " is-absent" : ""}`} />
          ))}
        </span>
      </div>
      <p className="hint-note">{t("hint.note")}</p>
      {hints.length > 0 && (
        <ol className="hint-list" aria-label={t("hint.revealed")}>
          {hints.map((h) => (
            <li key={h.level} className="hint">
              <p className="hint-level">
                {t("hint.level", { level: h.level, kind: hintKindLabel(tr, h.kind) })}
              </p>
              <Markdown source={h.markdown} />
            </li>
          ))}
        </ol>
      )}
      {next <= props.total ? (
        <>
          {next === 3 && <p className="hint-warn">{t("hint.warn")}</p>}
          <button type="button" className="btn btn-secondary btn-block" onClick={reveal} disabled={busy}>
            <Icon name="bulb" /> {t("hint.reveal", { level: next })}
          </button>
        </>
      ) : (
        <p className="muted small">{t("hint.allShown")}</p>
      )}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
