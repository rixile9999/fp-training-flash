import { useEffect, useState } from "react";
import type { ApiClient, RecallDeckCards, RecallOverview, RecallSummary } from "@fp/api-contract";
import { errorMessage } from "../api/client.ts";
import type { DeckProgress } from "../api/types.ts";
import { useI18n } from "../i18n/I18n.tsx";
import { RECALL_HOME, sessionRoute } from "../recall.ts";
import type { RecallRoute } from "../recall.ts";
import { CodeBlock } from "../ui/CodeBlock.tsx";
import { Icon } from "../ui/Icon.tsx";
import { renderInline } from "../ui/Markdown.tsx";
import { BackLink, PageTitle } from "../ui/PageTitle.tsx";
import { Alert } from "../ui/Status.tsx";
import { RecallPlayer } from "./RecallPlayer.tsx";

const MINUTES = [5, 10, 15] as const;

type Props = Readonly<{ api: ApiClient; now: () => number; route: RecallRoute; onRoute: (r: RecallRoute) => void; contentKey: number }>;

export function Recall(props: Props) {
  const { route } = props;
  if (route.screen === "session") return <RecallPlayer {...props} route={route} />;
  if (route.screen === "deck") return <DeckBrowser {...props} deck={route.deck} />;
  if (route.screen === "summary") return <Summary {...props} summary={route.summary} />;
  return <Overview {...props} />;
}

