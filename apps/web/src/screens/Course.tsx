import { useCallback, useEffect, useState } from "react";
import type { ApiClient, CourseView, Skill } from "@fp/api-contract";
import { errorMessage } from "../api/client.ts";
import type { CourseUnit } from "../api/types.ts";
import { MAP, lessonTitle, routeOf, unitsByLevel } from "../course.ts";
import type { CourseRoute } from "../course.ts";
import { useI18n } from "../i18n/I18n.tsx";
import { Icon } from "../ui/Icon.tsx";
import { BackLink, PageTitle } from "../ui/PageTitle.tsx";
import { Alert } from "../ui/Status.tsx";
import { skillName } from "../ui/labels.ts";
import { LessonPlayer } from "./Lesson.tsx";
import { CheckpointScreen, PlacementScreen } from "./Quiz.tsx";

export interface CourseProps {
  readonly api: ApiClient;
  readonly skills: readonly Skill[];
  readonly route: CourseRoute;
  readonly onRoute: (r: CourseRoute) => void;
  readonly onTraining: () => void;
  /** Changes after a language switch: the course and the open lesson are fetched again. */
  readonly contentKey?: number;
}

/** The "강의" tab: course map, unit, lesson player, checkpoint and placement. Holds the CourseView. */
export function Course(props: CourseProps) {
  const { api, route, onRoute } = props;
  const tr = useI18n();
  const [course, setCourse] = useState<CourseView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    api.course().then(
      (c) => {
        if (!alive) return;
        setError(null);
        setCourse(c);
      },
      (e: unknown) => alive && setError(errorMessage(e, tr)),
    );
    return () => {
      alive = false;
    };
    // contentKey: refetch in the new language. tr is read only for the error text.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, props.contentKey, attempt]);
  const refresh = useCallback(async () => {
    const c = await api.course();
    setCourse(c);
    return c;
  }, [api]);

  if (!course)
    return error ? (
      <div className="center-card panel">
        <Alert message={error} />
        <button type="button" className="btn btn-secondary" onClick={() => setAttempt((n) => n + 1)}>
          <Icon name="refresh" /> {tr.t("common.retry")}
        </button>
      </div>
    ) : (
      <p className="page-status" role="status">
        {tr.t("common.loading")}
      </p>
    );

  const unit = "unitId" in route ? course.units.find((u) => u.id === route.unitId) : undefined;
  const shared = { api, course, onRoute, refresh };
  if (route.screen === "placement") return <PlacementScreen {...shared} onTraining={props.onTraining} />;
  if (!unit || route.screen === "map") return <CourseMap course={course} onRoute={onRoute} />;
  if (route.screen === "unit") return <UnitView key={unit.id} unit={unit} course={course} skills={props.skills} onRoute={onRoute} />;
  if (route.screen === "checkpoint") return <CheckpointScreen key={unit.id} {...shared} unit={unit} skills={props.skills} />;
  return <LessonPlayer key={`${unit.id}/${route.lessonId}`} {...shared} unit={unit} lessonId={route.lessonId} focus={route.focus} contentKey={props.contentKey ?? 0} />;
}

