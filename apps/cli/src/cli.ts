import { randomUUID } from "node:crypto";
import { relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import { ApiError, createApiClient } from "@fp/api-contract";
import type { ApiClient, Language, Session } from "@fp/api-contract";
import { DEFAULT_API_URL, configPath, loadConfig, saveConfig } from "./config.ts";
import type { CliConfig, ConfigEnv } from "./config.ts";
import {
  formatExplanation,
  formatFeedback,
  formatHints,
  formatProgress,
  formatSession,
  formatSubmission,
  formatTrialRun,
} from "./format.ts";
import { META_FILE, learnerFile, readLearnerCode, readMeta, writeProject } from "./project.ts";
import type { ProjectMeta } from "./project.ts";

/** API methods the CLI uses; tests pass a hand-written fake. */
export type CliApi = Pick<
  ApiClient,
  | "devLogin"
  | "me"
  | "issueToken"
  | "exercise"
  | "trialRun"
  | "revealHint"
  | "explanation"
  | "submit"
  | "feedback"
  | "startSession"
  | "activeSession"
  | "skipItem"
  | "progress"
>;

export interface CliEnv extends ConfigEnv {
  readonly FP_API_URL?: string | undefined;
  readonly FP_TOKEN?: string | undefined;
}

export interface CliDeps {
  readonly env: CliEnv;
  readonly cwd: string;
  readonly stdout: (text: string) => void;
  readonly stderr: (text: string) => void;
  readonly createClient?: (opts: { readonly baseUrl: string; readonly token?: string }) => CliApi;
  readonly newKey?: () => string;
}

const LANGUAGE: Language = "gleam";

export const USAGE = `사용법: fp <명령> [옵션]

  login <이름>              개발용 로그인 (토큰을 설정 파일에 저장)
  whoami                    현재 사용자
  start [--minutes 15] [--focus <기술>]
                            세션 시작 후 첫 문제를 ./fp-work/ 에 생성
  next | current [--force]  현재 문제를 ./fp-work/<family>-<variant>/ 에 생성
  run [dir]                 공개 테스트 실행 (기록되지 않음)
  submit [dir]              제출 (숨김 테스트 포함 채점, 레이팅 변화 표시)
  feedback [제출ID|last]    코치 피드백
  hint [단계] [--dir d]     힌트 공개 (생략 시 다음 단계)
  explain [--yes] [--dir d] 해설 공개 (레이팅 미반영, --yes 필요)
  progress                  기술별 레이팅과 복습 일정
  skip                      현재 문제 건너뛰기 후 다음 문제 생성
  token issue <라벨>        MCP 등에 쓸 토큰 발급

공통 옵션: --json (기계용 JSON 출력), --help
환경 변수: FP_API_URL, FP_TOKEN, FP_CONFIG_DIR (기본 ~/.config/fp)`;

/** Expected, user-facing failure: printed without a stack trace. */
class CliError extends Error {
  readonly exitCode: number;
  constructor(message: string, exitCode = 1) {
    super(message);
    this.exitCode = exitCode;
  }
}

function describeError(e: unknown): string {
  if (e instanceof ApiError) {
    switch (e.code) {
      case "unauthorized":
        return "인증에 실패했습니다. `fp login <이름>`으로 다시 로그인하세요.";
      case "not_found":
        return `찾을 수 없습니다: ${e.message}`;
      case "invalid_input":
        return `입력이 올바르지 않습니다: ${e.message}`;
      case "conflict":
        return `현재 상태와 충돌합니다: ${e.message}`;
      case "rate_limited":
        return "요청이 너무 많습니다. 잠시 후 다시 시도하세요.";
      default:
        return `서버 오류 (HTTP ${e.status}, ${e.code}): ${e.message}`;
    }
  }
  if (e instanceof TypeError && /fetch/i.test(e.message)) {
    return `API 서버에 연결할 수 없습니다 (${e.message}). 서버 실행 여부와 FP_API_URL을 확인하세요.`;
  }
  return e instanceof Error ? e.message : String(e);
}

export async function runCli(argv: readonly string[], deps: CliDeps): Promise<number> {
  const { env, cwd } = deps;
  const out = deps.stdout;
  const makeClient = deps.createClient ?? ((o) => createApiClient(o));
  const newKey = deps.newKey ?? randomUUID;

  let parsed;
  try {
    parsed = parseArgs({
      args: [...argv],
      allowPositionals: true,
      strict: true,
      options: {
        json: { type: "boolean" },
        force: { type: "boolean" },
        yes: { type: "boolean" },
        help: { type: "boolean", short: "h" },
        minutes: { type: "string" },
        focus: { type: "string" },
        dir: { type: "string" },
      },
    });
  } catch (e) {
    deps.stderr(`${(e as Error).message}\n\n${USAGE}`);
    return 2;
  }
  const { values: opts, positionals } = parsed;
  const [command, ...args] = positionals;
  const json = opts.json ?? false;

  if (!command || opts.help || command === "help") {
    out(USAGE);
    return command || opts.help ? 0 : 2;
  }

  let config: CliConfig = {};
  const apiUrl = () => env.FP_API_URL || config.apiUrl || DEFAULT_API_URL;
  const anon = () => makeClient({ baseUrl: apiUrl() });
  const authed = (): CliApi => {
    const token = env.FP_TOKEN || config.token;
    if (!token) throw new CliError("로그인이 필요합니다. `fp login <이름>`을 먼저 실행하세요.");
    return makeClient({ baseUrl: apiUrl(), token });
  };
  const update = async (patch: Partial<CliConfig>) => {
    config = { ...config, ...patch };
    await saveConfig(env, config);
  };
  /** Prints human text, or the data as JSON with --json. */
  const emit = (data: unknown, text: string) => out(json ? JSON.stringify(data, null, 2) : text);
  const rel = (p: string) => relative(cwd, p) || ".";

  /** Project dir: explicit arg > --dir > cwd if it is a project > last written project. */
  const projectDir = async (explicit?: string): Promise<{ dir: string; meta: ProjectMeta }> => {
    const given = explicit ?? opts.dir;
    const candidates = given ? [resolve(cwd, given)] : [cwd, ...(config.lastWorkDir ? [config.lastWorkDir] : [])];
    for (const dir of candidates) {
      const meta = await readMeta(dir);
      if (meta) return { dir, meta };
    }
    const where = candidates[0] ?? cwd;
    throw new CliError(`문제 디렉터리를 찾을 수 없습니다 (${rel(where)}에 ${META_FILE} 없음). \`fp next\`로 문제를 먼저 받으세요.`);
  };

  /** Writes the session's current exercise to ./fp-work and prints where it went. */
  const materialize = async (api: CliApi, session: Session, header: string): Promise<number> => {
    const item = session.currentIndex === null ? undefined : session.items.find((i) => i.index === session.currentIndex);
    if (!item) {
      emit({ session, project: null }, `${header}\n${formatSession(session)}\n\n세션의 모든 문제를 마쳤습니다. \`fp progress\`로 결과를 확인하세요.`);
      return 0;
    }
    const view = await api.exercise(item.exerciseId);
    const report = await writeProject(cwd, view, { force: opts.force ?? false, sessionId: session.id });
    await update({ lastWorkDir: report.dir });
    const ex = view.exercise;
    const lines = [
      header,
      formatSession(session),
      "",
      `현재 문제: ${ex.title} (${ex.id})`,
      `  이유: ${item.reason}`,
      `  디렉터리: ${rel(report.dir)}`,
      `  문제 설명: ${rel(resolve(report.dir, "PROMPT.md"))}`,
      `  작성할 파일: ${rel(resolve(report.dir, learnerFile(ex)))}`,
    ];
    for (const k of report.kept) lines.push(`  유지됨: ${k} (수정된 파일이라 덮어쓰지 않았습니다. 시작 코드로 되돌리려면 --force)`);
    lines.push("", "코드를 작성한 뒤 `fp run`으로 확인하고 `fp submit`으로 제출하세요.");
    emit({ session, item, exerciseId: ex.id, dir: report.dir, written: report.written, kept: report.kept }, lines.join("\n"));
    return 0;
  };

  const activeOrFail = async (api: CliApi): Promise<Session> => {
    const s = await api.activeSession(LANGUAGE);
    if (!s) throw new CliError("진행 중인 세션이 없습니다. `fp start`로 시작하세요.");
    return s;
  };

  try {
    config = await loadConfig(env);
    switch (command) {
      case "login": {
        const name = args.join(" ").trim();
        if (!name) throw new CliError("사용법: fp login <이름>", 2);
        const res = await anon().devLogin({ displayName: name });
        await update({ apiUrl: apiUrl(), token: res.token.token, user: { id: res.user.id, displayName: res.user.displayName } });
        emit({ user: res.user, configPath: configPath(env) }, `${res.user.displayName}(으)로 로그인했습니다. 설정: ${configPath(env)}`);
        return 0;
      }
      case "whoami": {
        const me = await authed().me();
        emit({ user: me, apiUrl: apiUrl() }, `${me.displayName} (${me.id}) @ ${apiUrl()}`);
        return 0;
      }
      case "start": {
        const minutes = opts.minutes === undefined ? 15 : Number(opts.minutes);
        if (!Number.isInteger(minutes) || minutes <= 0) throw new CliError("--minutes는 양의 정수여야 합니다.", 2);
        const api = authed();
        const session = await api.startSession({
          language: LANGUAGE,
          targetMinutes: minutes,
          ...(opts.focus ? { focusSkill: opts.focus } : {}),
        });
        return await materialize(api, session, "새 세션을 시작했습니다.");
      }
      case "next":
      case "current": {
        const api = authed();
        return await materialize(api, await activeOrFail(api), "진행 중인 세션입니다.");
      }
      case "skip": {
        const api = authed();
        const session = await activeOrFail(api);
        return await materialize(api, await api.skipItem(session.id), "현재 문제를 건너뛰었습니다.");
      }
      case "run": {
        const { dir, meta } = await projectDir(args[0]);
        const code = await readLearnerCode(dir, meta);
        const run = await authed().trialRun(meta.exerciseId, { code });
        emit(run, formatTrialRun(run));
        return run.outcome === "passed" ? 0 : 1;
      }
      case "submit": {
        const { dir, meta } = await projectDir(args[0]);
        const code = await readLearnerCode(dir, meta);
        const api = authed();
        // Link to the session only while this exercise is still its current item.
        const active = await api.activeSession(LANGUAGE).catch(() => null);
        const current = active?.currentIndex == null ? undefined : active.items.find((i) => i.index === active.currentIndex);
        const sessionId = active && current?.exerciseId === meta.exerciseId ? active.id : undefined;
        const view = await api.submit({ exerciseId: meta.exerciseId, code, idempotencyKey: newKey(), ...(sessionId ? { sessionId } : {}) });
        await update({ lastSubmissionId: view.submission.id });
        const next = view.submission.evaluation?.outcome === "passed" && sessionId ? "\n다음 문제: `fp next`" : "";
        emit(view, formatSubmission(view) + next);
        return view.submission.evaluation?.outcome === "passed" ? 0 : 1;
      }
      case "feedback": {
        const arg = args[0];
        const id = !arg || arg === "last" ? config.lastSubmissionId : arg;
        if (!id) throw new CliError("최근 제출이 없습니다. 제출 ID를 지정하세요: fp feedback <제출ID>");
        const fb = await authed().feedback(id);
        emit(fb, formatFeedback(fb));
        return 0;
      }
      case "hint": {
        const { meta } = await projectDir();
        const api = authed();
        let level: number;
        if (args[0] !== undefined) {
          level = Number(args[0]);
          if (!Number.isInteger(level) || level < 1 || level > 5) throw new CliError("힌트 단계는 1-5 사이의 정수입니다.", 2);
        } else {
          const view = await api.exercise(meta.exerciseId);
          const revealed = view.revealedHints.reduce((m, h) => Math.max(m, h.level), 0);
          if (revealed >= view.exercise.hints.length) {
            emit({ hints: view.revealedHints }, `모든 힌트를 이미 공개했습니다.\n\n${formatHints(view.revealedHints)}`);
            return 0;
          }
          level = revealed + 1;
        }
        const hints = await api.revealHint(meta.exerciseId, { level });
        const warn = level >= 3 ? "\n\n참고: 힌트 3단계 이상을 사용해 이 문제의 제출은 레이팅에 반영되지 않습니다." : "";
        emit({ level, hints }, formatHints(hints) + warn);
        return 0;
      }
      case "explain": {
        const { meta } = await projectDir();
        if (!opts.yes) {
          throw new CliError(
            "해설을 보면 이 문제는 레이팅에 반영되지 않고, 숙달 여부는 새 문제에서 다시 확인됩니다.\n먼저 `fp hint`를 권합니다. 그래도 보려면 `fp explain --yes`를 실행하세요.",
          );
        }
        const ex = await authed().explanation(meta.exerciseId);
        emit(ex, formatExplanation(ex));
        return 0;
      }
      case "progress": {
        const p = await authed().progress(LANGUAGE);
        emit(p, formatProgress(p));
        return 0;
      }
      case "token": {
        const [sub, ...rest] = args;
        const label = rest.join(" ").trim();
        if (sub !== "issue" || !label) throw new CliError("사용법: fp token issue <라벨>", 2);
        const t = await authed().issueToken({ label });
        const mcp = { mcpServers: { fp: { command: "fp-mcp", env: { FP_TOKEN: t.token, FP_API_URL: apiUrl() } } } };
        emit(
          { token: t, mcpConfig: mcp },
          `토큰 발급됨 (${t.label}, ${t.tokenId}). 이 값은 다시 표시되지 않습니다:\n\n${t.token}\n\nMCP 설정 예:\n${JSON.stringify(mcp, null, 2)}`,
        );
        return 0;
      }
      default:
        deps.stderr(`알 수 없는 명령: ${command}\n\n${USAGE}`);
        return 2;
    }
  } catch (e) {
    const msg = describeError(e);
    if (json) out(JSON.stringify({ error: e instanceof ApiError ? { code: e.code, message: e.message, status: e.status } : { message: msg } }, null, 2));
    deps.stderr(msg);
    return e instanceof CliError ? e.exitCode : 1;
  }
}
