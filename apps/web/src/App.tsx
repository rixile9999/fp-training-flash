import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DevLoginResponse, Session, SessionSummary, Skill } from "@fp/api-contract";
import { errorMessage, isUnauthorized } from "./api/client.ts";
import type { ApiFactory } from "./api/client.ts";
import { I18nProvider } from "./i18n/I18n.tsx";
import { DEFAULT_LOCALE, HTML_LANG, LOCALE_KEY, isLocale } from "./i18n/locale.ts";
import type { Locale } from "./i18n/locale.ts";
import { translator } from "./i18n/translator.ts";
import { MAP } from "./course.ts";
import type { CourseRoute } from "./course.ts";
import { Course } from "./screens/Course.tsx";
import { Login } from "./screens/Login.tsx";
import { Progress } from "./screens/Progress.tsx";
import type { RecentSession } from "./screens/Progress.tsx";
import { Training } from "./screens/Training.tsx";
import type { Phase } from "./session.ts";
import { AUTH_KEY, RECENT_KEY, readAuth } from "./storage.ts";
import type { KeyValueStore, StoredAuth } from "./storage.ts";
import { Header } from "./ui/Header.tsx";
import type { View } from "./ui/Header.tsx";

export interface AppProps {
  readonly apiFactory: ApiFactory;
  readonly store: KeyValueStore;
  readonly now: () => number;
  readonly initialView?: View;
}

const SESSION_MINUTES = 15;

function readRecent(store: KeyValueStore): RecentSession[] {
  try {
    const v: unknown = JSON.parse(store.get(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? (v as RecentSession[]) : [];
  } catch {
    return [];
  }
}

function readLocale(store: KeyValueStore): Locale | null {
  const v = store.get(LOCALE_KEY);
  return isLocale(v) ? v : null;
}

export function App(props: AppProps) {
  const { store } = props;
  // The locale chosen in this browser (localStorage); null until the learner or the server sets one.
  const [stored, setStored] = useState<Locale | null>(() => readLocale(store));
  const locale = stored ?? DEFAULT_LOCALE;
  const storedRef = useRef(stored);
  storedRef.current = stored;
  const remember = useCallback(
    (l: Locale) => {
      store.set(LOCALE_KEY, l);
      setStored(l);
    },
    [store],
  );
  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = HTML_LANG[locale];
  }, [locale]);
  return (
    <I18nProvider locale={locale}>
      <AppShell {...props} locale={locale} hasStoredLocale={stored !== null} storedRef={storedRef} remember={remember} />
    </I18nProvider>
  );
}

