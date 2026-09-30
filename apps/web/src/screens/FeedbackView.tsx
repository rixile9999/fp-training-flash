import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { ApiClient, CoachingFeedback, ExerciseDetail, Explanation, Skill, SubmissionView } from "@fp/api-contract";
import { errorMessage } from "../api/client.ts";
import type { Evaluation, RequirementResult, TestResult } from "../api/types.ts";
import { CodeBlock } from "../ui/CodeBlock.tsx";
import { Icon } from "../ui/Icon.tsx";
import type { IconName } from "../ui/Icon.tsx";
import { Markdown } from "../ui/Markdown.tsx";
import { StatusBadge } from "../ui/Status.tsx";
import { OUTCOME_LABEL, errorTagLabel, skillName } from "../ui/labels.ts";

/** Splits a runner message like "expected: X\n     got: Y" into its parts. */
export function parseExpectedActual(message: string | undefined): { expected: string; actual: string; rest: string } | null {
  if (!message) return null;
  const m = /expected:\s*(.*?)\s*\n\s*got:\s*(.*)/s.exec(message);
  if (!m) return null;
  return { expected: m[1]!.trim(), actual: m[2]!.trim(), rest: message.slice(0, m.index).trim() };
}

export function FeedbackView(props: {
  readonly api: ApiClient;
  readonly exercise: ExerciseDetail;
  readonly result: SubmissionView;
  readonly skills: readonly Skill[];
  readonly onRevise: () => void;
  /** Present when the session has a next item to move on to. */
  readonly onNext?: (() => void) | undefined;
  readonly nextLabel?: string;
}) {
  const { api, exercise, result } = props;
  const sub = result.submission;
  const ev = sub.evaluation;
  const [coach, setCoach] = useState<CoachingFeedback | null>(null);
  const [coachError, setCoachError] = useState<string | null>(null);

  const loadCoach = useCallback(() => {
    let alive = true;
    setCoach(null);
    setCoachError(null);
    api.feedback(sub.id).then(
      (fb) => alive && setCoach(fb),
      (e: unknown) => alive && setCoachError(errorMessage(e)),
    );
    return () => {
      alive = false;
    };
  }, [api, sub.id]);
  useEffect(loadCoach, [loadCoach]);

  return (
    <div className="feedback">
      <div className="feedback-main">
        <header className="feedback-head">
          <p className="eyebrow">
            {sub.attemptNo}번째 제출 · {exercise.title}
          </p>
          <h1 className="feedback-title">
            {ev ? <StatusBadge ok={ev.correctness} okLabel="정답" failLabel={OUTCOME_LABEL[ev.outcome]} /> : "채점 중"}
          </h1>
        </header>
        {ev ? <EvaluationLayers ev={ev} exercise={exercise} /> : <p className="muted">채점 결과를 기다리고 있습니다.</p>}
      </div>
      <aside className="feedback-side">
        <RatingPanel result={result} skills={props.skills} />
        <CoachFeedbackPanel coach={coach} error={coachError} onRetry={loadCoach} />
        <div className="feedback-actions">
          {props.onNext && ev?.correctness && (
            <button type="button" className="btn btn-primary btn-block" onClick={props.onNext}>
              {props.nextLabel ?? "다음 문제"} <Icon name="arrowRight" />
            </button>
          )}
          <button type="button" className={`btn btn-block ${ev?.correctness ? "btn-secondary" : "btn-primary"}`} onClick={props.onRevise}>
            <Icon name="refresh" /> 코드 수정하고 재제출
          </button>
          <ExplanationControl api={api} exerciseId={exercise.id} />
          {props.onNext && !ev?.correctness && (
            <button type="button" className="btn btn-ghost btn-block" onClick={props.onNext}>
              {props.nextLabel ?? "다음 문제"}로 넘어가기
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}

function Layer(props: { readonly n: number; readonly title: string; readonly icon: IconName; readonly aside?: ReactNode; readonly children: ReactNode }) {
  const id = `layer-${props.n}`;
  return (
    <section className="layer" aria-labelledby={id}>
      <header className="layer-head">
        <h2 id={id} className="layer-title">
          <span className="layer-num">{props.n}</span>
          <Icon name={props.icon} /> {props.title}
        </h2>
        {props.aside}
      </header>
      {props.children}
    </section>
  );
}

function EvaluationLayers({ ev, exercise }: { readonly ev: Evaluation; readonly exercise: ExerciseDetail }) {
  const passed = ev.tests.filter((t) => t.status === "passed").length;
  return (
    <>
      <Layer n={1} title="동작 정확성" icon="checkCircle" aside={<span className="mono muted">{ev.tests.length ? `${passed}/${ev.tests.length} 통과` : ""}</span>}>
        {ev.outcome === "system_error" && <p className="notice">채점 시스템 오류입니다. 이 결과는 학습 기록에 실패로 남지 않습니다.</p>}
        {ev.rejectionReasons?.map((r) => (
          <p key={r} className="notice notice-fail">
            <Icon name="alert" size={16} /> {r}
          </p>
        ))}
        {ev.compileDiagnostics.map((d, i) => (
          <pre key={i} className="console-pre diag">
            {d.file ? `${d.file}${d.line ? `:${d.line}` : ""}  ` : ""}
            {d.message}
          </pre>
        ))}
        {ev.tests.length > 0 && (
          <ul className="test-list">
            {ev.tests.map((t) => (
              <TestRow key={t.id} test={t} />
            ))}
          </ul>
        )}
        {ev.performance && ev.performance.verdict !== "not_measured" && (
          <p className="perf">
            <StatusBadge ok={ev.performance.verdict === "ok"} okLabel="성능 기준 충족" failLabel="성능 기준 미달" />
            {ev.performance.ratio !== undefined && <span className="mono muted">기준 대비 {ev.performance.ratio.toFixed(1)}배</span>}
          </p>
        )}
        {ev.errorTags.length > 0 && (
          <p className="error-tags">
            <Icon name="tag" size={16} /> 기록된 오류 유형: {ev.errorTags.map(errorTagLabel).join(", ")}
          </p>
        )}
      </Layer>
      <Layer n={2} title="과제 요구사항" icon="flag">
        {ev.requirements.length === 0 ? (
          <p className="muted">이 문제는 요구사항을 테스트로만 확인합니다.</p>
        ) : (
          <ul className="req-list">
            {ev.requirements.map((r) => (
              <RequirementRow key={r.id} req={r} />
            ))}
          </ul>
        )}
      </Layer>
      <Layer n={3} title="코드 품질" icon="layers" aside={<span className="chip chip-small chip-quiet">정답 판정과 레이팅에 반영하지 않음</span>}>
        {ev.rubricChecks.length === 0 ? (
          <p className="muted">자동 점검 항목이 없습니다.</p>
        ) : (
          <ul className="rubric-list">
            {ev.rubricChecks.map((c) => {
              const item = exercise.rubric.find((r) => r.id === c.rubricId);
              const ok = c.status === "ok";
              return (
                <li key={c.rubricId} className="rubric-row">
                  <span className={`rubric-status ${ok ? "is-ok" : "is-flagged"}`}>
                    <Icon name={ok ? "check" : "alert"} size={16} />
                    {ok ? "기준 충족" : "개선 제안"}
                  </span>
                  <span>
                    <span className="mono muted">{c.rubricId}</span> {item?.title ?? ""}
                    {c.message && <span className="rubric-msg">{c.message}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Layer>
    </>
  );
}

function TestRow({ test }: { readonly test: TestResult }) {
  const ok = test.status === "passed";
  const ea = parseExpectedActual(test.message);
  const statusLabel = test.status === "timeout" ? "시간 초과" : test.status === "error" ? "오류" : "실패";
  return (
    <li className={`test-row${ok ? "" : " is-failed"}`}>
      <div className="test-row-head">
        <StatusBadge ok={ok} failLabel={statusLabel} />
        <span className="test-name">{test.name}</span>
        {test.visibility === "hidden" && <span className="chip chip-small">숨은 테스트</span>}
      </div>
      {!ok && (
        <div className="test-detail">
          {ea ? (
            <dl className="expected-actual">
              <dt>기대값</dt>
              <dd className="mono">{ea.expected}</dd>
              <dt>실제 결과</dt>
              <dd className="mono">{ea.actual}</dd>
              {ea.rest && (
                <>
                  <dt>메시지</dt>
                  <dd>{ea.rest}</dd>
                </>
              )}
            </dl>
          ) : (
            test.message && <pre className="console-pre">{test.message}</pre>
          )}
          {test.code && (
            <>
              <p className="small muted">{test.visibility === "hidden" ? "실패한 숨은 테스트의 코드를 공개합니다" : "테스트 코드"}</p>
              <CodeBlock code={test.code} label={`${test.name} 테스트 코드`} />
            </>
          )}
        </div>
      )}
    </li>
  );
}

const REQ: Record<RequirementResult["status"], { label: string; icon: IconName; cls: string }> = {
  met: { label: "충족", icon: "checkCircle", cls: "is-met" },
  unmet: { label: "미충족", icon: "xCircle", cls: "is-unmet" },
  undetermined: { label: "판정 불가", icon: "help", cls: "is-undetermined" },
};

function RequirementRow({ req }: { readonly req: RequirementResult }) {
  const s = REQ[req.status];
  return (
    <li className="req-row">
      <span className={`req-status ${s.cls}`}>
        <Icon name={s.icon} size={16} />
        {s.label}
      </span>
      <span>
        <span className="mono muted">{req.id}</span> {req.description}
      </span>
    </li>
  );
}

function RatingPanel({ result, skills }: { readonly result: SubmissionView; readonly skills: readonly Skill[] }) {
  const rc = result.ratingChange;
  const sub = result.submission;
  const reasons: string[] = [];
  if (sub.attemptNo > 1) reasons.push("재제출");
  if (sub.helpUsed.maxHintLevel > 2) reasons.push(`힌트 ${sub.helpUsed.maxHintLevel}단계 사용`);
  if (sub.helpUsed.explanationViewed) reasons.push("해설 확인 후 제출");
  if (sub.evaluation?.outcome === "system_error") reasons.push("채점 시스템 오류");
  return (
    <section className="card rating-card" aria-labelledby="rating-h">
      <h2 id="rating-h" className="card-title">
        레이팅 변화
      </h2>
      {rc ? (
        <>
          <p className="rating-skill">{skillName(skills, rc.skillId)}</p>
          <p className="rating-change">
            <span className="mono rating-before">{rc.before}</span>
            <Icon name="arrowRight" label="에서" />
            <span className="mono rating-after">{rc.after}</span>
            <span className={`rating-delta mono ${rc.after >= rc.before ? "is-up" : "is-down"}`}>
              ({rc.after >= rc.before ? "+" : ""}
              {rc.after - rc.before})
            </span>
            {rc.provisional && <span className="badge-provisional">잠정</span>}
          </p>
        </>
      ) : (
        <p className="rating-none">
          이번 제출은 레이팅에 반영되지 않았습니다{reasons.length ? ` (${reasons.join(", ")})` : ""}.
        </p>
      )}
      <p className="small muted">첫 제출만 반영합니다. 힌트 3단계 이상이나 해설을 본 뒤의 제출은 기록만 남습니다.</p>
    </section>
  );
}

function CoachFeedbackPanel(props: { readonly coach: CoachingFeedback | null; readonly error: string | null; readonly onRetry: () => void }) {
  const { coach, error } = props;
  return (
    <section className="card coach-feedback" aria-labelledby="coach-fb-h" aria-busy={!coach && !error}>
      <h2 id="coach-fb-h" className="card-title">
        <Icon name="message" /> 코치 피드백
        {coach && <span className="chip chip-small chip-quiet">{coach.source === "llm" ? "AI 코치" : "규칙 기반"}</span>}
      </h2>
      {error ? (
        <div role="alert">
          <p className="inline-error">{error}</p>
          <button type="button" className="btn btn-secondary" onClick={props.onRetry}>
            다시 불러오기
          </button>
        </div>
      ) : !coach ? (
        <div role="status" className="coach-loading">
          <p>코치가 실행 결과를 근거로 피드백을 작성하고 있습니다...</p>
          <span className="skeleton" />
          <span className="skeleton skeleton-short" />
        </div>
      ) : (
        <dl className="coach-parts">
          <dt>현재 결과</dt>
          <dd>
            <Markdown source={coach.summary} />
          </dd>
          <dt>근거</dt>
          <dd>
            {coach.evidence.length === 0 ? (
              <p className="muted">추가 근거 없음</p>
            ) : (
              <ul>
                {coach.evidence.map((e, i) => (
                  <li key={i}>
                    {e.line !== undefined && <span className="mono muted">{e.line}행 </span>}
                    {e.text}
                  </li>
                ))}
              </ul>
            )}
          </dd>
          <dt>우선 과제</dt>
          <dd>
            <ol>
              {coach.priorities.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ol>
          </dd>
          <dt>다음 행동</dt>
          <dd>
            <p>{coach.nextAction}</p>
          </dd>
        </dl>
      )}
    </section>
  );
}

function ExplanationControl({ api, exerciseId }: { readonly api: ApiClient; readonly exerciseId: string }) {
  const [stage, setStage] = useState<"idle" | "confirm" | "loading" | "shown">("idle");
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reveal = async () => {
    setStage("loading");
    setError(null);
    try {
      setExplanation(await api.explanation(exerciseId));
      setStage("shown");
    } catch (e) {
      setError(errorMessage(e));
      setStage("confirm");
    }
  };
  if (stage === "idle")
    return (
      <button type="button" className="btn btn-ghost btn-block" onClick={() => setStage("confirm")}>
        <Icon name="book" /> 전체 해설 보기
      </button>
    );
  if (stage === "shown" && explanation)
    return (
      <section className="card explanation" aria-labelledby="expl-h">
        <h2 id="expl-h" className="card-title">
          <Icon name="book" /> 전체 해설
        </h2>
        <Markdown source={explanation.markdown} />
        <CodeBlock code={explanation.solutionCode} label="참고 풀이 코드" />
      </section>
    );
  return (
    <div className="confirm" role="alertdialog" aria-labelledby="confirm-h" aria-describedby="confirm-d">
      <p id="confirm-h" className="confirm-title">
        전체 해설을 볼까요?
      </p>
      <p id="confirm-d" className="small">
        해설을 보면 이 문제에서는 숙달 여부를 판정하지 않고, 새로운 변형 문제로 다시 확인합니다.
      </p>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <div className="confirm-actions">
        <button type="button" className="btn btn-primary" onClick={reveal} disabled={stage === "loading"}>
          {stage === "loading" ? "불러오는 중..." : "해설 보기"}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setStage("idle")}>
          취소
        </button>
      </div>
    </div>
  );
}
