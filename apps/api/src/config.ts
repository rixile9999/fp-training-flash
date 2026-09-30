/** Environment configuration for the API server. Pure: reads only the env record it is given. */
import { resolve } from "node:path";
import { appError, err, ok } from "@fp/kernel";
import type { AppError, Result } from "@fp/kernel";
import type { LlmConfig } from "@fp/coaching";

export type DbConfig =
  | { readonly kind: "postgres"; readonly url: string }
  /** `dataDir` undefined means in-memory PGlite. */
  | { readonly kind: "pglite"; readonly dataDir: string | undefined };

export type RunnerConfig =
  | { readonly kind: "docker"; readonly image: string }
  | { readonly kind: "local"; readonly templateDir: string };

export interface ApiConfig {
  readonly port: number;
  readonly db: DbConfig;
  readonly contentDir: string;
  readonly runner: RunnerConfig;
  readonly llm: LlmConfig;
  readonly webOrigin: string;
}

export type Env = Readonly<Record<string, string | undefined>>;

/** Repository root, derived from this file's location (apps/api/src). */
export const REPO_ROOT = resolve(import.meta.dirname, "../../..");

export const DEFAULTS = {
  port: 8787,
  dataDir: ".data/pglite",
  runnerImage: "fp-gleam-runner:1.18.1",
  coachModel: "claude-opus-5",
  dashscopeCoachModel: "qwen3.8-flash",
  dashscopeBaseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
  webOrigin: "http://localhost:5173",
} as const;

function nonEmpty(v: string | undefined): string | undefined {
  const t = v?.trim();
  return t ? t : undefined;
}

/**
 * Builds the config from environment variables. Relative paths resolve against `cwd`
 * (default: process.cwd()), except the content default, which is the repository's /content.
 */
export function loadConfig(env: Env, cwd: string = process.cwd()): Result<ApiConfig, AppError> {
  const problems: string[] = [];

  let port: number = DEFAULTS.port;
  const rawPort = nonEmpty(env.PORT);
  if (rawPort !== undefined) {
    const n = Number(rawPort);
    if (!Number.isInteger(n) || n < 0 || n > 65535) problems.push(`PORT must be an integer 0-65535, got "${rawPort}"`);
    else port = n;
  }

  let db: DbConfig;
  const dbUrl = nonEmpty(env.DATABASE_URL);
  if (dbUrl !== undefined) {
    db = { kind: "postgres", url: dbUrl };
  } else {
    const dataDir = nonEmpty(env.FP_DATA_DIR) ?? DEFAULTS.dataDir;
    db = { kind: "pglite", dataDir: dataDir === "memory" ? undefined : resolve(cwd, dataDir) };
  }

  const contentEnv = nonEmpty(env.FP_CONTENT_DIR);
  const contentDir = contentEnv !== undefined ? resolve(cwd, contentEnv) : resolve(REPO_ROOT, "content");

  let runner: RunnerConfig = { kind: "docker", image: DEFAULTS.runnerImage };
  const runnerKind = nonEmpty(env.FP_RUNNER) ?? "docker";
  if (runnerKind === "docker") {
    runner = { kind: "docker", image: nonEmpty(env.FP_RUNNER_IMAGE) ?? DEFAULTS.runnerImage };
  } else if (runnerKind === "local") {
    const templateDir = nonEmpty(env.FP_RUNNER_TEMPLATE_DIR);
    if (templateDir === undefined) problems.push("FP_RUNNER=local requires FP_RUNNER_TEMPLATE_DIR");
    else runner = { kind: "local", templateDir: resolve(cwd, templateDir) };
  } else {
    problems.push(`FP_RUNNER must be "docker" or "local", got "${runnerKind}"`);
  }

  // FP_LLM_PROVIDER picks the coaching LLM explicitly; otherwise the first configured key wins
  // (ANTHROPIC_API_KEY, then DASHSCOPE_API_KEY). Without any, coaching is rule-based.
  const anthropicKey = nonEmpty(env.ANTHROPIC_API_KEY);
  const dashscopeKey = nonEmpty(env.DASHSCOPE_API_KEY);
  const requested = nonEmpty(env.FP_LLM_PROVIDER);
  const provider = requested ?? (anthropicKey ? "anthropic" : dashscopeKey ? "dashscope" : "none");
  const coachModel = nonEmpty(env.FP_COACH_MODEL);
  let llm: LlmConfig = { provider: "none" };
  if (provider === "anthropic") {
    if (anthropicKey === undefined) problems.push("FP_LLM_PROVIDER=anthropic requires ANTHROPIC_API_KEY");
    else llm = { provider: "anthropic", apiKey: anthropicKey, model: coachModel ?? DEFAULTS.coachModel };
  } else if (provider === "dashscope") {
    if (dashscopeKey === undefined) problems.push("FP_LLM_PROVIDER=dashscope requires DASHSCOPE_API_KEY");
    else {
      const thinking = nonEmpty(env.FP_COACH_THINKING);
      llm = {
        provider: "dashscope",
        apiKey: dashscopeKey,
        model: coachModel ?? DEFAULTS.dashscopeCoachModel,
        baseUrl: nonEmpty(env.DASHSCOPE_BASE_URL) ?? DEFAULTS.dashscopeBaseUrl,
        enableThinking: thinking === "on" || thinking === "true" || thinking === "1",
        chatAgent: ["on", "true", "1"].includes(nonEmpty(env.FP_COACH_CHAT_AGENT) ?? ""),
      };
    }
  } else if (provider !== "none") {
    problems.push(`FP_LLM_PROVIDER must be "anthropic", "dashscope" or "none", got "${provider}"`);
  }

  const webOrigin = nonEmpty(env.FP_WEB_ORIGIN) ?? DEFAULTS.webOrigin;

  if (problems.length > 0) {
    return err(appError("invalid_input", "invalid configuration", { problems }));
  }
  return ok({ port, db, contentDir, runner, llm, webOrigin });
}

/** Short runner label for /v1/health and logs. */
export function runnerLabel(runner: RunnerConfig): string {
  return runner.kind === "docker" ? `docker:${runner.image}` : "local";
}
