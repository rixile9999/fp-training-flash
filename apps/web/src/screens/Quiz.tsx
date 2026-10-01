import { useState } from "react";
import type { ReactNode } from "react";
import type { ApiClient, CheckpointResult, CourseView, PlacementResult, Quiz, Skill } from "@fp/api-contract";
import { errorMessage } from "../api/client.ts";
import type { CourseUnit, QuizItem, QuizItemReview } from "../api/types.ts";
import { MAP, parseBacklink, routeOf } from "../course.ts";
import type { CourseRoute } from "../course.ts";
import { useI18n } from "../i18n/I18n.tsx";
import { CodeBlock } from "../ui/CodeBlock.tsx";
import { Disclosure } from "../ui/Disclosure.tsx";
import { Icon } from "../ui/Icon.tsx";
import type { IconName } from "../ui/Icon.tsx";
import { Markdown, renderInline } from "../ui/Markdown.tsx";
import { BackLink, PageTitle } from "../ui/PageTitle.tsx";
import { RatingLine } from "../ui/Rating.tsx";
import { Alert, StatusBadge } from "../ui/Status.tsx";
import { skillName } from "../ui/labels.ts";
import { Choice, ItemHead } from "./Lesson.tsx";

type Answers = Readonly<Record<string, number | null>>;
type ScreenProps = Readonly<{ api: ApiClient; course: CourseView; onRoute: (r: CourseRoute) => void; refresh: () => Promise<CourseView> }>;

/** One item at a time; nothing is graded before the whole quiz is submitted (rated). Unanswered items go as null. */
export function QuizRunner(props: Readonly<{ quiz: Quiz; submitting: boolean; error: string | null; onSubmit: (a: Answers) => void }>) {
  const { items } = props.quiz;
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const item = items[index]!;
  const answered = items.filter((i) => answers[i.itemId] != null).length;
  return (
    <div className="quiz">
      <div className="quiz-bar">
        <p className="strong">{t("quiz.position", { n: index + 1, total: items.length })}</p>
        <ol className="quiz-nav plain-list" aria-label={t("quiz.nav")}>
          {items.map((it, i) => {
            const done = answers[it.itemId] != null;
            const cls = `quiz-dot${i === index ? " is-current" : ""}${done ? " is-answered" : ""}`;
            return (
              <li key={it.itemId}>
                <button type="button" className={cls} aria-current={i === index ? "step" : undefined} aria-label={t(done ? "quiz.goToAnswered" : "quiz.goTo", { n: i + 1 })} onClick={() => setIndex(i)}>
                  {done ? <Icon name="check" size={14} /> : i + 1}
                </button>
              </li>
            );
          })}
        </ol>
        <p className="small muted">{t("quiz.answered", { n: answered, total: items.length })}</p>
      </div>
      <section key={item.itemId} className="exercise panel" aria-labelledby="quiz-prompt">
        <ItemHead id="quiz-prompt" item={item} />
        <ul className="choices plain-list">
          {item.choices.map((c, i) => (
            <li key={i}>
              <Choice i={i} text={c} mark={answers[item.itemId] === i ? "selected" : null} pressed={answers[item.itemId] === i} onClick={() => setAnswers({ ...answers, [item.itemId]: i })} />
            </li>
          ))}
        </ul>
      </section>
      <div className="quiz-actions">
        <button type="button" className="btn btn-secondary" onClick={() => setIndex(index - 1)} disabled={index === 0}>
          <Icon name="arrowLeft" /> {t("quiz.prev")}
        </button>
        {index < items.length - 1 ? (
          <button type="button" className="btn btn-primary" onClick={() => setIndex(index + 1)}>
            {t("quiz.next")} <Icon name="arrowRight" />
          </button>
        ) : (
          <>
            {answered < items.length && <p className="small muted">{t("quiz.unanswered", { n: items.length - answered })}</p>}
            <button type="button" className="btn btn-primary" disabled={props.submitting} onClick={() => props.onSubmit(Object.fromEntries(items.map((i) => [i.itemId, answers[i.itemId] ?? null])))}>
              {t(props.submitting ? "quiz.submitting" : "quiz.submit")}
            </button>
          </>
        )}
      </div>
      <Alert message={props.error} />
    </div>
  );
}

