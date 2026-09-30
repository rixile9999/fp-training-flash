import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiClient, ExerciseView, Session, SessionSummary, Skill, SubmissionView, TrialRun } from "@fp/api-contract";
import { errorMessage, newIdempotencyKey } from "../api/client.ts";
import type { Phase } from "../session.ts";
import { Icon } from "../ui/Icon.tsx";
import { formatDate, skillName } from "../ui/labels.ts";
import { CoachPanel } from "./CoachPanel.tsx";
import { EditorPanel, starterCode } from "./EditorPanel.tsx";
import { FeedbackView } from "./FeedbackView.tsx";
import { ProblemPanel } from "./ProblemPanel.tsx";

type SessionItem = Session["items"][number];
type Async<T> = { readonly status: "loading" } | { readonly status: "ready"; readonly data: T } | { readonly status: "error"; readonly message: string };

const ITEM_KIND: Record<SessionItem["kind"], string> = { review: "복습", focus: "집중 훈련", variation: "변형 적용", challenge: "도전 과제" };

export interface TrainingProps {
  readonly api: ApiClient;
  readonly skills: readonly Skill[];
  /** undefined while loading, null when there is no active session. */
  readonly session: Session | null | undefined;
  readonly activeIndex: number | null;
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
  const { session, summary } = props;
  if (summary) return <SummaryView summary={summary} skills={props.skills} onStart={props.onStart} onShowProgress={props.onShowProgress} busy={props.busy} />;
  if (session === undefined) return <p className="page-status" role="status">세션을 불러오는 중입니다...</p>;
  if (session === null) return <StartCard onStart={props.onStart} busy={props.busy} error={props.error} />;
  const item = props.activeIndex === null ? undefined : session.items[props.activeIndex];
  if (!item) {
    return (
      <div className="center-card panel">
        <h1 className="problem-title">세션의 모든 문제를 마쳤습니다</h1>
        <p className="muted">마무리하면 이번 세션 요약과 다음 복습 일정을 보여 드립니다.</p>
        <button type="button" className="btn btn-primary" onClick={props.onComplete} disabled={props.busy}>
          <Icon name="flag" /> 세션 마무리
        </button>
      </div>
    );
  }
  return <Workspace key={`${session.id}:${item.index}`} {...props} session={session} item={item} />;
}

function StartCard({ onStart, busy, error }: { readonly onStart: () => void; readonly busy: boolean; readonly error: string | null }) {
  return (
    <div className="center-card panel">
      <p className="eyebrow">오늘의 훈련</p>
      <h1 className="problem-title">15분 세션을 시작하세요</h1>
      <p className="muted">복습 한 문제, 집중 훈련, 피드백 후 재제출, 변형 문제 적용 순서로 진행합니다. 문제는 현재 레이팅과 복습 일정에 맞춰 고릅니다.</p>
      <button type="button" className="btn btn-primary" onClick={onStart} disabled={busy}>
        <Icon name="play" /> {busy ? "세션 준비 중..." : "15분 세션 시작"}
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
  const s = props.summary;
  return (
    <div className="center-card panel summary">
      <p className="eyebrow">마무리</p>
      <h1 className="problem-title">세션을 마쳤습니다</h1>
      <dl className="summary-stats">
        <div>
          <dt>통과</dt>
          <dd className="mono">{s.passed}</dd>
        </div>
        <div>
          <dt>미통과</dt>
          <dd className="mono">{s.failed}</dd>
        </div>
        <div>
          <dt>피드백 후 해결</dt>
          <dd className="mono">{s.fixedAfterFeedback}</dd>
        </div>
      </dl>
      {s.skillsPracticed.length > 0 && <p>연습한 기술: {s.skillsPracticed.map((id) => skillName(props.skills, id)).join(", ")}</p>}
      {s.nextReviews.length > 0 && (
        <>
          <h2 className="section-label">다음 복습</h2>
          <ul className="plain-list">
            {s.nextReviews.map((r) => (
              <li key={r.skillId}>
                <Icon name="calendar" size={16} /> {skillName(props.skills, r.skillId)} · {formatDate(r.dueAt)}
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="row-actions">
        <button type="button" className="btn btn-primary" onClick={props.onShowProgress}>
          <Icon name="chart" /> 진행 현황 보기
        </button>
        <button type="button" className="btn btn-secondary" onClick={props.onStart} disabled={props.busy}>
          <Icon name="play" /> 새 세션 시작
        </button>
      </div>
    </div>
  );
}

function Workspace(props: TrainingProps & { readonly session: Session; readonly item: SessionItem }) {
  const { api, session, item, phase, onPhase, onSession } = props;
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

  const load = useCallback(() => {
    setView({ status: "loading" });
    api.exercise(item.exerciseId).then(
      (v) => {
        if (!alive.current) return;
        updateCode(starterCode(v.exercise));
        setView({ status: "ready", data: v });
      },
      (e: unknown) => alive.current && setView({ status: "error", message: errorMessage(e) }),
    );
  }, [api, item.exerciseId, updateCode]);

  useEffect(() => {
    onPhase("work");
    load();
  }, [load, onPhase]);

  if (view.status !== "ready") {
    return view.status === "loading" ? (
      <p className="page-status" role="status">
        문제를 불러오는 중입니다...
      </p>
    ) : (
      <div className="center-card panel">
        <p className="inline-error" role="alert">
          {view.message}
        </p>
        <button type="button" className="btn btn-secondary" onClick={load}>
          <Icon name="refresh" /> 다시 시도
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
      if (alive.current) setError(errorMessage(e));
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
      if (alive.current) setError(errorMessage(e));
    } finally {
      if (alive.current) setSubmitting(false);
    }
  };

  const itemDone = session.currentIndex !== item.index;
  const next = !itemDone
    ? null
    : session.currentIndex === null
      ? { label: "세션 마무리", onClick: props.onComplete }
      : { label: `다음 문제: ${ITEM_KIND[session.items[session.currentIndex]!.kind]}`, onClick: () => props.onActiveIndex(session.currentIndex) };

  return (
    <div className="training">
      <div className="item-bar">
        <p className="item-bar-info">
          <span className="chip chip-accent">{ITEM_KIND[item.kind]}</span>
          <span>
            문제 <span className="mono">{item.index + 1}</span>/<span className="mono">{session.items.length}</span>
          </span>
          <span className="muted item-bar-reason">{item.reason}</span>
        </p>
        <div className="item-bar-actions">
          {phase === "work" && !itemDone && (
            <button type="button" className="btn btn-quiet btn-small" onClick={props.onSkip} disabled={props.busy || submitting}>
              <Icon name="skip" size={16} /> 이 문제 건너뛰기
            </button>
          )}
          <button type="button" className="btn btn-quiet btn-small" onClick={props.onComplete} disabled={props.busy}>
            <Icon name="flag" size={16} /> 세션 마무리
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
