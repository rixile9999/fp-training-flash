import { useEffect, useState } from "react";
import type { ApiClient, ProgressView, SessionSummary } from "@fp/api-contract";
import { errorMessage } from "../api/client.ts";
import { useI18n } from "../i18n/I18n.tsx";
import { Icon } from "../ui/Icon.tsx";
import { RangeAxis, RangeBar } from "../ui/RangeBar.tsx";
import { errorTagLabel, skillName } from "../ui/labels.ts";

export interface RecentSession {
  readonly completedAt: string;
  readonly summary: SessionSummary;
}

export function Progress(props: {
  readonly api: ApiClient;
  readonly now: () => number;
  readonly recent: readonly RecentSession[];
  readonly hasActiveSession: boolean;
  readonly onStart: () => void;
  readonly onResume: () => void;
  readonly busy: boolean;
  /** Changes after a language switch: the progress view (skill names, ...) is fetched again. */
  readonly contentKey?: number;
}) {
  const tr = useI18n();
  const { t } = tr;
  const [data, setData] = useState<ProgressView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const contentKey = props.contentKey ?? 0;
  useEffect(() => {
    let alive = true;
    props.api.progress("gleam").then(
      (p) => {
        if (!alive) return;
        setError(null);
        setData(p);
      },
      (e: unknown) => alive && setError(errorMessage(e, tr)),
    );
    return () => {
      alive = false;
    };
    // contentKey: refetch in the new language. tr is read only for the error text.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.api, contentKey]);

  if (error)
    return (
      <p className="inline-error page-status" role="alert">
        {error}
      </p>
    );
  if (!data)
    return (
      <p className="page-status" role="status">
        {t("progress.loading")}
      </p>
    );
  const { profile, skills } = data;
  const nowMs = props.now();
  const estimates = [...profile.estimates].sort(
    (a, b) => (skills.find((s) => s.id === a.skillId)?.order ?? 99) - (skills.find((s) => s.id === b.skillId)?.order ?? 99),
  );
  const reviews = [...profile.reviews].sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
  const tags = [...profile.errorTags].sort((a, b) => b.count - a.count);

  return (
    <div className="progress">
      <div className="page-head">
        <div>
          <p className="eyebrow">Gleam · Erlang</p>
          <h1 className="page-title">{t("progress.title")}</h1>
        </div>
        {props.hasActiveSession ? (
          <button type="button" className="btn btn-primary" onClick={props.onResume}>
            {t("progress.resume")} <Icon name="arrowRight" />
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={props.onStart} disabled={props.busy}>
            <Icon name="play" /> {props.busy ? t("start.preparing") : t("start.button")}
          </button>
        )}
      </div>

      <div className="progress-top">
        <section className="panel overall-tile" aria-labelledby="overall-h">
          <h2 id="overall-h" className="card-title">
            {t("progress.overall")}
          </h2>
          {profile.overall ? (
            <>
              <p className="overall-value">
                <span className="mono">{Math.round(profile.overall.rating)}</span>
                {profile.overall.provisional && <span className="badge-provisional">{t("common.provisional")}</span>}
              </p>
              <p className="muted small">{t("progress.overallNote")}</p>
            </>
          ) : (
            <p className="muted">{t("progress.overallEmpty")}</p>
          )}
        </section>
        <section className="panel rules-tile" aria-labelledby="rules-h">
          <h2 id="rules-h" className="card-title">
            <Icon name="help" /> {t("progress.rules")}
          </h2>
          <ul className="plain-list rules-list">
            <li>{t("progress.rule1")}</li>
            <li>{t("progress.rule2")}</li>
            <li>{t("progress.rule3")}</li>
          </ul>
          <p className="muted small">{t("progress.policyVersion")} <span className="mono">{profile.policyVersion}</span></p>
        </section>
      </div>

      <section className="panel skills-card" aria-labelledby="skills-h">
        <div className="card-head">
          <h2 id="skills-h" className="card-title">
            <Icon name="chart" /> {t("progress.skills")}
          </h2>
          <p className="legend small muted">
            <span className="legend-band" aria-hidden="true" /> {t("progress.legendRange")}
            <span className="legend-dot" aria-hidden="true" /> {t("progress.legendDot")}
          </p>
        </div>
        {estimates.length === 0 ? (
          <p className="muted">{t("progress.skillsEmpty")}</p>
        ) : (
          <table className="skills-table">
            <thead>
              <tr>
                <th scope="col">{t("progress.colSkill")}</th>
                <th scope="col" className="num">
                  {t("progress.colRating")}
                </th>
                <th scope="col" className="num">
                  {t("progress.colObservations")}
                </th>
                <th scope="col" className="range-col">
                  <RangeAxis />
                  <span className="sr-only">{t("progress.colRangeSr")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {estimates.map((e) => {
                const name = skillName(skills, e.skillId);
                return (
                  <tr key={e.skillId}>
                    <th scope="row" className="skill-name">
                      {name}
                      {e.provisional && <span className="badge-provisional">{t("common.provisional")}</span>}
                    </th>
                    <td className="num mono">
                      <span className="strong">{Math.round(e.rating)}</span> <span className="muted">±{Math.round(e.deviation)}</span>
                    </td>
                    <td className="num mono muted">{t("progress.times", { n: e.ratedObservations })}</td>
                    <td className="range-col">
                      <RangeBar skill={name} rating={e.rating} deviation={e.deviation} provisional={e.provisional} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <div className="progress-bottom">
        <section className="panel" aria-labelledby="reviews-h">
          <h2 id="reviews-h" className="card-title">
            <Icon name="calendar" /> {t("progress.reviews")}
          </h2>
          {reviews.length === 0 ? (
            <p className="muted small">{t("progress.reviewsEmpty")}</p>
          ) : (
            <ul className="plain-list review-list">
              {reviews.map((r) => {
                const due = Date.parse(r.dueAt) <= nowMs;
                return (
                  <li key={r.skillId}>
                    <span className="strong">{skillName(skills, r.skillId)}</span>
                    <span className={due ? "due-now" : "muted"}>
                      {due && <Icon name="clock" size={16} />} {tr.date(r.dueAt)} ({tr.relativeDay(r.dueAt, nowMs)})
                    </span>
                    <span className="muted small">{t("progress.interval", { n: r.intervalDays })}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section className="panel" aria-labelledby="tags-h">
          <h2 id="tags-h" className="card-title">
            <Icon name="tag" /> {t("progress.tags")}
          </h2>
          {tags.length === 0 ? (
            <p className="muted small">{t("progress.tagsEmpty")}</p>
          ) : (
            <ul className="plain-list tag-list">
              {tags.map((tag) => (
                <li key={tag.tag}>
                  <span>{errorTagLabel(tr, tag.tag)}</span>
                  <span className="mono">{t("progress.times", { n: tag.count })}</span>
                  <span className="muted small">
                    {tag.lastResolvedAt ? t("progress.resolvedOn", { date: tr.date(tag.lastResolvedAt) }) : t("progress.lastSeen", { when: tr.relativeDay(tag.lastSeenAt, nowMs) })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="panel" aria-labelledby="recent-h">
          <h2 id="recent-h" className="card-title">
            <Icon name="flag" /> {t("progress.recent")}
          </h2>
          {props.recent.length === 0 ? (
            <p className="muted small">{t("progress.recentEmpty")}</p>
          ) : (
            <ul className="plain-list">
              {props.recent.map((r) => (
                <li key={r.summary.sessionId}>
                  <span>{tr.date(r.completedAt)}</span>
                  <span>
                    {t("summary.passed")} <span className="mono">{r.summary.passed}</span> · {t("summary.failed")} <span className="mono">{r.summary.failed}</span>
                  </span>
                  <span className="muted small">{t("progress.fixedAfter", { n: r.summary.fixedAfterFeedback })}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
