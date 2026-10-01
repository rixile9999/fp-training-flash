import { useEffect, useState } from "react";
import type { Session } from "@fp/api-contract";
import { useI18n } from "../i18n/I18n.tsx";
import type { Locale } from "../i18n/locale.ts";
import { STEPS, stepStates } from "../session.ts";
import type { Phase } from "../session.ts";
import { Brand } from "./Brand.tsx";
import { Icon } from "./Icon.tsx";
import { LanguageSwitcher } from "./LanguageSwitcher.tsx";
import { formatClock } from "./labels.ts";

export type View = "course" | "training" | "progress";

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
  readonly locale: Locale;
  readonly onLocale: (locale: Locale) => void;
}) {
  const { session } = props;
  const { t } = useI18n();
  const showSession = !!session && (session.status === "active" || props.completed);
  return (
    <header className="app-header">
      <div className="header-left">
        <Brand />
        <span className="lang-chip">Gleam · Erlang</span>
      </div>
      <div className="stepper-slot">
        {showSession && session && <Stepper session={session} activeIndex={props.activeIndex} phase={props.phase} completed={props.completed} />}
      </div>
      <div className="header-right">
        {showSession && session && !props.completed && <Timer startedAt={session.startedAt} targetMinutes={session.targetMinutes} now={props.now} />}
        <nav aria-label={t("header.mainNav")} className="main-nav">
          {(
            [
              ["course", t("nav.course")],
              ["training", t("nav.training")],
              ["progress", t("nav.progress")],
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
        <LanguageSwitcher variant="select" locale={props.locale} onChange={props.onLocale} />
        <span className="user-name" title={props.displayName}>
          {props.displayName}
        </span>
        <button type="button" className="icon-btn" onClick={props.onLogout} aria-label={t("header.logout")}>
          <Icon name="logout" />
        </button>
      </div>
    </header>
  );
}

function Stepper(props: { readonly session: Session; readonly activeIndex: number | null; readonly phase: Phase; readonly completed: boolean }) {
  const { t } = useI18n();
  const states = stepStates(props.session, props.activeIndex, props.phase, props.completed);
  return (
    <ol className="stepper" aria-label={t("header.steps")}>
      {STEPS.map((s, i) => {
        const st = states[s.key];
        return (
          <li key={s.key} className={`step step-${st}`} aria-current={st === "current" ? "step" : undefined}>
            <span className="step-mark" aria-hidden="true">
              {st === "done" ? <Icon name="check" size={14} /> : i + 1}
            </span>
            <span className="step-label">{t(`step.${s.key}`)}</span>
            {st === "done" && <span className="sr-only">{t("common.doneSr")}</span>}
          </li>
        );
      })}
    </ol>
  );
}

function Timer({ startedAt, targetMinutes, now }: { readonly startedAt: string; readonly targetMinutes: number; readonly now: () => number }) {
  const { t } = useI18n();
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const elapsed = now() - Date.parse(startedAt);
  const over = elapsed > targetMinutes * 60_000;
  return (
    <span className={`timer${over ? " is-over" : ""}`} role="timer" aria-label={t("header.timer", { elapsed: formatClock(elapsed), minutes: targetMinutes })}>
      <Icon name="clock" size={16} />
      <span className="mono">{formatClock(elapsed)}</span>
      <span className="muted mono">/ {String(targetMinutes).padStart(2, "0")}:00</span>
    </span>
  );
}
