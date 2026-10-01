import { ApiError, createApiClient } from "@fp/api-contract";
import type { ApiClient } from "@fp/api-contract";
import { translator } from "../i18n/translator.ts";
import type { Translator } from "../i18n/translator.ts";

export type { ApiClient };

/** Creates an API client for the given token. The fake is a singleton so state survives re-login. */
export type ApiFactory = (token: string | undefined) => ApiClient;

export interface ApiEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_FAKE_API?: string;
}

/**
 * Resolves the API factory for this build. The fake API (and its sample data) is loaded with a dynamic import
 * only when VITE_FAKE_API=1, so production bundles do not contain it.
 */
export async function loadApiFactory(env: ApiEnv): Promise<ApiFactory> {
  if (env.VITE_FAKE_API === "1") {
    const { createFakeApi } = await import("./fake.ts");
    const fake = createFakeApi({ latencyMs: 250, feedbackLatencyMs: 1600 });
    return () => fake;
  }
  const baseUrl = env.VITE_API_URL || "http://localhost:8787";
  return (token) => (token ? createApiClient({ baseUrl, token }) : createApiClient({ baseUrl }));
}

export function isUnauthorized(e: unknown): boolean {
  return e instanceof ApiError && e.status === 401;
}

/**
 * User-facing message for any thrown API/network error, in the translator's locale (Korean by default).
 * Other API errors show the server's message, which the API already renders in the user's locale.
 */
export function errorMessage(e: unknown, tr: Translator = translator()): string {
  if (e instanceof ApiError) {
    if (e.status === 401) return tr.t("error.unauthorized");
    if (e.code === "unavailable") return tr.t("error.unavailable");
    if (e.code === "rate_limited") return tr.t("error.rateLimited");
    return e.message || tr.t("error.request", { status: e.status });
  }
  return tr.t("error.network");
}

export function newIdempotencyKey(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `k-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}
