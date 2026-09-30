/** HTTP helpers: AppError -> status mapping, JSON responses, zod-validated body/query parsing. */
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { appError, err, ok } from "@fp/kernel";
import type { AppError, AppErrorCode, Result } from "@fp/kernel";
import type { ApiErrorBody } from "@fp/api-contract";
import type { z } from "zod";

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

function validationError(issues: readonly z.core.$ZodIssue[]): AppError {
  return appError("invalid_input", "요청 값이 올바르지 않습니다.", {
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
      return err(appError("invalid_input", "요청 본문이 올바른 JSON이 아닙니다."));
    }
  }
  const parsed = schema.safeParse(raw);
  return parsed.success ? ok(parsed.data) : err(validationError(parsed.error.issues));
}

export function parseQuery<S extends z.ZodType>(c: Context, schema: S): Result<z.output<S>, AppError> {
  const parsed = schema.safeParse(c.req.query());
  return parsed.success ? ok(parsed.data) : err(validationError(parsed.error.issues));
}
