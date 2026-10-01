/**
 * HTTP helpers: AppError -> status mapping, JSON responses, request locale, zod-validated body/query
 * parsing with messages in the request locale.
 */
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { appError, err, isLocale, ok } from "@fp/kernel";
import type { AppError, AppErrorCode, Locale, Result } from "@fp/kernel";
import type { ApiErrorBody } from "@fp/api-contract";
import { z } from "zod";
import { apiMessage, isApiMessageId, localeFromAcceptLanguage } from "./messages.ts";
import type { ApiMessageId } from "./messages.ts";

export const STATUS_BY_CODE: Readonly<Record<AppErrorCode, ContentfulStatusCode>> = {
  invalid_input: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  internal: 500,
  unavailable: 503,
};

const JSON_HEADERS = { "content-type": "application/json; charset=UTF-8" } as const;

/** Serialises any value (including branded ids and readonly arrays) as JSON. */
export function json(c: Context, body: unknown, status: ContentfulStatusCode = 200): Response {
  return c.body(JSON.stringify(body ?? null), status, JSON_HEADERS);
}

export function errorBody(error: AppError): { readonly error: ApiErrorBody } {
  const body: ApiErrorBody =
    error.details === undefined
      ? { code: error.code, message: error.message }
      : { code: error.code, message: error.message, details: error.details };
  return { error: body };
}

export function fail(c: Context, error: AppError, status?: ContentfulStatusCode): Response {
  return json(c, errorBody(error), status ?? STATUS_BY_CODE[error.code]);
}

/** Maps a module Result to a response. */
export function respond<T>(c: Context, result: Result<T, AppError>, status: ContentfulStatusCode = 200): Response {
  return result.ok ? json(c, result.value, status) : fail(c, result.error);
}

/**
 * The locale for the API's own messages: the authenticated user's locale (set as the "locale" context
 * variable by the auth middleware), otherwise the Accept-Language header, otherwise "ko".
 */
export function requestLocale(c: Context): Locale {
  const v: unknown = c.get("locale");
  return typeof v === "string" && isLocale(v) ? v : localeFromAcceptLanguage(c.req.header("accept-language"));
}

/** An AppError whose message is the API message `id` in the request locale. */
export function apiError(
  c: Context,
  code: AppErrorCode,
  id: ApiMessageId,
  details?: Record<string, unknown>,
): AppError {
  return appError(code, apiMessage(id, requestLocale(c)), details);
}

const ZOD_LOCALES = { ko: z.locales.ko, en: z.locales.en, zh: z.locales.zhCN } as const;
const errorMaps = new Map<Locale, z.core.$ZodErrorMap>();

/**
 * Per-parse zod error map: custom checks carrying `params.messageId` use the API catalog, everything else
 * uses zod's own locale (ko, en, zh-CN).
 */
export function zodErrorMap(locale: Locale): z.core.$ZodErrorMap {
  const cached = errorMaps.get(locale);
  if (cached) return cached;
  const base = ZOD_LOCALES[locale]().localeError;
  const map: z.core.$ZodErrorMap = (iss) => {
    if (iss.code === "custom") {
      const id: unknown = iss.params?.["messageId"];
      if (isApiMessageId(id)) return apiMessage(id, locale, (iss.params?.["messageParams"] ?? {}) as Record<string, string>);
    }
    return base(iss);
  };
  errorMaps.set(locale, map);
  return map;
}

function validationError(c: Context, issues: readonly z.core.$ZodIssue[]): AppError {
  return apiError(c, "invalid_input", "invalidInput", {
    issues: issues.map((i) => ({ path: i.path.map(String).join("."), message: i.message })),
  });
}

/** Parses a JSON body with `schema`. An empty body is treated as `{}`. */
export async function parseBody<S extends z.ZodType>(c: Context, schema: S): Promise<Result<z.output<S>, AppError>> {
  const text = await c.req.text();
  let raw: unknown = {};
  if (text.trim() !== "") {
    try {
      raw = JSON.parse(text);
    } catch {
      return err(apiError(c, "invalid_input", "invalidJson"));
    }
  }
  const parsed = schema.safeParse(raw, { error: zodErrorMap(requestLocale(c)) });
  return parsed.success ? ok(parsed.data) : err(validationError(c, parsed.error.issues));
}

export function parseQuery<S extends z.ZodType>(c: Context, schema: S): Result<z.output<S>, AppError> {
  const parsed = schema.safeParse(c.req.query(), { error: zodErrorMap(requestLocale(c)) });
  return parsed.success ? ok(parsed.data) : err(validationError(c, parsed.error.issues));
}