function AppShell({
  apiFactory,
  store,
  now,
  initialView = "training",
  locale,
  hasStoredLocale,
  storedRef,
  remember,
}: AppProps & {
  readonly locale: Locale;
  readonly hasStoredLocale: boolean;
  readonly storedRef: { readonly current: Locale | null };
  readonly remember: (l: Locale) => void;
}) {
  const tr = translator(locale);
  const [auth, setAuth] = useState<StoredAuth | null>(() => readAuth(store));
  const api = useMemo(() => apiFactory(auth?.token), [apiFactory, auth?.token]);
  const [view, setView] = useState<View>(initialView);
  // Position inside the course tab; kept while visiting other tabs. Re-selecting the tab goes back to the map.
  const [courseRoute, setCourseRoute] = useState<CourseRoute>(MAP);
  const nav = (v: View) => {
    if (v === "course" && view === "course") setCourseRoute(MAP);
    setView(v);
  };
  const [skills, setSkills] = useState<readonly Skill[]>([]);
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("work");
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentSession[]>(() => readRecent(store));
  // Bumped after the server accepted a new locale: screens refetch server-rendered content (exercise, progress, ...).
  const [contentKey, setContentKey] = useState(0);

  const logout = useCallback(() => {
    store.remove(AUTH_KEY);
    setAuth(null);
    setSession(undefined);
    setSummary(null);
  }, [store]);

  const fail = useCallback(
    (e: unknown) => {
      if (isUnauthorized(e)) logout();
      else setError(errorMessage(e, tr));
    },
    [logout, tr],
  );

  const adopt = useCallback((s: Session | null) => {
    setSession(s);
    setActiveIndex(s ? s.currentIndex : null);
  }, []);

  // Skill names are server-rendered in the user's locale, so they are refetched after a language switch.
  useEffect(() => {
    if (!auth) return;
    let alive = true;
    api.skills().then((s) => alive && setSkills(s), () => undefined);
    return () => {
      alive = false;
    };
  }, [api, auth, contentKey]);

  // Reconcile the account's locale with this browser's: a locale stored here wins and is pushed to the server;
  // without one, the account's locale is adopted.
  useEffect(() => {
    if (!auth) return;
    let alive = true;
    api.me().then(
      (user) => {
        if (!alive || !isLocale(user.locale)) return;
        const local = storedRef.current;
        if (local === null) {
          if (user.locale !== DEFAULT_LOCALE) setContentKey((k) => k + 1);
          remember(user.locale);
        } else if (local !== user.locale) {
          api.updateMe({ locale: local }).then(
            () => alive && setContentKey((k) => k + 1),
            () => undefined,
          );
        }
      },
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, [api, auth, storedRef, remember]);

  useEffect(() => {
    if (!auth) return;
    let alive = true;
    api.activeSession("gleam").then(
      (s) => alive && adopt(s),
      (e: unknown) => {
        if (!alive) return;
        adopt(null);
        fail(e);
      },
    );
    return () => {
      alive = false;
    };
  }, [api, auth, adopt, fail]);

  /** Switches the UI at once; once the server stored the choice, server-rendered content is refetched. */
  const changeLocale = (next: Locale) => {
    if (next === locale && hasStoredLocale) return;
    remember(next);
    if (!auth) return;
    api.updateMe({ locale: next }).then(() => setContentKey((k) => k + 1), fail);
  };

  if (!auth) {
    const onLoggedIn = (res: DevLoginResponse) => {
      const a = { token: res.token.token, displayName: res.user.displayName };
      store.set(AUTH_KEY, JSON.stringify(a));
      if (!hasStoredLocale && isLocale(res.user.locale)) remember(res.user.locale);
      setError(null);
      setAuth(a);
    };
    return <Login api={api} onLoggedIn={onLoggedIn} locale={locale} onLocale={changeLocale} sendLocale={hasStoredLocale} />;
  }

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const start = () =>
    run(async () => {
      const s = await api.startSession({ language: "gleam", targetMinutes: SESSION_MINUTES });
      setSummary(null);
      setPhase("work");
      adopt(s);
      setView("training");
    });

  const skip = () =>
    run(async () => {
      if (!session) return;
      adopt(await api.skipItem(session.id));
    });

  const complete = () =>
    run(async () => {
      if (!session) return;
      const sum = await api.completeSession(session.id);
      const entry: RecentSession = { completedAt: new Date(now()).toISOString(), summary: sum };
      const nextRecent = [entry, ...recent.filter((r) => r.summary.sessionId !== sum.sessionId)].slice(0, 5);
      setRecent(nextRecent);
      store.set(RECENT_KEY, JSON.stringify(nextRecent));
      setSession({ ...session, status: "completed" });
      setSummary(sum);
    });

  const activeSession = session && session.status === "active" ? session : null;

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        {tr.t("common.skipToContent")}
      </a>
      <Header
        displayName={auth.displayName}
        view={view}
        onNav={nav}
        onLogout={logout}
        session={session}
        activeIndex={activeIndex}
        phase={phase}
        completed={summary !== null}
        now={now}
        locale={locale}
        onLocale={changeLocale}
      />
      <main id="main" className="app-main">
        {view === "course" ? (
          <Course api={api} skills={skills} route={courseRoute} onRoute={setCourseRoute} onTraining={() => {
              setCourseRoute(MAP);
              setView("training");
            }} contentKey={contentKey} />
        ) : view === "training" ? (
          <Training
            api={api}
            skills={skills}
            session={summary ? session : session === undefined ? undefined : activeSession}
            activeIndex={activeIndex}
            contentKey={contentKey}
            phase={phase}
            summary={summary}
            busy={busy}
            error={error}
            onPhase={setPhase}
            onSession={setSession}
            onActiveIndex={setActiveIndex}
            onStart={() => void start()}
            onSkip={() => void skip()}
            onComplete={() => void complete()}
            onShowProgress={() => setView("progress")}
          />
        ) : (
          <Progress
            api={api}
            now={now}
            recent={recent}
            contentKey={contentKey}
            hasActiveSession={!!activeSession && !summary}
            onStart={() => void start()}
            onResume={() => setView("training")}
            busy={busy}
          />
        )}
        {error && view === "training" && session && (
          <p className="toast-error" role="alert">
            {error}
          </p>
        )}
      </main>
    </div>
  );
}
