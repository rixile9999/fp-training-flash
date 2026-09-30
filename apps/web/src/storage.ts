/** localStorage access that never throws (private mode, blocked storage, tests). */
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export function browserStore(): KeyValueStore {
  const ls = (): Storage | null => {
    try {
      return globalThis.localStorage ?? null;
    } catch {
      return null;
    }
  };
  return {
    get: (k) => {
      try {
        return ls()?.getItem(k) ?? null;
      } catch {
        return null;
      }
    },
    set: (k, v) => {
      try {
        ls()?.setItem(k, v);
      } catch {
        /* ignore */
      }
    },
    remove: (k) => {
      try {
        ls()?.removeItem(k);
      } catch {
        /* ignore */
      }
    },
  };
}

export function memoryStore(init: Record<string, string> = {}): KeyValueStore {
  const m = new Map(Object.entries(init));
  return { get: (k) => m.get(k) ?? null, set: (k, v) => void m.set(k, v), remove: (k) => void m.delete(k) };
}

export const AUTH_KEY = "fp.auth";
export const RECENT_KEY = "fp.recentSessions";

export interface StoredAuth {
  readonly token: string;
  readonly displayName: string;
}

export function readAuth(store: KeyValueStore): StoredAuth | null {
  const raw = store.get(AUTH_KEY);
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<StoredAuth>;
    return typeof v.token === "string" && typeof v.displayName === "string" ? { token: v.token, displayName: v.displayName } : null;
  } catch {
    return null;
  }
}
