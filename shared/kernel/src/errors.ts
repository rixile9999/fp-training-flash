export type AppErrorCode =
  | "not_found"
  | "invalid_input"
  | "unauthorized"
  | "forbidden"
  | "conflict"
  | "rate_limited"
  | "unavailable"
  | "internal";

/** Error value crossing module boundaries. Modules return these instead of throwing for expected failures. */
export interface AppError {
  readonly code: AppErrorCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export function appError(code: AppErrorCode, message: string, details?: Record<string, unknown>): AppError {
  return details === undefined ? { code, message } : { code, message, details };
}
