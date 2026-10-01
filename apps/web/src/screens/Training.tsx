import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiClient, ExerciseView, Session, SessionSummary, Skill, SubmissionView, TrialRun } from "@fp/api-contract";
import { errorMessage, newIdempotencyKey } from "../api/client.ts";
import { useI18n } from "../i18n/I18n.tsx";
import type { Phase } from "../session.ts";
import { Icon } from "../ui/Icon.tsx";
import { itemKindLabel, skillName } from "../ui/labels.ts";
import { CoachPanel } from "./CoachPanel.tsx";
import { EditorPanel, starterCode } from "./EditorPanel.tsx";
import { FeedbackView } from "./FeedbackView.tsx";
import { ProblemPanel } from "./ProblemPanel.tsx";

type SessionItem = Session["items"][number];
type Async<T> = { readonly status: "loading" } | { readonly status: "ready"; readonly data: T } | { readonly status: "error"; readonly message: string };

export interface TrainingProps {
  readonly api: ApiClient;
  readonly skills: readonly Skill[];
  /** undefined while loading, null when there is no active session. */
  readonly session: Session | null | undefined;
  readonly activeIndex: number | null;
  /** Changes when the learner switched language: server-rendered content is fetched again. */
  readonly contentKey?: number;
  readonly phase: Phase;
  readonly summary: SessionSummary | null;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onPhase: (p: Phase) => void;
  readonly onSession: (s: Session) => void;
  readonly onActiveIndex: (i: number | null) => void;
  readonly onStart: () => void;
  readonly onSkip: () => void;
  readonly onComplete: () => void;
  readonly onShowProgress: () => void;
}

export function Training(props: TrainingProps) {
  const { t } = useI18n();
  const { session, summary } = props;
  if (summary) return <SummaryView summary={summary} skills={props.skills} onStart={props.onStart} onShowProgress={props.onShowProgress} busy={props.busy} />;
  if (session === undefined) return <p className="page-status" role="status">{t("training.loadingSession")}</p>;
  if (session === null) return <StartCard onStart={props.onStart} busy={props.busy} error={props.error} />;
  const item = props.activeIndex === null ? undefined : session.items[props.activeIndex];
  if (!item) {
    return (
      <div className="center-card panel">
        <h1 className="problem-title">{t("training.allDoneTitle")}</h1>
        <p className="muted">{t("training.allDoneBody")}</p>
        <button type="button" className="btn btn-primary" onClick={props.onComplete} disabled={props.busy}>
          <Icon name="flag" /> {t("training.finish")}
        </button>
      </div>
    );
  }
  return <Workspace key={`${session.id}:${item.index}`} {...props} session={session} item={item} />;
}

