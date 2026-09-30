import { useEffect, useState } from "react";
import type { ApiClient, ProgressView, SessionSummary } from "@fp/api-contract";
import { errorMessage } from "../api/client.ts";
import { Icon } from "../ui/Icon.tsx";
import { RangeAxis, RangeBar } from "../ui/RangeBar.tsx";
import { errorTagLabel, formatDate, relativeDay, skillName } from "../ui/labels.ts";

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
}) {
  const [data, setData] = useState<ProgressView | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    props.api.progress("gleam").then(
      (p) => alive && setData(p),
      (e: unknown) => alive && setError(errorMessage(e)),
    );
    return () => {
      alive = false;
    };
  }, [props.api]);

  if (error)
    return (
      <p className="inline-error page-status" role="alert">
        {error}
      </p>
    );
  if (!data)
    return (
      <p className="page-status" role="status">
        진행 현황을 불러오는 중입니다...
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
          <h1 className="page-title">진행 현황</h1>
        </div>
        {props.hasActiveSession ? (
          <button type="button" className="btn btn-primary" onClick={props.onResume}>
            진행 중인 세션으로 <Icon name="arrowRight" />
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={props.onStart} disabled={props.busy}>
            <Icon name="play" /> {props.busy ? "세션 준비 중..." : "15분 세션 시작"}
          </button>
        )}
      </div>

      <div className="progress-top">
        <section className="panel overall-tile" aria-labelledby="overall-h">
          <h2 id="overall-h" className="card-title">
            전체 레이팅
          </h2>
          {profile.overall ? (
            <>
              <p className="overall-value">
                <span className="mono">{Math.round(profile.overall.rating)}</span>
                {profile.overall.provisional && <span className="badge-provisional">잠정</span>}
              </p>
              <p className="muted small">기술별 레이팅을 레이팅에 반영된 관찰 수로 가중 평균했습니다. 관찰이 충분히 쌓이면 잠정 표시가 사라집니다.</p>
            </>
          ) : (
            <p className="muted">아직 반영된 제출이 없습니다. 첫 세션을 마치면 표시됩니다.</p>
          )}
        </section>
        <section className="panel rules-tile" aria-labelledby="rules-h">
          <h2 id="rules-h" className="card-title">
            <Icon name="help" /> 레이팅 반영 기준
          </h2>
          <ul className="plain-list rules-list">
            <li>문제마다 첫 제출만 반영합니다. 재제출은 기록으로 남습니다.</li>
            <li>힌트 1~2단계는 반영에 영향이 없고, 3단계 이상이나 해설을 본 뒤의 제출은 반영하지 않습니다.</li>
            <li>코드 품질 점검은 정답 판정과 레이팅에 반영하지 않습니다.</li>
          </ul>
          <p className="muted small">정책 버전 <span className="mono">{profile.policyVersion}</span></p>
        </section>
      </div>

      <section className="panel skills-card" aria-labelledby="skills-h">
        <div className="card-head">
          <h2 id="skills-h" className="card-title">
            <Icon name="chart" /> 기술별 레이팅
          </h2>
          <p className="legend small muted">
            <span className="legend-band" aria-hidden="true" /> 추정 범위 (± 불확실성)
            <span className="legend-dot" aria-hidden="true" /> 현재 레이팅
          </p>
        </div>
        {estimates.length === 0 ? (
          <p className="muted">아직 레이팅이 없습니다. 세션에서 첫 제출을 하면 기술별 추정이 시작됩니다.</p>
        ) : (
          <table className="skills-table">
            <thead>
              <tr>
                <th scope="col">기술</th>
                <th scope="col" className="num">
                  레이팅
                </th>
                <th scope="col" className="num">
                  관찰
                </th>
                <th scope="col" className="range-col">
                  <RangeAxis />
                  <span className="sr-only">추정 범위 (1000에서 1800 척도)</span>
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
                      {e.provisional && <span className="badge-provisional">잠정</span>}
                    </th>
                    <td className="num mono">
                      <span className="strong">{Math.round(e.rating)}</span> <span className="muted">±{Math.round(e.deviation)}</span>
                    </td>
                    <td className="num mono muted">{e.ratedObservations}회</td>
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
            <Icon name="calendar" /> 복습 일정
          </h2>
          {reviews.length === 0 ? (
            <p className="muted small">예정된 복습이 없습니다.</p>
          ) : (
            <ul className="plain-list review-list">
              {reviews.map((r) => {
                const due = Date.parse(r.dueAt) <= nowMs;
                return (
                  <li key={r.skillId}>
                    <span className="strong">{skillName(skills, r.skillId)}</span>
                    <span className={due ? "due-now" : "muted"}>
                      {due && <Icon name="clock" size={16} />} {formatDate(r.dueAt)} ({relativeDay(r.dueAt, nowMs)})
                    </span>
                    <span className="muted small">간격 {r.intervalDays}일</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section className="panel" aria-labelledby="tags-h">
          <h2 id="tags-h" className="card-title">
            <Icon name="tag" /> 반복되는 실수
          </h2>
          {tags.length === 0 ? (
            <p className="muted small">기록된 실수 유형이 없습니다.</p>
          ) : (
            <ul className="plain-list tag-list">
              {tags.map((t) => (
                <li key={t.tag}>
                  <span>{errorTagLabel(t.tag)}</span>
                  <span className="mono">{t.count}회</span>
                  <span className="muted small">
                    {t.lastResolvedAt ? `${formatDate(t.lastResolvedAt)} 해결` : `마지막 발생: ${relativeDay(t.lastSeenAt, nowMs)}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="panel" aria-labelledby="recent-h">
          <h2 id="recent-h" className="card-title">
            <Icon name="flag" /> 최근 세션
          </h2>
          {props.recent.length === 0 ? (
            <p className="muted small">이 브라우저에서 마친 세션이 아직 없습니다.</p>
          ) : (
            <ul className="plain-list">
              {props.recent.map((r) => (
                <li key={r.summary.sessionId}>
                  <span>{formatDate(r.completedAt)}</span>
                  <span>
                    통과 <span className="mono">{r.summary.passed}</span> · 미통과 <span className="mono">{r.summary.failed}</span>
                  </span>
                  <span className="muted small">피드백 후 해결 {r.summary.fixedAfterFeedback}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
