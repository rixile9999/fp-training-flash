import { ApiError, createApiClient } from "@fp/api-contract";
import type { ApiClient } from "@fp/api-contract";

/** The subset of the HTTP API client the MCP server uses. Tests implement this with a small fake. */
export type FpApi = Pick<
  ApiClient,
  | "exercise"
  | "trialRun"
  | "revealHint"
  | "noteOpened"
  | "explanation"
  | "theoryTopics"
  | "submit"
  | "feedback"
  | "startSession"
  | "activeSession"
  | "skipItem"
  | "recommend"
  | "progress"
>;

export const DEFAULT_API_URL = "http://localhost:8787";

export interface ApiEnv {
  readonly FP_API_URL?: string | undefined;
  readonly FP_TOKEN?: string | undefined;
}

export function apiFromEnv(env: ApiEnv): FpApi {
  const baseUrl = env.FP_API_URL?.trim() || DEFAULT_API_URL;
  const token = env.FP_TOKEN?.trim();
  return createApiClient(token ? { baseUrl, token } : { baseUrl });
}

/** Korean, actionable message for any error thrown by the API client. */
export function describeError(e: unknown): string {
  if (e instanceof ApiError) {
    switch (e.code) {
      case "unauthorized":
        return "인증에 실패했습니다. `fp token issue mcp`로 토큰을 발급해 MCP 설정의 FP_TOKEN에 넣어 주세요.";
      case "not_found":
        return `찾을 수 없습니다: ${e.message}`;
      case "invalid_input":
        return `입력이 올바르지 않습니다: ${e.message}`;
      case "forbidden":
        return `권한이 없습니다: ${e.message}`;
      case "conflict":
        return `요청이 현재 상태와 충돌합니다: ${e.message}`;
      case "rate_limited":
        return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
      case "unavailable":
        return `서버의 일부 기능을 지금 사용할 수 없습니다: ${e.message}`;
      default:
        return `서버 오류 (HTTP ${e.status}): ${e.message}`;
    }
  }
  if (e instanceof Error) {
    if (e instanceof TypeError || /fetch failed|ECONNREFUSED/i.test(e.message)) {
      return `API 서버에 연결할 수 없습니다 (${e.message}). 서버가 실행 중인지, FP_API_URL이 맞는지 확인해 주세요.`;
    }
    return `오류: ${e.message}`;
  }
  return `오류: ${String(e)}`;
}
