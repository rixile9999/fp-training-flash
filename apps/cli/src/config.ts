import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export const DEFAULT_API_URL = "http://localhost:8787";

/** Persisted in <configDir>/config.json. Everything is optional so a fresh install works. */
export interface CliConfig {
  readonly apiUrl?: string;
  readonly token?: string;
  readonly user?: { readonly id: string; readonly displayName: string };
  /** Most recent submission, for `fp feedback last`. */
  readonly lastSubmissionId?: string;
  /** Most recently written exercise project, used when a command gets no dir. */
  readonly lastWorkDir?: string;
}

export interface ConfigEnv {
  readonly FP_CONFIG_DIR?: string | undefined;
  readonly HOME?: string | undefined;
}

export function configDir(env: ConfigEnv): string {
  if (env.FP_CONFIG_DIR) return env.FP_CONFIG_DIR;
  return join(env.HOME || homedir(), ".config", "fp");
}

export function configPath(env: ConfigEnv): string {
  return join(configDir(env), "config.json");
}

export async function loadConfig(env: ConfigEnv): Promise<CliConfig> {
  let text: string;
  try {
    text = await readFile(configPath(env), "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw e;
  }
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === "object" ? (parsed as CliConfig) : {};
  } catch {
    throw new Error(`설정 파일을 읽을 수 없습니다 (JSON 오류): ${configPath(env)}`);
  }
}

/** Writes atomically with owner-only permissions (the file holds a bearer token). */
export async function saveConfig(env: ConfigEnv, config: CliConfig): Promise<void> {
  const dir = configDir(env);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const file = configPath(env);
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(config, null, 2) + "\n", { mode: 0o600 });
  await rename(tmp, file);
}
