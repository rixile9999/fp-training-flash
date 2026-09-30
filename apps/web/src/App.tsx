import { useCallback, useEffect, useMemo, useState } from "react";
import type { DevLoginResponse, Session, SessionSummary, Skill } from "@fp/api-contract";
import { errorMessage, isUnauthorized } from "./api/client.ts";
import type { ApiFactory } from "./api/client.ts";
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

export function App({ apiFactory, store, now, initialView = "training" }: AppProps) {
  const [auth, setAuth] = useState<StoredAuth | null>(() => readAuth(store));
  const api = useMemo(() => apiFactory(auth?.token), [apiFactory, auth?.token]);
  const [view, setView] = useState<View>(initialView);
  const [skills, setSkills] = useState<readonly Skill[]>([]);
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("work");
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentSession[]>(() => readRecent(store));

  const logout = useCallback(() => {
    store.remove(AUTH_KEY);
    setAuth(null);
    setSession(undefined);
    setSummary(null);
  }, [store]);

  const fail = useCallback(
    (e: unknown) => {
      if (isUnauthorized(e)) logout();
      else setError(errorMessage(e));
    },
    [logout],
  );

  const adopt = useCallback((s: Session | null) => {
    setSession(s);
    setActiveIndex(s ? s.currentIndex : null);
  }, []);

  useEffect(() => {
    if (!auth) return;
    let alive = true;
    api.skills().then((s) => alive && setSkills(s), () => undefined);
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

  if (!auth) {
    const onLoggedIn = (res: DevLoginResponse) => {
      const a = { token: res.token.token, displayName: res.user.displayName };
      store.set(AUTH_KEY, JSON.stringify(a));
      setError(null);
      setAuth(a);
    };
    return <Login api={api} onLoggedIn={onLoggedIn} />;
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
        본문으로 건너뛰기
      </a>
      <Header
        displayName={auth.displayName}
        view={view}
        onNav={setView}
        onLogout={logout}
        session={session}
        activeIndex={activeIndex}
        phase={phase}
        completed={summary !== null}
        now={now}
      />
      <main id="main" className="app-main">
        {view === "training" ? (
          <Training
            api={api}
            skills={skills}
            session={summary ? session : session === undefined ? undefined : activeSession}
            activeIndex={activeIndex}
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