function useLoad<T>(load: () => Promise<T>, deps: readonly unknown[]): T | string | null {
  const tr = useI18n();
  const [data, setData] = useState<T | string | null>(null);
  useEffect(() => {
    let alive = true;
    load().then(
      (v) => alive && setData(v),
      (e: unknown) => alive && setData(errorMessage(e, tr)),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return data;
}

function Loading({ data }: { readonly data: string | null }) {
  const { t } = useI18n();
  return data === null ? (
    <p className="page-status" role="status">
      {t("common.loading")}
    </p>
  ) : (
    <Alert message={data} />
  );
}

/** Seen (light) and mastered (solid) shares of a deck. */
function DeckMeter({ d }: { readonly d: DeckProgress }) {
  const { t } = useI18n();
  const pct = (n: number) => `${d.total ? (n / d.total) * 100 : 0}%`;
  return (
    <div className="meter recall-meter" role="img" aria-label={t("recall.deckMeter", { deck: d.title, total: d.total, seen: d.seen, mastered: d.mastered })}>
      <span className="is-seen" style={{ width: pct(d.seen) }} />
      <span style={{ width: pct(d.mastered) }} />
    </div>
  );
}

function DeckList({ decks, onOpen }: { readonly decks: readonly DeckProgress[]; readonly onOpen?: (d: DeckProgress) => void }) {
  const { t } = useI18n();
  return (
    <ul className="plain-list recall-decks">
      {decks.map((d) => (
        <li key={d.deckId}>
          <p className="recall-deck-top">
            <strong>{d.title}</strong>
            {d.due > 0 && <span className="chip chip-small chip-accent">{t("recall.deckDue", { n: d.due })}</span>}
            {onOpen && (
              <button type="button" className="btn btn-ghost btn-small" aria-label={t("recall.browseDeck", { deck: d.title })} onClick={() => onOpen(d)}>
                <Icon name="book" size={16} /> {t("recall.browse")}
              </button>
            )}
          </p>
          <DeckMeter d={d} />
          <p className="small muted">{t("recall.deckStats", { total: d.total, seen: d.seen, mastered: d.mastered })}</p>
        </li>
      ))}
    </ul>
  );
}

function Overview({ api, onRoute, contentKey }: Props) {
  const tr = useI18n();
  const { t } = tr;
  const data = useLoad<RecallOverview>(() => api.recallOverview(), [api, contentKey]);
  const [minutes, setMinutes] = useState<number>(10);
  const [deck, setDeck] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const head = (
    <div>
      <p className="eyebrow">{t("recall.eyebrow")}</p>
      <PageTitle>{t("recall.title")}</PageTitle>
    </div>
  );
  if (typeof data !== "object" || data === null)
    return (
      <div className="page recall">
        {head}
        <Loading data={data} />
      </div>
    );
  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      onRoute(sessionRoute(await api.startRecall({ minutes, ...(deck ? { deckIds: [deck] } : {}) })));
    } catch (e) {
      setError(errorMessage(e, tr));
      setBusy(false);
    }
  };
  const empty = data.dueNow === 0 && data.newAvailableToday === 0;
  return (
    <div className="page recall">
      <div className="page-head">{head}</div>
      <p className="muted">{t("recall.intro")}</p>
      <div className="recall-top">
        <dl className="summary-stats recall-stats">
          <div>
            <dt>{t("recall.dueNow")}</dt>
            <dd className="mono">{data.dueNow}</dd>
          </div>
          <div>
            <dt>{t("recall.newToday")}</dt>
            <dd className="mono">{data.newAvailableToday}</dd>
            <dd className="small muted">{t("recall.newPerDay", { n: data.newPerDay })}</dd>
          </div>
        </dl>
        <form
          className="panel recall-start"
          onSubmit={(e) => {
            e.preventDefault();
            void start();
          }}
        >
          <fieldset className="segmented">
            <legend className="field-label">{t("recall.minutes")}</legend>
            {MINUTES.map((m) => (
              <label key={m} className={minutes === m ? "is-on" : undefined}>
                <input type="radio" name="recall-minutes" value={m} checked={minutes === m} onChange={() => setMinutes(m)} />
                {t("recall.minutesOption", { n: m })}
              </label>
            ))}
          </fieldset>
          <label className="field-label" htmlFor="recall-deck">
            {t("recall.deckFilter")}
          </label>
          <select id="recall-deck" className="input" value={deck} onChange={(e) => setDeck(e.target.value)}>
            <option value="">{t("recall.allDecks")}</option>
            {data.decks.map((d) => (
              <option key={d.deckId} value={d.deckId}>
                {d.title}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-primary" disabled={busy || empty}>
            <Icon name="play" /> {busy ? t("recall.starting") : t("recall.start", { n: minutes })}
          </button>
          {empty && <p className="small muted">{t("recall.nothing")}</p>}
          <Alert message={error} />
        </form>
      </div>
      <section className="panel recall-panel" aria-labelledby="recall-decks-h">
        <h2 id="recall-decks-h" className="card-title">
          <Icon name="layers" /> {t("recall.decks")}
        </h2>
        <DeckList decks={data.decks} onOpen={(d) => onRoute({ screen: "deck", deck: d })} />
      </section>
    </div>
  );
}

function DeckBrowser({ api, now, onRoute, contentKey, deck }: Props & { readonly deck: DeckProgress }) {
  const tr = useI18n();
  const { t } = tr;
  const data = useLoad<RecallDeckCards>(() => api.recallDeckCards(deck.deckId), [api, deck.deckId, contentKey]);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="page recall course-unit">
      <BackLink label={t("recall.title")} onClick={() => onRoute(RECALL_HOME)} />
      <PageTitle>{deck.title}</PageTitle>
      <p className="muted">{t("recall.cardsNote")}</p>
      {typeof data !== "object" || data === null ? (
        <Loading data={data} />
      ) : data.length === 0 ? (
        <p className="muted">{t("recall.noCards")}</p>
      ) : (
        <ul className="plain-list recall-cards">
          {data.map((c) => {
            const s = c.state;
            const shown = open === c.id;
            return (
              <li key={c.id} className="panel recall-card">
                <p className="exercise-top">
                  <button type="button" className="link-btn mono" aria-expanded={shown} onClick={() => setOpen(shown ? null : c.id)}>
                    <Icon name={shown ? "chevronDown" : "chevronRight"} size={16} /> {c.title}
                  </button>
                  <span className="chip chip-small">{t(s ? `stage.${s.stage}` : "recall.notStarted")}</span>
                  {s?.stage === "produce" && (s.stabilityDays ?? 0) >= 21 && (
                    <span className="status status-pass small">
                      <Icon name="checkCircle" size={16} /> {t("recall.mastered")}
                    </span>
                  )}
                  {s?.dueAt && <span className="small muted">{t("recall.dueOn", { when: tr.relativeDay(s.dueAt, now()) })}</span>}
                </p>
                {shown && (
                  <div className="recall-card-body">
                    <p>{renderInline(c.summary)}</p>
                    <CodeBlock code={c.example} label={t("recall.example")} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Summary({ api, onRoute, summary: s }: Props & { readonly summary: RecallSummary }) {
  const tr = useI18n();
  const { t } = tr;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const again = async () => {
    setBusy(true);
    try {
      onRoute(sessionRoute(await api.startRecall({})));
    } catch (e) {
      setError(errorMessage(e, tr));
      setBusy(false);
    }
  };
  const stats: [string, string][] = [
    [t("recall.answered"), String(s.answered)],
    [t("recall.accuracy"), s.answered ? tr.percent(s.correct / s.answered) : "–"],
    [t("recall.learned"), String(s.newLearned)],
    [t("recall.dueTomorrow"), String(s.dueTomorrow)],
  ];
  return (
    <div className="page recall course-unit">
      <p className="eyebrow">{t("recall.title")}</p>
      <PageTitle>{t("recall.summaryTitle")}</PageTitle>
      <dl className="summary-stats recall-summary">
        {stats.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd className="mono">{v}</dd>
          </div>
        ))}
      </dl>
      <section className="panel recall-panel" aria-labelledby="recall-sum-decks">
        <h2 id="recall-sum-decks" className="card-title">
          <Icon name="layers" /> {t("recall.decks")}
        </h2>
        <DeckList decks={s.decks} />
      </section>
      <div className="row-actions">
        <button type="button" className="btn btn-secondary" onClick={() => onRoute(RECALL_HOME)}>
          {t("recall.home")}
        </button>
        <button type="button" className="btn btn-primary" onClick={() => void again()} disabled={busy}>
          <Icon name="refresh" /> {t("recall.again")}
        </button>
      </div>
      <Alert message={error} />
    </div>
  );
}
