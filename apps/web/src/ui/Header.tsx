import { useEffect, useState } from "react";
import type { Session } from "@fp/api-contract";
import { STEPS, stepStates } from "../session.ts";
import type { Phase } from "../session.ts";
import { Brand } from "./Brand.tsx";
import { Icon } from "./Icon.tsx";
import { formatClock } from "./labels.ts";

export type View = "training" | "progress";

export function Header(props: {
  readonly displayName: string;
  readonly view: View;
  readonly onNav: (v: View) => void;
  readonly onLogout: () => void;
  readonly session: Session | null | undefined;
  readonly activeIndex: number | null;
  readonly phase: Phase;
  readonly completed: boolean;
  readonly now: () => number;
}) {
  const { session } = props;
  const showSession = !!session && (session.status === "active" || props.completed);
  return (
    <header className="app-header">
      <div className="header-left">
        <Brand />
        <span className="lang-chip">Gleam · Erlang</span>
      </div>
      {showSession && session && <Stepper session={session} activeIndex={props.activeIndex} phase={props.phase} completed={props.completed} />}
      <div className="header-right">
        {showSession && session && !props.completed && <Timer startedAt={session.startedAt} targetMinutes={session.targetMinutes} now={props.now} />}
        <nav aria-label="주 메뉴" className="main-nav">
          {(
            [
              ["training", "훈련"],
              ["progress", "진행 현황"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`nav-link${props.view === key ? " is-active" : ""}`}
              aria-current={props.view === key ? "page" : undefined}
              onClick={() => props.onNav(key)}
            >
              {label}
            </button>
          ))}
        </nav>
        <span className="user-name" title={props.displayName}>
          {props.displayName}
        </span>
        <button type="button" className="icon-btn" onClick={props.onLogout} aria-label="로그아웃">
          <Icon name="logout" />
        </button>
      </div>
    </header>
  );
}

function Stepper(props: { readonly session: Session; readonly activeIndex: number | null; readonly phase: Phase; readonly completed: boolean }) {
  const states = stepStates(props.session, props.activeIndex, props.phase, props.completed);
  return (
    <ol className="stepper" aria-label="세션 단계">
      {STEPS.map((s, i) => {
        const st = states[s.key];
        return (
          <li key={s.key} className={`step step-${st}`} aria-current={st === "current" ? "step" : undefined}>
            <span className="step-mark" aria-hidden="true">
              {st === "done" ? <Icon name="check" size={14} /> : i + 1}
            </span>
            <span className="step-label">{s.label}</span>
            {st === "done" && <span className="sr-only">(완료)</span>}
          </li>
        );
      })}
    </ol>
  );
}

function Timer({ startedAt, targetMinutes, now }: { readonly startedAt: string; readonly targetMinutes: number; readonly now: () => number }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const elapsed = now() - Date.parse(startedAt);
  const over = elapsed > targetMinutes * 60_000;
  return (
    <span className={`timer${over ? " is-over" : ""}`} role="timer" aria-label={`경과 시간 ${formatClock(elapsed)}, 목표 ${targetMinutes}분`}>
      <Icon name="clock" size={16} />
      <span className="mono">{formatClock(elapsed)}</span>
      <span className="muted mono">/ {String(targetMinutes).padStart(2, "0")}:00</span>
    </span>
  );
}
