import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { AnswerResult, ApiClient, CourseView, LessonView } from "@fp/api-contract";
import { errorMessage } from "../api/client.ts";
import type { CourseUnit, LessonBlock, LessonExercise } from "../api/types.ts";
import { lessonTitle, stepAfterLesson } from "../course.ts";
import type { CourseRoute } from "../course.ts";
import { useI18n } from "../i18n/I18n.tsx";
import { CodeBlock } from "../ui/CodeBlock.tsx";
import { Icon } from "../ui/Icon.tsx";
import { Markdown, renderInline } from "../ui/Markdown.tsx";
import { BackLink, PageTitle } from "../ui/PageTitle.tsx";
import { Alert } from "../ui/Status.tsx";

/** Unrated: any number of tries; `revealed` (정답 보기) is not solved. `before`: solved on an earlier visit. */
export interface ExerciseState {
  readonly status: "open" | "solved" | "revealed";
  readonly wrong: readonly number[];
  readonly chosen?: number;
  readonly correctIndex?: number;
  readonly feedback?: string;
  readonly before?: boolean;
}

const OPEN: ExerciseState = { status: "open", wrong: [] };
const resolved = (s: ExerciseState | undefined) => !!s && (s.status !== "open" || !!s.before);

export function applyAnswer(s: ExerciseState, choice: number | null, r: AnswerResult): ExerciseState {
  const next = { ...s, feedback: r.feedback, ...(r.correctIndex !== undefined ? { correctIndex: r.correctIndex } : {}) };
  if (choice === null) return { ...next, status: "revealed" };
  if (r.correct) return { ...next, status: "solved", chosen: choice, correctIndex: r.correctIndex ?? choice };
  return { ...next, chosen: choice, wrong: s.wrong.includes(choice) ? s.wrong : [...s.wrong, choice] };
}

type Mark = "correct" | "wrong" | "selected" | null;
const MARK_ICON = { correct: "checkCircle", wrong: "xCircle", selected: "check" } as const;

/** One answer choice: a button (lesson, quiz) or static (review). The mark is always icon + label. */
type ChoiceProps = { i: number; text: string; mark: Mark; mine?: boolean; pressed?: boolean; disabled?: boolean; onClick?: () => void };

export function Choice(props: Readonly<ChoiceProps>) {
  const { t } = useI18n();
  const { mark, onClick } = props;
  const label = [mark === "selected" ? t("quiz.selected") : mark ? t(mark === "correct" ? "feedback.correct" : "choice.wrong") : "", props.mine ? t("quiz.mine") : ""].filter(Boolean).join(" · ");
  const body = (
    <>
      <span className="choice-key mono" aria-hidden="true">
        {"ABCDEFGH"[props.i]}
      </span>
      <span className="choice-text">{renderInline(props.text)}</span>{" "}
      {mark && (
        <span className="choice-mark">
          <Icon name={MARK_ICON[mark]} size={16} /> {label}
        </span>
      )}
    </>
  );
  const cls = `choice${mark ? ` is-${mark}` : ""}`;
  if (!onClick) return <div className={`${cls} is-static`}>{body}</div>;
  return (
    <button type="button" className={cls} aria-pressed={props.pressed} aria-disabled={props.disabled || undefined} onClick={() => !props.disabled && onClick()}>
      {body}
    </button>
  );
}

export function ItemHead({ id, item, extra }: Readonly<{ id: string; item: Readonly<{ type: string; prompt: string; code?: string }>; extra?: ReactNode }>) {
  const { t } = useI18n();
  return (
    <>
      <p className="exercise-top">
        <span className="chip chip-small">{t(item.type === "predict" ? "kind.predict" : "lesson.typeChoice")}</span>
        {extra}
      </p>
      <h2 id={id} className="exercise-prompt">
        {renderInline(item.prompt)}
      </h2>
      {item.code && <CodeBlock code={item.code} label={t("lesson.code")} />}
    </>
  );
}

type PlayerProps = { api: ApiClient; course: CourseView; unit: CourseUnit; lessonId: string; focus?: string | undefined; contentKey: number; onRoute: (r: CourseRoute) => void; refresh: () => Promise<CourseView> };

