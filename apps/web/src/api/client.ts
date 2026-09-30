import { ApiError, createApiClient } from "@fp/api-contract";
import type { ApiClient } from "@fp/api-contract";
import { createFakeApi } from "./fake.ts";

export type { ApiClient };

/** Creates an API client for the given token. The fake is a singleton so state survives re-login. */
export type ApiFactory = (token: string | undefined) => ApiClient;

export interface ApiEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_FAKE_API?: string;
}

export function apiFactoryFromEnv(env: ApiEnv): ApiFactory {
  if (env.VITE_FAKE_API === "1") {
    const fake = createFakeApi({ latencyMs: 250, feedbackLatencyMs: 1600 });
    return () => fake;
  }
  const baseUrl = env.VITE_API_URL || "http://localhost:8787";
  return (token) => (token ? createApiClient({ baseUrl, token }) : createApiClient({ baseUrl }));
}

export function isUnauthorized(e: unknown): boolean {
  return e instanceof ApiError && e.status === 401;
}

/** Korean, user-facing message for any thrown API/network error. */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 401) return "로그인이 만료되었습니다. 다시 로그인해 주세요.";
    if (e.code === "unavailable") return "서버가 잠시 응답하지 않습니다. 잠시 후 다시 시도해 주세요.";
    if (e.code === "rate_limited") return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
    return e.message || `요청을 처리하지 못했습니다 (${e.status}).`;
  }
  return "서버에 연결하지 못했습니다. 네트워크 상태를 확인해 주세요.";
}

export function newIdempotencyKey(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `k-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}