function CourseMap({ course, onRoute }: { readonly course: CourseView; readonly onRoute: (r: CourseRoute) => void }) {
  const { t } = useI18n();
  const { next, placement: p, units } = course;
  const nextUnit = next.kind === "done" ? undefined : units.find((u) => u.id === next.unitId);
  return (
    <div className="page course">
      <div className="page-head">
        <div>
          <p className="eyebrow">{t("course.eyebrow")}</p>
          <PageTitle>{t("course.title")}</PageTitle>
        </div>
        {nextUnit && next.kind !== "done" ? (
          <button type="button" className="btn btn-primary" onClick={() => onRoute(routeOf(next))}>
            <Icon name="play" />
            {next.kind === "lesson" ? t("course.continueLesson", { title: lessonTitle(nextUnit, next.lessonId) }) : t("course.continueCheckpoint", { unit: nextUnit.title })}
          </button>
        ) : (
          <p className="status status-pass">
            <Icon name="checkCircle" /> {t("course.allDone")}
          </p>
        )}
      </div>
      {p === null ? (
        <section className="placement-cta" aria-labelledby="placement-cta-h">
          <Icon name="spark" size={28} />
          <div>
            <h2 id="placement-cta-h">{t("course.placementCta")}</h2>
            <p className="muted">{t("course.placementCtaBody")}</p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => onRoute({ screen: "placement" })}>
            {t("course.placementStart")} <Icon name="arrowRight" />
          </button>
        </section>
      ) : (
        <p className="placement-done">
          <Icon name="spark" /> {t("course.placementDone", { band: t(`band.${p.band}`), score: p.score, total: p.total, n: p.unitsPassed.length })}
          <button type="button" className="btn btn-ghost btn-small" onClick={() => onRoute({ screen: "placement" })}>
            {t("placement.resultTitle")}
          </button>
        </p>
      )}
      {unitsByLevel(units).map(([level, list]) => (
        <section key={level} aria-labelledby={`level-${level}`}>
          <h2 id={`level-${level}`} className="level-title">
            {t("course.level", { n: level })}
          </h2>
          <ul className="unit-grid plain-list">
            {list.map((u) => (
              <li key={u.id}>
                <UnitCard unit={u} isNext={nextUnit?.id === u.id} onOpen={() => onRoute({ screen: "unit", unitId: u.id })} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

const unitNo = (u: CourseUnit) => String(u.order).padStart(2, "0");

/** Locked units (prerequisite checkpoints not passed) carry a badge but stay openable. */
function UnitCard({ unit, isNext, onOpen }: { readonly unit: CourseUnit; readonly isNext: boolean; readonly onOpen: () => void }) {
  const { t } = useI18n();
  const done = unit.progress.lessonsCompleted.length;
  const total = unit.lessonIds.length;
  return (
    <article className={`panel unit-card${isNext ? " is-next" : ""}`}>
      <p className="unit-card-top">
        <span className="mono small muted">{t("course.unitNo", { n: unitNo(unit) })}</span>
        {isNext && <span className="chip chip-small chip-accent">{t("course.nextChip")}</span>}
        {!unit.progress.unlocked && (
          <span className="chip chip-small chip-locked">
            <Icon name="lock" size={13} /> {t("course.locked")}
          </span>
        )}
      </p>
      <h3 className="unit-card-title">
        <button type="button" className="stretched" onClick={onOpen}>
          {unit.title}
        </button>
      </h3>
      <p className="small muted">{t("course.lessonsDone", { done, total })}</p>
      <div className="meter" aria-hidden="true">
        <span style={{ width: `${(done / Math.max(total, 1)) * 100}%` }} />
      </div>
      <CheckpointStatus unit={unit} />
    </article>
  );
}

function CheckpointStatus({ unit: { progress: p } }: { readonly unit: CourseUnit }) {
  const tr = useI18n();
  if (p.checkpointPassed)
    return (
      <p className="status status-pass small">
        <Icon name="checkCircle" size={16} /> {tr.t(p.passedByPlacement ? "course.cpByPlacement" : "course.cpPassed")}
      </p>
    );
  return (
    <p className="small muted">
      <Icon name="flag" size={16} /> {p.checkpointBest === undefined ? tr.t("course.cpNotTaken") : tr.t("course.cpBest", { pct: tr.percent(p.checkpointBest) })}
    </p>
  );
}

function UnitView(props: { readonly unit: CourseUnit; readonly course: CourseView; readonly skills: readonly Skill[]; readonly onRoute: (r: CourseRoute) => void }) {
  const { unit, onRoute } = props;
  const tr = useI18n();
  const { t } = tr;
  const p = unit.progress;
  const nextLesson = unit.lessonIds.find((l) => !p.lessonsCompleted.includes(l));
  const prereqs = unit.prerequisites.map((id) => props.course.units.find((u) => u.id === id)?.title ?? id);
  return (
    <div className="page course-unit">
      <BackLink label={t("course.backToMap")} onClick={() => onRoute(MAP)} />
      <p className="eyebrow">{[t("course.level", { n: unit.level }), t("course.unitNo", { n: unitNo(unit) }), skillName(props.skills, unit.skill)].join(" · ")}</p>
      <PageTitle>{unit.title}</PageTitle>
      {!p.unlocked && (
        <p className="notice">
          <Icon name="lock" /> {t("course.lockedNotice", { units: tr.list(prereqs) })}
        </p>
      )}
      <ol className="lesson-list plain-list panel">
        {unit.lessonIds.map((id, i) => (
          <li key={id} className="lesson-row">
            <span className="mono muted">{i + 1}</span>
            <button type="button" className="link-btn" onClick={() => onRoute({ screen: "lesson", unitId: unit.id, lessonId: id })}>
              {unit.lessonTitles[i]}
            </button>
            {p.lessonsCompleted.includes(id) ? (
              <span className="status status-pass small">
                <Icon name="check" size={16} /> {t("course.lessonDone")}
              </span>
            ) : (
              id === nextLesson && <span className="chip chip-small chip-accent">{t("course.nextChip")}</span>
            )}
          </li>
        ))}
        <li className="lesson-row">
          <Icon name="flag" />
          <span className="strong">{t("course.checkpoint")}</span>
          <CheckpointStatus unit={unit} />
          <button type="button" className="btn btn-secondary btn-small" onClick={() => onRoute({ screen: "checkpoint", unitId: unit.id })}>
            {t(p.checkpointPassed ? "common.retry" : "course.cpStart")}
          </button>
        </li>
      </ol>
    </div>
  );
}