export function LessonPlayer(props: Readonly<PlayerProps>) {
  const { api, unit, lessonId, focus } = props;
  const tr = useI18n();
  const { t } = tr;
  const [view, setView] = useState<LessonView | string | null>(null);
  const [ex, setEx] = useState<Readonly<Record<string, ExerciseState>>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<{ readonly id: string; readonly message: string } | null>(null);
  const loaded = useRef(false);

  // A language switch refetches the lesson text and keeps the learner's answers (feedback stays as given).
  useEffect(() => {
    let alive = true;
    api.lesson(unit.id, lessonId).then(
      (v) => {
        if (!alive) return;
        if (!loaded.current) setEx(Object.fromEntries(v.solved.map((id) => [id, { ...OPEN, before: true }])));
        loaded.current = true;
        setView(v);
      },
      (e: unknown) => alive && !loaded.current && setView(errorMessage(e, tr)),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, unit.id, lessonId, props.contentKey]);

  const ready = typeof view === "object" && view !== null;
  useEffect(() => {
    if (ready && focus) document.getElementById(`ex-${focus}`)?.focus();
  }, [ready, focus]);

  const back = <BackLink label={unit.title} onClick={() => props.onRoute({ screen: "unit", unitId: unit.id })} />;
  if (!ready)
    return (
      <div className="page lesson">
        {back}
        {view === null ? (
          <p className="page-status" role="status">
            {t("common.loading")}
          </p>
        ) : (
          <Alert message={view} />
        )}
      </div>
    );

  const { lesson, completed } = view;
  const exercises = lesson.blocks.filter((b): b is LessonExercise => b.kind === "exercise");
  // Blocks appear up to the first unresolved exercise; a completed lesson or a backlink shows them all.
  const visible: LessonBlock[] = [];
  for (const b of lesson.blocks) {
    visible.push(b);
    if (!completed && !focus && b.kind === "exercise" && !resolved(ex[b.id])) break;
  }
  const current = exercises.find((e) => !resolved(ex[e.id]))?.id;
  const after = stepAfterLesson(props.course, unit.id, lessonId);
  const afterUnit = "unitId" in after ? props.course.units.find((u) => u.id === after.unitId) : undefined;
  const nextLabel =
    after.screen === "lesson" && afterUnit
      ? t("lesson.nextLesson", { title: lessonTitle(afterUnit, after.lessonId) })
      : t(after.screen === "checkpoint" ? "lesson.nextCheckpoint" : "course.backToMap");

  const answer = async (id: string, choice: number | null) => {
    setPending(id);
    setError(null);
    try {
      const r = await api.lessonAnswer(unit.id, lessonId, choice === null ? { exerciseId: id, choice, giveUp: true } : { exerciseId: id, choice });
      setEx((prev) => ({ ...prev, [id]: applyAnswer(prev[id] ?? OPEN, choice, r) }));
    } catch (e) {
      setError({ id, message: errorMessage(e, tr) });
    } finally {
      setPending(null);
    }
  };

  const complete = async () => {
    setPending("complete");
    setError(null);
    try {
      if (!completed) await api.lessonComplete(unit.id, lessonId);
      props.onRoute(stepAfterLesson(await props.refresh(), unit.id, lessonId));
    } catch (e) {
      setError({ id: "complete", message: errorMessage(e, tr) });
      setPending(null);
    }
  };

  return (
    <div className="page lesson">
      {back}
      <div className="lesson-head">
        <div>
          <p className="eyebrow">{t("lesson.position", { n: unit.lessonIds.indexOf(lessonId) + 1, total: unit.lessonIds.length })}</p>
          <PageTitle focus={!focus}>{lesson.title}</PageTitle>
        </div>
        <div className="lesson-progress">
          <ol className="dots plain-list" aria-hidden="true">
            {exercises.map((e) => {
              const s = ex[e.id];
              const state = s?.status === "revealed" ? "revealed" : resolved(s) ? "solved" : e.id === current ? "current" : "todo";
              return <li key={e.id} className={`dot is-${state}`}>{state === "solved" ? <Icon name="check" size={12} /> : state === "revealed" && <Icon name="eye" size={12} />}</li>;
            })}
          </ol>
          <span className="small muted">
            {t("lesson.solvedCount", { n: exercises.filter((e) => ex[e.id]?.status === "solved" || ex[e.id]?.before).length, total: exercises.length })}
          </span>
        </div>
      </div>
      {visible.map((b) =>
        b.kind === "prose" ? (
          <Markdown key={b.id} source={b.markdown} className="lesson-prose" />
        ) : (
          <ExerciseCard key={b.id} block={b} n={exercises.indexOf(b) + 1} total={exercises.length} state={ex[b.id] ?? OPEN} pending={pending !== null} error={error?.id === b.id ? error.message : null} onAnswer={(c) => void answer(b.id, c)} />
        ),
      )}
      {(completed || exercises.every((e) => resolved(ex[e.id]))) && (
        <section className="lesson-done panel" aria-labelledby="lesson-done-h">
          <h2 id="lesson-done-h" className="card-title">
            <Icon name="flag" /> {t(completed ? "lesson.alreadyDone" : "lesson.allResolved")}
          </h2>
          <p className="muted">{nextLabel}</p>
          <button type="button" className="btn btn-primary" onClick={() => void complete()} disabled={pending !== null}>
            {t(completed ? "lesson.continue" : "lesson.complete")} <Icon name="arrowRight" />
          </button>
          <Alert message={error?.id === "complete" ? error.message : null} />
        </section>
      )}
    </div>
  );
}

type CardProps = { block: LessonExercise; n: number; total: number; state: ExerciseState; pending: boolean; error: string | null; onAnswer: (choice: number | null) => void };

function ExerciseCard(props: Readonly<CardProps>) {
  const { block, state: s } = props;
  const { t } = useI18n();
  const closed = s.status !== "open";
  const shown = closed || (s.chosen !== undefined && s.wrong.includes(s.chosen));
  const tone = s.status === "solved" ? "correct" : s.status === "revealed" ? "revealed" : "wrong";
  return (
    <section id={`ex-${block.id}`} tabIndex={-1} className={`exercise panel is-${s.status}`} aria-labelledby={`ex-${block.id}-h`}>
      <ItemHead
        id={`ex-${block.id}-h`}
        item={block}
        extra={
          <>
            <span className="small muted">{t("lesson.exerciseNo", { n: props.n, total: props.total })}</span>
            {s.before && !closed && (
              <span className="status status-pass small">
                <Icon name="checkCircle" size={16} /> {t("lesson.solvedBefore")}
              </span>
            )}
          </>
        }
      />
      <ul className="choices plain-list">
        {block.choices.map((c, i) => (
          <li key={i}>
            <Choice i={i} text={c} mark={i === s.correctIndex ? "correct" : s.wrong.includes(i) ? "wrong" : null} disabled={closed || props.pending} onClick={() => props.onAnswer(i)} />
          </li>
        ))}
      </ul>
      <div role="status">
        {shown && (
          <div className={`exercise-feedback is-${tone}`}>
            <p className="exercise-feedback-title">
              <Icon name={tone === "correct" ? "checkCircle" : tone === "revealed" ? "eye" : "xCircle"} /> {t(`lesson.${tone}`)}
            </p>
            {s.feedback && <Markdown source={s.feedback} />}
            {tone !== "correct" && <p className="small muted">{t(tone === "revealed" ? "lesson.revealedNote" : "lesson.retryNote")}</p>}
          </div>
        )}
      </div>
      <Alert message={props.error} />
      {!closed && (
        <p className="exercise-actions">
          <button type="button" className="btn btn-quiet btn-small" onClick={() => props.onAnswer(null)} disabled={props.pending}>
            <Icon name="eye" size={16} /> {t("lesson.giveUp")}
          </button>
          <span className="small muted">{t("lesson.giveUpNote")}</span>
        </p>
      )}
    </section>
  );
}
