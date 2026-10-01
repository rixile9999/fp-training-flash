import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { ApiClient, CoachingFeedback, ExerciseDetail, Explanation, Skill, SubmissionView } from "@fp/api-contract";
import { errorMessage } from "../api/client.ts";
import { useI18n } from "../i18n/I18n.tsx";
import type { Translator } from "../i18n/translator.ts";
import type { Evaluation, RequirementResult, TestResult } from "../api/types.ts";
import { CodeBlock } from "../ui/CodeBlock.tsx";
import { Icon } from "../ui/Icon.tsx";
import { RatingLine } from "../ui/Rating.tsx";
import type { IconName } from "../ui/Icon.tsx";
import { Markdown } from "../ui/Markdown.tsx";
import { StatusBadge } from "../ui/Status.tsx";
import { errorTagLabel, outcomeLabel } from "../ui/labels.ts";

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
  /** Changes after a language switch: coaching feedback is fetched again in the new language. */
  readonly contentKey?: number;
}) {
  const { api, exercise, result, contentKey = 0 } = props;
  const tr = useI18n();
  const { t } = tr;
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
      (e: unknown) => alive && setCoachError(errorMessage(e, tr)),
    );
    return () => {
      alive = false;
    };
    // contentKey: refetch in the new language. tr is read only for the error text.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, sub.id, contentKey]);
  useEffect(loadCoach, [loadCoach]);

  return (
    <div className="feedback">
      <div className="feedback-main">
        <header className="feedback-head">
          <p className="eyebrow">
            {t("feedback.attempt", { n: sub.attemptNo, title: exercise.title })}
          </p>
          <h1 className="feedback-title">
            {ev ? <StatusBadge ok={ev.correctness} okLabel={t("feedback.correct")} failLabel={outcomeLabel(tr, ev.outcome)} /> : t("feedback.grading")}
          </h1>
        </header>
        {ev ? <EvaluationLayers ev={ev} exercise={exercise} /> : <p className="muted">{t("feedback.waiting")}</p>}
      </div>
      <aside className="feedback-side">
        <RatingPanel result={result} skills={props.skills} />
        <CoachFeedbackPanel coach={coach} error={coachError} onRetry={loadCoach} />
        <div className="feedback-actions">
          {props.onNext && ev?.correctness && (
            <button type="button" className="btn btn-primary btn-block" onClick={props.onNext}>
              {props.nextLabel ?? t("feedback.next")} <Icon name="arrowRight" />
            </button>
          )}
          <button type="button" className={`btn btn-block ${ev?.correctness ? "btn-secondary" : "btn-primary"}`} onClick={props.onRevise}>
            <Icon name="refresh" /> {t("feedback.revise")}
          </button>
          <ExplanationControl api={api} exerciseId={exercise.id} />
          {props.onNext && !ev?.correctness && (
            <button type="button" className="btn btn-ghost btn-block" onClick={props.onNext}>
              {t("feedback.moveOn", { label: props.nextLabel ?? t("feedback.next") })}
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
  const tr = useI18n();
  const { t } = tr;
  const passed = ev.tests.filter((t) => t.status === "passed").length;
  return (
    <>
      <Layer
        n={1}
        title={t("layer.correctness")}
        icon="checkCircle"
        aside={<span className="mono muted">{ev.tests.length ? t("editor.passedCount", { passed, total: ev.tests.length }) : ""}</span>}
      >
        {ev.outcome === "system_error" && <p className="notice">{t("feedback.systemError")}</p>}
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
            <StatusBadge ok={ev.performance.verdict === "ok"} okLabel={t("feedback.perfOk")} failLabel={outcomeLabel(tr, "too_slow")} />
            {ev.performance.ratio !== undefined && <span className="mono muted">{t("feedback.perfRatio", { ratio: tr.number(ev.performance.ratio, 1) })}</span>}
          </p>
        )}
        {ev.errorTags.length > 0 && (
          <p className="error-tags">
            <Icon name="tag" size={16} /> {t("feedback.errorTags", { tags: tr.list(ev.errorTags.map((tag) => errorTagLabel(tr, tag))) })}
          </p>
        )}
      </Layer>
      <Layer n={2} title={t("layer.requirements")} icon="flag">
        {ev.requirements.length === 0 ? (
          <p className="muted">{t("feedback.requirementsTestsOnly")}</p>
        ) : (
          <ul className="req-list">
            {ev.requirements.map((r) => (
              <RequirementRow key={r.id} req={r} />
            ))}
          </ul>
        )}
      </Layer>
      <Layer n={3} title={t("layer.quality")} icon="layers" aside={<span className="chip chip-small chip-quiet">{t("feedback.qualityNote")}</span>}>
        {ev.rubricChecks.length === 0 ? (
          <p className="muted">{t("feedback.noRubric")}</p>
        ) : (
          <ul className="rubric-list">
            {ev.rubricChecks.map((c) => {
              const item = exercise.rubric.find((r) => r.id === c.rubricId);
              const ok = c.status === "ok";
              return (
                <li key={c.rubricId} className="rubric-row">
                  <span className={`rubric-status ${ok ? "is-ok" : "is-flagged"}`}>
                    <Icon name={ok ? "check" : "alert"} size={16} />
                    {ok ? t("rubric.ok") : t("rubric.flagged")}
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
  const { t } = useI18n();
  const ok = test.status === "passed";
  const ea = parseExpectedActual(test.message);
  const statusLabel = test.status === "timeout" ? t("test.timeout") : test.status === "error" ? t("test.error") : t("common.fail");
  return (
    <li className={`test-row${ok ? "" : " is-failed"}`}>
      <div className="test-row-head">
        <StatusBadge ok={ok} failLabel={statusLabel} />
        <span className="test-name">{test.name}</span>
        {test.visibility === "hidden" && <span className="chip chip-small">{t("test.hidden")}</span>}
      </div>
      {!ok && (
        <div className="test-detail">
          {ea ? (
            <dl className="expected-actual">
              <dt>{t("test.expected")}</dt>
              <dd className="mono">{ea.expected}</dd>
              <dt>{t("test.actual")}</dt>
              <dd className="mono">{ea.actual}</dd>
              {ea.rest && (
                <>
                  <dt>{t("test.message")}</dt>
                  <dd>{ea.rest}</dd>
                </>
              )}
            </dl>
          ) : (
            test.message && <pre className="console-pre">{test.message}</pre>
          )}
          {test.code && (
            <>
              <p className="small muted">{test.visibility === "hidden" ? t("test.hiddenCode") : t("test.code")}</p>
              <CodeBlock code={test.code} label={t("problem.testCode", { name: test.name })} />
            </>
          )}
        </div>
      )}
    </li>
  );
}

const REQ: Record<RequirementResult["status"], { icon: IconName; cls: string }> = {
  met: { icon: "checkCircle", cls: "is-met" },
  unmet: { icon: "xCircle", cls: "is-unmet" },
  undetermined: { icon: "help", cls: "is-undetermined" },
};

function RequirementRow({ req }: { readonly req: RequirementResult }) {
  const { t } = useI18n();
  const s = REQ[req.status];
  return (
    <li className="req-row">
      <span className={`req-status ${s.cls}`}>
        <Icon name={s.icon} size={16} />
        {t(`req.${req.status}`)}
      </span>
      <span>
        <span className="mono muted">{req.id}</span> {req.description}
      </span>
    </li>
  );
}

function notRatedReasons(tr: Translator, sub: SubmissionView["submission"]): string[] {
  const reasons: string[] = [];
  if (sub.attemptNo > 1) reasons.push(tr.t("rating.reason.resubmit"));
  if (sub.helpUsed.maxHintLevel > 2) reasons.push(tr.t("rating.reason.hint", { level: sub.helpUsed.maxHintLevel }));
  if (sub.helpUsed.explanationViewed) reasons.push(tr.t("rating.reason.explanation"));
  if (sub.evaluation?.outcome === "system_error") reasons.push(tr.t("rating.reason.systemError"));
  return reasons;
}

function RatingPanel({ result, skills }: { readonly result: SubmissionView; readonly skills: readonly Skill[] }) {
  const tr = useI18n();
  const { t } = tr;
  const rc = result.ratingChange;
  const reasons = notRatedReasons(tr, result.submission);
  return (
    <section className="card rating-card" aria-labelledby="rating-h">
      <h2 id="rating-h" className="card-title">
        {t("rating.title")}
      </h2>
      {rc ? (
        <RatingLine change={rc} skills={skills} />
      ) : (
        <p className="rating-none">
          {t("rating.notRated", { reasons: reasons.length ? t("rating.reasons", { list: tr.list(reasons) }) : "" })}
        </p>
      )}
      <p className="small muted">{t("rating.policy")}</p>
    </section>
  );
}

function CoachFeedbackPanel(props: { readonly coach: CoachingFeedback | null; readonly error: string | null; readonly onRetry: () => void }) {
  const { coach, error } = props;
  const { t } = useI18n();
  return (
    <section className="card coach-feedback" aria-labelledby="coach-fb-h" aria-busy={!coach && !error}>
      <h2 id="coach-fb-h" className="card-title">
        <Icon name="message" /> {t("coachFb.title")}
        {coach && <span className="chip chip-small chip-quiet">{coach.source === "llm" ? t("coachFb.llm") : t("coachFb.rules")}</span>}
      </h2>
      {error ? (
        <div role="alert">
          <p className="inline-error">{error}</p>
          <button type="button" className="btn btn-secondary" onClick={props.onRetry}>
            {t("coachFb.reload")}
          </button>
        </div>
      ) : !coach ? (
        <div role="status" className="coach-loading">
          <p>{t("coachFb.loading")}</p>
          <span className="skeleton" />
          <span className="skeleton skeleton-short" />
        </div>
      ) : (
        <dl className="coach-parts">
          <dt>{t("coachFb.summary")}</dt>
          <dd>
            <Markdown source={coach.summary} />
          </dd>
          <dt>{t("coachFb.evidence")}</dt>
          <dd>
            {coach.evidence.length === 0 ? (
              <p className="muted">{t("coachFb.noEvidence")}</p>
            ) : (
              <ul>
                {coach.evidence.map((e, i) => (
                  <li key={i}>
                    {e.line !== undefined && <span className="mono muted">{t("coachFb.line", { line: e.line })}</span>}
                    {e.text}
                  </li>
                ))}
              </ul>
            )}
          </dd>
          <dt>{t("coachFb.priorities")}</dt>
          <dd>
            <ol>
              {coach.priorities.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ol>
          </dd>
          <dt>{t("coachFb.next")}</dt>
          <dd>
            <p>{coach.nextAction}</p>
          </dd>
        </dl>
      )}
    </section>
  );
}

function ExplanationControl({ api, exerciseId }: { readonly api: ApiClient; readonly exerciseId: string }) {
  const tr = useI18n();
  const { t } = tr;
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
      setError(errorMessage(e, tr));
      setStage("confirm");
    }
  };
  if (stage === "idle")
    return (
      <button type="button" className="btn btn-ghost btn-block" onClick={() => setStage("confirm")}>
        <Icon name="book" /> {t("expl.show")}
      </button>
    );
  if (stage === "shown" && explanation)
    return (
      <section className="card explanation" aria-labelledby="expl-h">
        <h2 id="expl-h" className="card-title">
          <Icon name="book" /> {t("expl.title")}
        </h2>
        <Markdown source={explanation.markdown} />
        <CodeBlock code={explanation.solutionCode} label={t("expl.solutionCode")} />
      </section>
    );
  return (
    <div className="confirm" role="alertdialog" aria-labelledby="confirm-h" aria-describedby="confirm-d">
      <p id="confirm-h" className="confirm-title">
        {t("expl.confirmTitle")}
      </p>
      <p id="confirm-d" className="small">
        {t("expl.confirmBody")}
      </p>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <div className="confirm-actions">
        <button type="button" className="btn btn-primary" onClick={reveal} disabled={stage === "loading"}>
          {stage === "loading" ? t("common.loading") : t("expl.confirm")}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setStage("idle")}>
          {t("common.cancel")}
        </button>
      </div>
    </div>
  );
}
