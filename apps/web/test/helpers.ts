import { vi } from "vitest";
import type { ApiClient } from "@fp/api-contract";
import { createFakeApi } from "../src/api/fake.ts";

/** Fake API whose methods are all vi.fn spies; `overrides` replace individual calls. */
export function spyApi(overrides: Partial<ApiClient> = {}): ApiClient & { [K in keyof ApiClient]: ReturnType<typeof vi.fn> & ApiClient[K] } {
  const base = { ...createFakeApi({ now: () => Date.parse("2026-09-30T09:00:00Z") }), ...overrides };
  const out: Record<string, unknown> = {};
  for (const [k, fn] of Object.entries(base)) out[k] = vi.fn(fn as (...a: unknown[]) => unknown);
  return out as never;
}

export function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
