import type { ExerciseDetail, TrialRun } from "@fp/api-contract";
import { CodeEditor } from "../editor/CodeEditor.tsx";
import { useI18n } from "../i18n/I18n.tsx";
import { Icon } from "../ui/Icon.tsx";
import { StatusBadge } from "../ui/Status.tsx";
import { outcomeLabel } from "../ui/labels.ts";

export function starterCode(ex: ExerciseDetail): string {
  const file = ex.starterFiles.find((f) => f.path === `src/${ex.moduleName}.gleam`) ?? ex.starterFiles[0];
  return file?.content ?? "";
}

export function EditorPanel(props: {
  readonly exercise: ExerciseDetail;
  readonly code: string;
  readonly onCodeChange: (code: string) => void;
  readonly onRun: () => void;
  readonly onSubmit: () => void;
  readonly running: boolean;
  readonly submitting: boolean;
  readonly trial: TrialRun | null;
  readonly error: string | null;
  readonly attempt: number;
}) {
  const { t } = useI18n();
  const ex = props.exercise;
  const predict = ex.kind === "predict";
  const busy = props.running || props.submitting;
  return (
    <div className="panel editor-panel">
      <div className="editor-bar">
        <span className="file-name mono">
          <Icon name="code" size={16} /> {predict ? t("editor.answer") : `src/${ex.moduleName}.gleam`}
        </span>
        {props.attempt > 0 && <span className="chip chip-small">{t("editor.attemptReady", { n: props.attempt + 1 })}</span>}
      </div>
      {predict ? (
        <div className="predict-answer">
          <label htmlFor="predict-input" className="field-label">
            {t("editor.predictLabel")}
          </label>
          <input
            id="predict-input"
            className="input mono"
            value={props.code}
            placeholder={t("editor.predictPlaceholder")}
            onChange={(e) => props.onCodeChange(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="muted small">{t("editor.predictNote")}</p>
        </div>
      ) : (
        <div className="editor-host">
          <CodeEditor value={props.code} onChange={props.onCodeChange} label={t("editor.label", { title: ex.title })} describedBy="editor-kbd-note" />
        </div>
      )}
      <div className="editor-actions">
        {!predict && (
          <button type="button" className="btn btn-secondary" onClick={props.onRun} disabled={busy}>
            <Icon name="play" /> {props.running ? t("editor.running") : t("editor.run")}
          </button>
        )}
        <button type="button" className="btn btn-primary" onClick={props.onSubmit} disabled={busy || (predict && !props.code.trim())}>
          <Icon name="send" /> {props.submitting ? t("editor.submitting") : t("editor.submit")}
        </button>
        {!predict && <span id="editor-kbd-note" className="muted small kbd-note">{t("editor.kbdNote")}</span>}
      </div>
      <section className="console" aria-live="polite" aria-labelledby="console-h">
        <h2 id="console-h" className="console-title">
          {t("editor.console")} <span className="muted">{t("editor.consolePublic")}</span>
        </h2>
        {props.error && (
          <p className="inline-error" role="alert">
            {props.error}
          </p>
        )}
        {!props.trial && !props.error && <p className="console-empty">{t("editor.consoleEmpty")}</p>}
        {props.trial && <TrialResult trial={props.trial} />}
      </section>
    </div>
  );
}

function TrialResult({ trial }: { readonly trial: TrialRun }) {
  const tr = useI18n();
  const { t } = tr;
  const passed = trial.tests.filter((t) => t.status === "passed").length;
  return (
    <div className="trial">
      <p className="trial-summary">
        <StatusBadge ok={trial.outcome === "passed"} okLabel={outcomeLabel(tr, "passed")} failLabel={outcomeLabel(tr, trial.outcome)} />
        <span className="mono muted">
          {t("editor.passedCount", { passed, total: trial.tests.length })}
        </span>
      </p>
      {trial.rejectionReasons?.map((r) => (
        <p key={r} className="console-line fail-text">
          {r}
        </p>
      ))}
      {trial.compileDiagnostics.map((d, i) => (
        <pre key={i} className="console-pre">
          {d.line ? t("editor.line", { line: d.line }) : ""}
          {d.message}
        </pre>
      ))}
      <ul className="trial-tests">
        {trial.tests.map((t) => (
          <li key={t.id}>
            <StatusBadge ok={t.status === "passed"} />
            <span>{t.name}</span>
            {t.message && <pre className="console-pre">{t.message}</pre>}
          </li>
        ))}
      </ul>
    </div>
  );
}
