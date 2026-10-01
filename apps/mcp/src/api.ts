import { ApiError, createApiClient } from "@fp/api-contract";
import type { ApiClient } from "@fp/api-contract";
import { DEFAULT_LOCALE, translator } from "./messages.ts";
import type { Locale } from "./messages.ts";

/** The subset of the HTTP API client the MCP server uses. Tests implement this with a small fake. */
export type FpApi = Pick<
  ApiClient,
  | "me"
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
  /** Optional fixed output language (ko, en, zh); otherwise the account's user.locale is used. */
  readonly FP_LANG?: string | undefined;
}

export function apiFromEnv(env: ApiEnv): FpApi {
  const baseUrl = env.FP_API_URL?.trim() || DEFAULT_API_URL;
  const token = env.FP_TOKEN?.trim();
  return createApiClient(token ? { baseUrl, token } : { baseUrl });
}

/** Actionable message in `locale` (default Korean) for any error thrown by the API client. */
export function describeError(e: unknown, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  if (e instanceof ApiError) {
    switch (e.code) {
      case "unauthorized":
        return t("errUnauthorized");
      case "not_found":
        return t("errNotFound", { message: e.message });
      case "invalid_input":
        return t("errInvalidInput", { message: e.message });
      case "forbidden":
        return t("errForbidden", { message: e.message });
      case "conflict":
        return t("errConflict", { message: e.message });
      case "rate_limited":
        return t("errRateLimited");
      case "unavailable":
        return t("errUnavailable", { message: e.message });
      default:
        return t("errServer", { status: e.status, message: e.message });
    }
  }
  if (e instanceof Error) {
    if (e instanceof TypeError || /fetch failed|ECONNREFUSED/i.test(e.message)) return t("errConnect", { message: e.message });
    return t("errGeneric", { message: e.message });
  }
  return t("errGeneric", { message: String(e) });
}