function StartCard({ onStart, busy, error }: { readonly onStart: () => void; readonly busy: boolean; readonly error: string | null }) {
  const { t } = useI18n();
  return (
    <div className="center-card panel">
      <p className="eyebrow">{t("start.eyebrow")}</p>
      <h1 className="problem-title">{t("start.title")}</h1>
      <p className="muted">{t("start.body")}</p>
      <button type="button" className="btn btn-primary" onClick={onStart} disabled={busy}>
        <Icon name="play" /> {busy ? t("start.preparing") : t("start.button")}
      </button>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function SummaryView(props: { readonly summary: SessionSummary; readonly skills: readonly Skill[]; readonly onStart: () => void; readonly onShowProgress: () => void; readonly busy: boolean }) {
  const tr = useI18n();
  const { t } = tr;
  const s = props.summary;
  return (
    <div className="center-card panel summary">
      <p className="eyebrow">{t("summary.eyebrow")}</p>
      <h1 className="problem-title">{t("summary.title")}</h1>
      <dl className="summary-stats">
        <div>
          <dt>{t("summary.passed")}</dt>
          <dd className="mono">{s.passed}</dd>
        </div>
        <div>
          <dt>{t("summary.failed")}</dt>
          <dd className="mono">{s.failed}</dd>
        </div>
        <div>
          <dt>{t("summary.fixedAfterFeedback")}</dt>
          <dd className="mono">{s.fixedAfterFeedback}</dd>
        </div>
      </dl>
      {s.skillsPracticed.length > 0 && <p>{t("summary.skillsPracticed", { skills: tr.list(s.skillsPracticed.map((id) => skillName(props.skills, id))) })}</p>}
      {s.nextReviews.length > 0 && (
        <>
          <h2 className="section-label">{t("summary.nextReviews")}</h2>
          <ul className="plain-list">
            {s.nextReviews.map((r) => (
              <li key={r.skillId}>
                <Icon name="calendar" size={16} /> {skillName(props.skills, r.skillId)} · {tr.date(r.dueAt)}
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="row-actions">
        <button type="button" className="btn btn-primary" onClick={props.onShowProgress}>
          <Icon name="chart" /> {t("summary.showProgress")}
        </button>
        <button type="button" className="btn btn-secondary" onClick={props.onStart} disabled={props.busy}>
          <Icon name="play" /> {t("summary.newSession")}
        </button>
      </div>
    </div>
  );
}

function Workspace(props: TrainingProps & { readonly session: Session; readonly item: SessionItem }) {
  const { api, session, item, phase, onPhase, onSession, contentKey = 0 } = props;
  const tr = useI18n();
  const { t } = tr;
  const [view, setView] = useState<Async<ExerciseView>>({ status: "loading" });
  const [code, setCode] = useState("");
  const codeRef = useRef("");
  const [trial, setTrial] = useState<TrialRun | null>(null);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<SubmissionView | null>(null);
  const [attempts, setAttempts] = useState(0);
  const pendingKey = useRef<{ code: string; key: string } | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const updateCode = useCallback((c: string) => {
    codeRef.current = c;
    setCode(c);
  }, []);

  // The first load fills the editor with the starter code; later loads (after a language switch) only replace the
  // server-rendered texts and keep the learner's code and the current view.
  const loaded = useRef(false);
  const load = useCallback(() => {
    if (!loaded.current) setView({ status: "loading" });
    api.exercise(item.exerciseId).then(
      (v) => {
        if (!alive.current) return;
        if (!loaded.current) updateCode(starterCode(v.exercise));
        loaded.current = true;
        setView({ status: "ready", data: v });
      },
      (e: unknown) => alive.current && !loaded.current && setView({ status: "error", message: errorMessage(e, tr) }),
    );
    // contentKey: refetch in the new language. tr is read only for the error text.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, item.exerciseId, updateCode, contentKey]);

  useEffect(() => {
    onPhase("work");
  }, [onPhase]);

  useEffect(() => {
    load();
  }, [load]);

  if (view.status !== "ready") {
    return view.status === "loading" ? (
      <p className="page-status" role="status">
        {t("workspace.loadingExercise")}
      </p>
    ) : (
      <div className="center-card panel">
        <p className="inline-error" role="alert">
          {view.message}
        </p>
        <button type="button" className="btn btn-secondary" onClick={load}>
          <Icon name="refresh" /> {t("common.retry")}
        </button>
      </div>
    );
  }
  const ex = view.data.exercise;

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const r = await api.trialRun(ex.id, { code: codeRef.current });
      if (alive.current) setTrial(r);
    } catch (e) {
      if (alive.current) setError(errorMessage(e, tr));
    } finally {
      if (alive.current) setRunning(false);
    }
  };

  const submit = async () => {
    const current = codeRef.current;
    // Reuse the key when retrying the same code after a failed request, so the server deduplicates.
    if (!pendingKey.current || pendingKey.current.code !== current) pendingKey.current = { code: current, key: newIdempotencyKey() };
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.submit({ exerciseId: ex.id, code: current, idempotencyKey: pendingKey.current.key, sessionId: session.id });
      if (!alive.current) return;
      pendingKey.current = null;
      setSubmission(res);
      setAttempts((n) => n + 1);
      onPhase("feedback");
      api.session(session.id).then(
        (s) => alive.current && onSession(s),
        () => undefined,
      );
    } catch (e) {
      if (alive.current) setError(errorMessage(e, tr));
    } finally {
      if (alive.current) setSubmitting(false);
    }
  };

  const itemDone = session.currentIndex !== item.index;
  const next = !itemDone
    ? null
    : session.currentIndex === null
      ? { label: t("training.finish"), onClick: props.onComplete }
      : { label: t("workspace.next", { kind: itemKindLabel(tr, session.items[session.currentIndex]!.kind) }), onClick: () => props.onActiveIndex(session.currentIndex) };

  return (
    <div className="training">
      <div className="item-bar">
        <p className="item-bar-info">
          <span className="chip chip-accent">{itemKindLabel(tr, item.kind)}</span>
          <span>
            {t("workspace.exercise")} <span className="mono">{item.index + 1}</span>/<span className="mono">{session.items.length}</span>
          </span>
          <span className="muted item-bar-reason">{item.reason}</span>
        </p>
        <div className="item-bar-actions">
          {phase === "work" && !itemDone && (
            <button type="button" className="btn btn-quiet btn-small" onClick={props.onSkip} disabled={props.busy || submitting}>
              <Icon name="skip" size={16} /> {t("workspace.skip")}
            </button>
          )}
          <button type="button" className="btn btn-quiet btn-small" onClick={props.onComplete} disabled={props.busy}>
            <Icon name="flag" size={16} /> {t("training.finish")}
          </button>
        </div>
      </div>
      <div className="training-grid">
        {phase === "feedback" && submission ? (
          <FeedbackView
            key={submission.submission.id}
            api={api}
            result={submission}
            exercise={ex}
            contentKey={contentKey}
            skills={props.skills}
            onRevise={() => {
              setTrial(null);
              onPhase("work");
            }}
            onNext={next?.onClick}
            {...(next ? { nextLabel: next.label } : {})}
          />
        ) : (
          <>
            <ProblemPanel api={api} view={view.data} item={item} skills={props.skills} />
            <EditorPanel
              exercise={ex}
              code={code}
              onCodeChange={updateCode}
              onRun={() => void run()}
              onSubmit={() => void submit()}
              running={running}
              submitting={submitting}
              trial={trial}
              error={error}
              attempt={attempts}
            />
          </>
        )}
        <CoachPanel key={ex.id} api={api} exerciseId={ex.id} getCode={() => codeRef.current} submissionId={submission?.submission.id} />
      </div>
    </div>
  );
}
