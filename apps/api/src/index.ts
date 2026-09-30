/** Public entry of @fp/api: composition root and HTTP app factory (used by integration tests and tools). */
export { createApp, redactExercise } from "./app.ts";
export type { ApiApp, AppOptions, AppServices, RateLimitedAction } from "./app.ts";
export { bootstrap, ContentInvalidError, createRunner, migrateAll, MODULE_MIGRATIONS, openDb } from "./bootstrap.ts";
export type { BootstrapOptions, Runtime } from "./bootstrap.ts";
export { DEFAULTS, loadConfig, runnerLabel } from "./config.ts";
export type { ApiConfig, DbConfig, Env, RunnerConfig } from "./config.ts";
export { STATUS_BY_CODE } from "./http.ts";
export { createRateLimiter } from "./rate-limit.ts";
export type { RateLimitDecision, RateLimiter, RateLimitRule } from "./rate-limit.ts";