/** Per-item review: my answer, the correct one, the explanation and a link back to the lesson exercise. */
export function ReviewList(props: Readonly<{ items: readonly QuizItem[]; review: readonly QuizItemReview[]; onRoute: (r: CourseRoute) => void }>) {
  const { t } = useI18n();
  return (
    <ol className="review-list plain-list">
      {props.review.map((r, n) => {
        const item = props.items.find((i) => i.itemId === r.itemId);
        const link = parseBacklink(r.backlink);
        return (
          <li key={r.itemId} className="review-item panel">
            <p className="exercise-top">
              <span className="mono small muted">{t("quiz.itemNo", { n: n + 1 })}</span>
              <StatusBadge ok={r.correct} okLabel={t("feedback.correct")} failLabel={t(r.chosen === null ? "quiz.skipped" : "choice.wrong")} />
            </p>
            {item && (
              <>
                <p className="review-prompt">{renderInline(item.prompt)}</p>
                {item.code && <CodeBlock code={item.code} label={t("lesson.code")} />}
                <ul className="review-choices plain-list">
                  {item.choices.map((c, i) => (
                    <li key={i}>
                      <Choice i={i} text={c} mark={i === r.correctIndex ? "correct" : i === r.chosen ? "wrong" : null} mine={i === r.chosen} />
                    </li>
                  ))}
                </ul>
              </>
            )}
            <Markdown source={r.feedback} className="review-feedback" />
            {link && (
              <button type="button" className="btn btn-ghost btn-small" onClick={() => props.onRoute(link)}>
                <Icon name="book" size={16} /> {t("quiz.backlink")}
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function useQuiz<R>(start: () => Promise<Quiz>, submit: (quizId: string, a: Answers) => Promise<R>, refresh: () => Promise<CourseView>, init: R | null) {
  const tr = useI18n();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [result, setResult] = useState<R | null>(init);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
  const begin = () =>
    run(async () => {
      const q = await start();
      setResult(null);
      setQuiz(q);
    });
  // The course (progress, next step) is refreshed before the result shows, so its buttons use fresh data.
  const finish = (a: Answers) =>
    run(async () => {
      const r = await submit(quiz!.quizId, a);
      await refresh().catch(() => undefined);
      setResult(r);
    });
  return { quiz, result, busy, error, begin, finish };
}

function Intro(props: Readonly<{ facts: readonly [IconName, string][]; children: ReactNode; error: string | null }>) {
  return (
    <section className="panel intro-card">
      <ul className="plain-list facts">
        {props.facts.map(([icon, text]) => (
          <li key={text}>
            <Icon name={icon} /> {text}
          </li>
        ))}
      </ul>
      <div className="row-actions">{props.children}</div>
      <Alert message={props.error} />
    </section>
  );
}

export function CheckpointScreen(props: ScreenProps & Readonly<{ unit: CourseUnit; skills: readonly Skill[] }>) {
  const { api, unit, onRoute } = props;
  const tr = useI18n();
  const { t } = tr;
  const q = useQuiz<CheckpointResult>(() => api.startCheckpoint(unit.id), (id, answers) => api.submitCheckpoint(id, { answers }), props.refresh, null);
  const r = q.quiz && q.result;
  const startBtn = (
    <button type="button" className="btn btn-primary" onClick={() => void q.begin()} disabled={q.busy}>
      <Icon name={r ? "refresh" : "play"} /> {t(r ? "common.retry" : "course.cpStart")}
    </button>
  );
  return (
    <div className="page quiz-page">
      <BackLink label={unit.title} onClick={() => onRoute({ screen: "unit", unitId: unit.id })} />
      <p className="eyebrow">{t("checkpoint.eyebrow", { unit: unit.title })}</p>
      <PageTitle key={r ? "result" : "quiz"}>{t(r ? "checkpoint.resultTitle" : "course.checkpoint")}</PageTitle>
      {r ? (
        <>
          <div className="result-top">
            <section className="panel score-card" aria-labelledby="cp-score">
              <p id="cp-score" className="score mono">
                {r.score}
                <span className="muted">/{r.total}</span>
              </p>
              <StatusBadge ok={r.passed} failLabel={t("summary.failed")} />
              <p className="small muted">{t("checkpoint.threshold", { pct: tr.percent(q.quiz?.passThreshold ?? 0.8) })}</p>
            </section>
            <section className="panel rating-card" aria-labelledby="cp-rating-h">
              <h2 id="cp-rating-h" className="card-title">
                {t("rating.title")}
              </h2>
              {r.ratingChanges.map((rc) => (
                <RatingLine key={rc.skillId} change={rc} skills={props.skills} />
              ))}
              <p className="small muted">{t("checkpoint.ratingNote")}</p>
            </section>
          </div>
          <div className="row-actions">
            {r.passed ? (
              <button type="button" className="btn btn-primary" onClick={() => onRoute(routeOf(props.course.next))}>
                {t("lesson.continue")} <Icon name="arrowRight" />
              </button>
            ) : (
              startBtn
            )}
            <button type="button" className="btn btn-secondary" onClick={() => onRoute(MAP)}>
              {t("course.backToMap")}
            </button>
          </div>
          <Alert message={q.error} />
          <h2 className="level-title">{t("quiz.review")}</h2>
          <ReviewList items={q.quiz?.items ?? []} review={r.review} onRoute={onRoute} />
        </>
      ) : q.quiz ? (
        <QuizRunner quiz={q.quiz} submitting={q.busy} error={q.error} onSubmit={(a) => void q.finish(a)} />
      ) : (
        <Intro
          facts={[
            ["flag", t("checkpoint.fact1")],
            ["chart", t("checkpoint.fact2", { skill: skillName(props.skills, unit.skill) })],
          ]}
          error={q.error}
        >
          {startBtn}
          {unit.progress.checkpointBest !== undefined && <span className="muted">{t("course.cpBest", { pct: tr.percent(unit.progress.checkpointBest) })}</span>}
        </Intro>
      )}
    </div>
  );
}

export function PlacementScreen(props: ScreenProps & { readonly onTraining: () => void }) {
  const { api, course, onRoute } = props;
  const { t } = useI18n();
  const q = useQuiz<PlacementResult>(() => api.startPlacement(), (id, answers) => api.submitPlacement(id, { answers }), props.refresh, course.placement);
  const r = q.result;
  const back = <BackLink label={t("course.backToMap")} onClick={() => onRoute(MAP)} />;
  if (!r)
    return (
      <div className="page quiz-page">
        {back}
        <p className="eyebrow">{t("course.eyebrow")}</p>
        <PageTitle>{t("placement.title")}</PageTitle>
        {q.quiz ? (
          <QuizRunner quiz={q.quiz} submitting={q.busy} error={q.error} onSubmit={(a) => void q.finish(a)} />
        ) : (
          <Intro
            facts={[
              ["spark", t("placement.body")],
              ["clock", t("placement.fact1")],
            ]}
            error={q.error}
          >
            <button type="button" className="btn btn-primary" onClick={() => void q.begin()} disabled={q.busy}>
              <Icon name="play" /> {t("course.placementStart")}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => onRoute(MAP)}>
              {t("common.cancel")}
            </button>
          </Intro>
        )}
      </div>
    );

  const training = r.recommendation === "training";
  const titles = r.unitsPassed.map((id) => course.units.find((u) => u.id === id)?.title ?? id);
  const actions = [
    <button key="c" type="button" className={`btn ${training ? "btn-secondary" : "btn-primary"}`} onClick={() => onRoute(routeOf(course.next))}>
      <Icon name="book" /> {t("placement.toCourse")}
    </button>,
    <button key="t" type="button" className={`btn ${training ? "btn-primary" : "btn-secondary"}`} onClick={props.onTraining}>
      <Icon name="play" /> {t("placement.toTraining")}
    </button>,
  ];
  const score = t("placement.score", { score: r.score, total: r.total });
  return (
    <div className="page quiz-page">
      {back}
      <p className="eyebrow">{t("course.eyebrow")}</p>
      <PageTitle key="result">{t("placement.resultTitle")}</PageTitle>
      <div className="result-top">
        <section className="panel band-card" aria-labelledby="band-h">
          <h2 id="band-h" className="band-label">
            <Icon name="spark" size={22} /> {t(`band.${r.band}`)}
          </h2>
          <p className="strong">{score}</p>
          {titles.length > 0 && <p className="section-label">{t("placement.unitsPassed", { n: titles.length })}</p>}
          <ul className="chips">
            {titles.map((title) => (
              <li key={title} className="chip">
                <Icon name="check" size={14} /> {title}
              </li>
            ))}
          </ul>
        </section>
        <section className="panel recommend-card" aria-labelledby="rec-h">
          <h2 id="rec-h" className="card-title">
            <Icon name="arrowRight" /> {t("placement.recommendTitle")}
          </h2>
          <p>{t(training ? "placement.recTraining" : "placement.recCourse")}</p>
          <div className="row-actions">{training ? actions.reverse() : actions}</div>
        </section>
      </div>
      <Disclosure title={t("quiz.review")} icon="eye" meta={score}>
        <ReviewList items={q.quiz?.items ?? []} review={r.review} onRoute={onRoute} />
      </Disclosure>
    </div>
  );
}
