import type { ExerciseDetail, TrialRun } from "@fp/api-contract";
import { CodeEditor } from "../editor/CodeEditor.tsx";
import { Icon } from "../ui/Icon.tsx";
import { StatusBadge } from "../ui/Status.tsx";
import { OUTCOME_LABEL } from "../ui/labels.ts";

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
  const ex = props.exercise;
  const predict = ex.kind === "predict";
  const busy = props.running || props.submitting;
  return (
    <div className="panel editor-panel">
      <div className="editor-bar">
        <span className="file-name mono">
          <Icon name="code" size={16} /> {predict ? "답안" : `src/${ex.moduleName}.gleam`}
        </span>
        {props.attempt > 0 && <span className="chip chip-small">{props.attempt + 1}번째 제출 준비</span>}
      </div>
      {predict ? (
        <div className="predict-answer">
          <label htmlFor="predict-input" className="field-label">
            main()이 돌려주는 값
          </label>
          <input
            id="predict-input"
            className="input mono"
            value={props.code}
            placeholder="예: [1, 2, 3]"
            onChange={(e) => props.onCodeChange(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="muted small">결과 예측 문제는 실행 없이 제출로 바로 채점합니다.</p>
        </div>
      ) : (
        <div className="editor-host">
          <CodeEditor value={props.code} onChange={props.onCodeChange} label={`${ex.title} 코드 편집기`} describedBy="editor-kbd-note" />
        </div>
      )}
      <div className="editor-actions">
        {!predict && (
          <button type="button" className="btn btn-secondary" onClick={props.onRun} disabled={busy}>
            <Icon name="play" /> {props.running ? "실행 중..." : "실행"}
          </button>
        )}
        <button type="button" className="btn btn-primary" onClick={props.onSubmit} disabled={busy || (predict && !props.code.trim())}>
          <Icon name="send" /> {props.submitting ? "채점 중..." : "제출하고 피드백 받기"}
        </button>
        {!predict && <span id="editor-kbd-note" className="muted small kbd-note">편집기에서 Esc 다음 Tab으로 빠져나옵니다</span>}
      </div>
      <section className="console" aria-live="polite" aria-labelledby="console-h">
        <h2 id="console-h" className="console-title">
          실행 결과 <span className="muted">(공개 테스트)</span>
        </h2>
        {props.error && (
          <p className="inline-error" role="alert">
            {props.error}
          </p>
        )}
        {!props.trial && !props.error && <p className="console-empty">실행을 누르면 공개 테스트 결과가 여기에 표시됩니다.</p>}
        {props.trial && <TrialResult trial={props.trial} />}
      </section>
    </div>
  );
}

function TrialResult({ trial }: { readonly trial: TrialRun }) {
  const passed = trial.tests.filter((t) => t.status === "passed").length;
  return (
    <div className="trial">
      <p className="trial-summary">
        <StatusBadge ok={trial.outcome === "passed"} okLabel={OUTCOME_LABEL.passed} failLabel={OUTCOME_LABEL[trial.outcome]} />
        <span className="mono muted">
          {passed}/{trial.tests.length} 통과
        </span>
      </p>
      {trial.rejectionReasons?.map((r) => (
        <p key={r} className="console-line fail-text">
          {r}
        </p>
      ))}
      {trial.compileDiagnostics.map((d, i) => (
        <pre key={i} className="console-pre">
          {d.line ? `${d.line}행: ` : ""}
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
