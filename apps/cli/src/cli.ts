import { randomUUID } from "node:crypto";
import { relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import { ApiError, createApiClient } from "@fp/api-contract";
import type { ApiClient, Language, Quiz, Session } from "@fp/api-contract";
import { DEFAULT_API_URL, configPath, loadConfig, saveConfig } from "./config.ts";
import type { CliConfig, ConfigEnv } from "./config.ts";
import {
  exerciseBlocks,
  formatAnswer,
  formatCheckpointResult,
  formatCourse,
  formatLesson,
  formatLessonDone,
  formatPlacementResult,
  formatQuiz,
  formatQuizHeader,
  formatQuizItem,
  nextStepLine,
} from "./course.ts";
import {
  formatExplanation,
  formatFeedback,
  formatHints,
  formatProgress,
  formatSession,
  formatSubmission,
  formatTrialRun,
} from "./format.ts";
import {
  DEFAULT_LOCALE,
  LocalizedError,
  isLocale,
  localeName,
  msg,
  normalizeLocale,
  resolveLocale,
  sourceLabel,
  systemLocale,
} from "./messages.ts";
import type { Locale, LocaleSource, MessageId, MessageParams, SystemLocaleEnv } from "./messages.ts";
import { META_FILE, learnerFile, readLearnerCode, readMeta, writeProject } from "./project.ts";
import type { ProjectMeta } from "./project.ts";
import type { Prompter } from "./prompt.ts";

/** API methods the CLI uses; tests pass a hand-written fake. */
export type CliApi = Pick<
  ApiClient,
  | "devLogin"
  | "me"
  | "updateMe"
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
  | "course"
  | "lesson"
  | "lessonAnswer"
  | "lessonComplete"
  | "startCheckpoint"
  | "submitCheckpoint"
  | "startPlacement"
  | "submitPlacement"
>;

export interface CliEnv extends ConfigEnv, SystemLocaleEnv {
  readonly FP_API_URL?: string | undefined;
  readonly FP_TOKEN?: string | undefined;
  /** Display language override (ko, en, zh; "en_US.UTF-8"-style values are accepted). */
  readonly FP_LANG?: string | undefined;
}

export interface CliDeps {
  readonly env: CliEnv;
  readonly cwd: string;
  readonly stdout: (text: string) => void;
  readonly stderr: (text: string) => void;
  readonly createClient?: (opts: { readonly baseUrl: string; readonly token?: string }) => CliApi;
  readonly newKey?: () => string;
  /** True when stdin is a terminal: checkpoint/placement then ask one item at a time (unless --json). */
  readonly stdinIsTTY?: boolean;
  /** Creates the line prompter for interactive quizzes (main.ts: node:readline on stdin/stdout). */
  readonly prompter?: () => Prompter;
}

const LANGUAGE: Language = "gleam";

/** Usage text in `locale` (default Korean). */
export function usage(locale: Locale = DEFAULT_LOCALE): string {
  return msg(locale, "usage");
}

/** Korean usage, kept for callers that print help without a locale. */
export const USAGE = usage();

/** Expected, user-facing failure: printed without a stack trace. */
class CliError extends LocalizedError {}

/** Commands that render with the account locale; they fetch /v1/me unless --lang/FP_LANG decide. */
const ACCOUNT_LOCALE_COMMANDS = new Set([
  "start",
  "next",
  "current",
  "skip",
  "run",
  "submit",
  "feedback",
  "hint",
  "explain",
  "progress",
  "token",
  "course",
  "lesson",
  "answer",
  "lesson-done",
  "checkpoint",
  "placement",
]);

type QuizKind = "checkpoint" | "placement";
type QuizAnswers = Record<string, number | null>;

/** "<unit>/<lesson>" -> ids; anything else is a usage error with `usageId`. */
function parseLessonRef(value: string | undefined, usageId: MessageId): { unitId: string; lessonId: string } {
  const slash = value?.indexOf("/") ?? -1;
  const unitId = value?.slice(0, slash) ?? "";
  const lessonId = value?.slice(slash + 1) ?? "";
  if (slash <= 0 || !lessonId || lessonId.includes("/")) throw new CliError(usageId, {}, 2);
  return { unitId, lessonId };
}

/** "--answers a=0,b=2,c=" -> { a: 0, b: 2, c: null }. Indexes are 0-based like the API; empty or "-" skips. */
export function parseAnswers(value: string): QuizAnswers {
  const answers: QuizAnswers = {};
  const parts = value
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p !== "");
  if (parts.length === 0) throw new CliError("answersInvalid", { value }, 2);
  for (const part of parts) {
    const eq = part.lastIndexOf("=");
    const id = part.slice(0, eq).trim();
    const raw = part.slice(eq + 1).trim();
    if (eq <= 0 || !id) throw new CliError("answersInvalid", { value: part }, 2);
    if (raw === "" || raw === "-") answers[id] = null;
    else if (/^\d+$/.test(raw)) answers[id] = Number(raw);
    else throw new CliError("answersInvalid", { value: part }, 2);
  }
  return answers;
}

function describeError(e: unknown, locale: Locale): string {
  const m = (id: MessageId, params?: MessageParams) => msg(locale, id, params);
  if (e instanceof LocalizedError) return e.render(locale);
  if (e instanceof ApiError) {
    switch (e.code) {
      case "unauthorized":
        return m("errUnauthorized");
      case "not_found":
        return m("errNotFound", { message: e.message });
      case "invalid_input":
        return m("errInvalidInput", { message: e.message });
      case "conflict":
        return m("errConflict", { message: e.message });
      case "rate_limited":
        return m("errRateLimited");
      default:
        return m("errServer", { status: e.status, code: e.code, message: e.message });
    }
  }
  if (e instanceof TypeError && /fetch/i.test(e.message)) return m("errConnect", { message: e.message });
  return e instanceof Error ? e.message : String(e);
}

/** Finds --lang in raw argv (used when parseArgs itself failed). */
function scanLangFlag(argv: readonly string[]): Locale | undefined {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] ?? "";
    if (a === "--lang") return normalizeLocale(argv[i + 1]);
    if (a.startsWith("--lang=")) return normalizeLocale(a.slice("--lang=".length));
  }
  return undefined;
}

export async function runCli(argv: readonly string[], deps: CliDeps): Promise<number> {
  const { env, cwd } = deps;
  const out = deps.stdout;
  const makeClient = deps.createClient ?? ((o) => createApiClient(o));
  const newKey = deps.newKey ?? randomUUID;
  const system = systemLocale(env);

  // The config may hold the cached account locale; a broken file is reported later as a command error.
  let config: CliConfig = {};
  let configError: unknown = null;
  try {
    config = await loadConfig(env);
  } catch (e) {
    configError = e;
  }
  const cachedLocale = (): Locale | undefined => (config.locale && isLocale(config.locale) ? config.locale : undefined);

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
        lang: { type: "string" },
        answers: { type: "string" },
        quiz: { type: "string" },
      },
    });
  } catch (e) {
    const { locale } = resolveLocale({ flag: scanLangFlag(argv), env: env.FP_LANG, config: cachedLocale(), system });
    deps.stderr(`${(e as Error).message}\n\n${usage(locale)}`);
    return 2;
  }
  const { values: opts, positionals } = parsed;
  const [command, ...args] = positionals;
  const json = opts.json ?? false;

  const flag = normalizeLocale(opts.lang);
  /** Locale before asking the server: everything except the live account locale. */
  let resolved = resolveLocale({ flag, env: env.FP_LANG, config: cachedLocale(), system });
  let locale: Locale = resolved.locale;
  const t = (id: MessageId, params?: MessageParams) => msg(locale, id, params);

  if (opts.lang !== undefined && !flag) {
    deps.stderr(`${t("invalidLangFlag", { value: opts.lang })}\n\n${usage(locale)}`);
    return 2;
  }
  if (!command || opts.help || command === "help") {
    out(usage(locale));
    return command || opts.help ? 0 : 2;
  }

  const apiUrl = () => env.FP_API_URL || config.apiUrl || DEFAULT_API_URL;
  const anon = () => makeClient({ baseUrl: apiUrl() });
  const token = () => env.FP_TOKEN || config.token;
  const authed = (): CliApi => {
    const tok = token();
    if (!tok) throw new CliError("loginRequired");
    return makeClient({ baseUrl: apiUrl(), token: tok });
  };
  const update = async (patch: Partial<CliConfig>) => {
    config = { ...config, ...patch };
    await saveConfig(env, config);
  };
  /** Applies the account locale (live from the server) and caches it for offline output. */
  const useAccountLocale = async (account: Locale) => {
    resolved = resolveLocale({ flag, env: env.FP_LANG, account, config: cachedLocale(), system });
    locale = resolved.locale;
    // Cache only for the account the config file belongs to (FP_TOKEN may point at another one).
    if (config.locale !== account && config.token && !env.FP_TOKEN) await update({ locale: account });
  };
  /** Fetches /v1/me for its locale when neither --lang nor FP_LANG decides. Best effort. */
  const loadAccountLocale = async () => {
    if (resolved.source === "flag" || resolved.source === "env" || !token()) return;
    try {
      const me = await authed().me();
      if (me.locale && isLocale(me.locale)) await useAccountLocale(me.locale);
    } catch {
      // The command itself reports API problems; the cached/system locale stays in effect.
    }
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
    throw new CliError("projectNotFound", { where: rel(where), meta: META_FILE });
  };

  /** Writes the session's current exercise to ./fp-work and prints where it went. */
  const materialize = async (api: CliApi, session: Session, header: MessageId): Promise<number> => {
    const item = session.currentIndex === null ? undefined : session.items.find((i) => i.index === session.currentIndex);
    if (!item) {
      emit({ session, project: null }, `${t(header)}\n${formatSession(session, locale)}\n\n${t("sessionDone")}`);
      return 0;
    }
    const view = await api.exercise(item.exerciseId);
    const report = await writeProject(cwd, view, { force: opts.force ?? false, sessionId: session.id, locale });
    await update({ lastWorkDir: report.dir });
    const ex = view.exercise;
    const lines = [
      t(header),
      formatSession(session, locale),
      "",
      t("currentExercise", { title: ex.title, id: ex.id }),
      t("itemReason", { reason: item.reason }),
      t("itemDir", { path: rel(report.dir) }),
      t("itemPrompt", { path: rel(resolve(report.dir, "PROMPT.md")) }),
      t("itemLearnerFile", { path: rel(resolve(report.dir, learnerFile(ex))) }),
    ];
    for (const k of report.kept) lines.push(t("itemKept", { path: k }));
    lines.push("", t("itemNextSteps"));
    emit({ session, item, exerciseId: ex.id, dir: report.dir, written: report.written, kept: report.kept }, lines.join("\n"));
    return 0;
  };

  const activeOrFail = async (api: CliApi): Promise<Session> => {
    const s = await api.activeSession(LANGUAGE);
    if (!s) throw new CliError("noActiveSession");
    return s;
  };

  // ---------- checkpoint and placement ----------

  const forgetQuiz = async (quizId: string) => {
    if (config.lastQuiz?.id !== quizId) return;
    const { lastQuiz: _done, ...rest } = config;
    config = rest;
    await saveConfig(env, config);
  };

  const submitQuiz = async (api: CliApi, kind: QuizKind, quizId: string, answers: QuizAnswers, quiz?: Quiz): Promise<number> => {
    if (kind === "checkpoint") {
      const res = await api.submitCheckpoint(quizId, { answers });
      await forgetQuiz(quizId);
      emit(res, formatCheckpointResult(res, quiz, locale));
      return res.passed ? 0 : 1;
    }
    const res = await api.submitPlacement(quizId, { answers });
    await forgetQuiz(quizId);
    emit(res, formatPlacementResult(res, quiz, locale));
    return 0;
  };

  /** One item at a time; the answers are only checked (and revealed) after the whole quiz is submitted. */
  const askQuiz = async (prompter: Prompter, quiz: Quiz): Promise<QuizAnswers> => {
    const answers: QuizAnswers = {};
    out(formatQuizHeader(quiz, locale));
    for (const [i, item] of quiz.items.entries()) {
      out(`\n${formatQuizItem(item, i + 1, quiz.items.length, locale)}\n`);
      const max = item.choices.length;
      for (;;) {
        const line = await prompter.ask(t("quizAsk", { max }));
        if (line === null) throw new CliError("quizAborted");
        const v = line.trim();
        if (v === "") {
          answers[item.itemId] = null;
          break;
        }
        const n = Number(v);
        if (/^\d+$/.test(v) && n >= 1 && n <= max) {
          answers[item.itemId] = n - 1;
          break;
        }
        out(t("quizInvalidChoice", { max }));
      }
    }
    return answers;
  };

  const takeQuiz = async (kind: QuizKind, unitId?: string): Promise<number> => {
    const api = authed();
    const command = kind === "placement" ? "fp placement" : `fp checkpoint ${unitId ?? ""}`;
    if (opts.answers !== undefined) {
      const answers = parseAnswers(opts.answers);
      const last = config.lastQuiz;
      const remembered = last && last.kind === kind && (kind === "placement" || last.unitId === unitId) ? last.id : undefined;
      const quizId = opts.quiz ?? remembered;
      if (!quizId) throw new CliError("quizIdMissing", { command }, 2);
      return await submitQuiz(api, kind, quizId, answers);
    }
    if (opts.quiz !== undefined) throw new CliError(kind === "placement" ? "placementUsage" : "checkpointUsage", {}, 2);
    const quiz = kind === "placement" ? await api.startPlacement() : await api.startCheckpoint(unitId ?? "");
    const prompter = !json && deps.stdinIsTTY && deps.prompter ? deps.prompter() : null;
    if (!prompter) {
      await update({ lastQuiz: { id: quiz.quizId, kind, ...(unitId ? { unitId } : {}) } });
      emit(quiz, formatQuiz(quiz, locale));
      return 0;
    }
    let answers: QuizAnswers;
    try {
      answers = await askQuiz(prompter, quiz);
    } finally {
      prompter.close();
    }
    out(t("quizSubmitting"));
    return await submitQuiz(api, kind, quiz.quizId, answers, quiz);
  };

  const showLocale = (source: LocaleSource) =>
    emit({ locale, source }, t("langCurrent", { name: localeName(locale, locale), locale, source: sourceLabel(locale, source) }));

  try {
    if (configError) throw configError;
    if (ACCOUNT_LOCALE_COMMANDS.has(command)) await loadAccountLocale();
    switch (command) {
      case "login": {
        const name = args.join(" ").trim();
        if (!name) throw new CliError("loginUsage", {}, 2);
        // An explicit preference (--lang, FP_LANG, or `fp lang` while logged out) is applied to the account.
        const preferred = flag ?? normalizeLocale(env.FP_LANG) ?? cachedLocale();
        const res = await anon().devLogin({ displayName: name, ...(preferred ? { locale: preferred } : {}) });
        await update({
          apiUrl: apiUrl(),
          token: res.token.token,
          user: { id: res.user.id, displayName: res.user.displayName },
          ...(res.user.locale && isLocale(res.user.locale) ? { locale: res.user.locale } : {}),
        });
        if (res.user.locale && isLocale(res.user.locale)) await useAccountLocale(res.user.locale);
        emit({ user: res.user, configPath: configPath(env) }, t("loggedIn", { name: res.user.displayName, path: configPath(env) }));
        return 0;
      }
      case "whoami": {
        const me = await authed().me();
        if (me.locale && isLocale(me.locale)) await useAccountLocale(me.locale);
        emit({ user: me, apiUrl: apiUrl() }, `${me.displayName} (${me.id}) @ ${apiUrl()}`);
        return 0;
      }
      case "lang": {
        const [value, ...extra] = args;
        if (extra.length > 0) throw new CliError("langUsage", {}, 2);
        if (value === undefined) {
          await loadAccountLocale();
          showLocale(resolved.source);
          return 0;
        }
        const chosen = normalizeLocale(value);
        if (!chosen || chosen !== value.trim().toLowerCase()) throw new CliError("langInvalid", { value }, 2);
        const synced = Boolean(token());
        const user = synced ? await authed().updateMe({ locale: chosen }) : null;
        const saved = user?.locale && isLocale(user.locale) ? user.locale : chosen;
        await update({ locale: saved });
        // Confirm in the new language unless --lang asks for another one for this run.
        locale = flag ?? saved;
        const name = localeName(locale, saved);
        const lines = [t(synced ? "langSet" : "langSavedLocally", { name, locale: saved })];
        const envLocale = normalizeLocale(env.FP_LANG);
        if (envLocale && envLocale !== saved) lines.push(t("langOverridden", { value: env.FP_LANG ?? "" }));
        emit({ locale: saved, synced, ...(user ? { user } : {}) }, lines.join("\n"));
        return 0;
      }
      case "start": {
        const minutes = opts.minutes === undefined ? 15 : Number(opts.minutes);
        if (!Number.isInteger(minutes) || minutes <= 0) throw new CliError("minutesInvalid", {}, 2);
        const api = authed();
        const session = await api.startSession({
          language: LANGUAGE,
          targetMinutes: minutes,
          ...(opts.focus ? { focusSkill: opts.focus } : {}),
        });
        return await materialize(api, session, "sessionStarted");
      }
      case "next":
      case "current": {
        const api = authed();
        return await materialize(api, await activeOrFail(api), "sessionActive");
      }
      case "skip": {
        const api = authed();
        const session = await activeOrFail(api);
        return await materialize(api, await api.skipItem(session.id), "itemSkipped");
      }
      case "run": {
        const { dir, meta } = await projectDir(args[0]);
        const code = await readLearnerCode(dir, meta);
        const run = await authed().trialRun(meta.exerciseId, { code });
        emit(run, formatTrialRun(run, locale));
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
        const next = view.submission.evaluation?.outcome === "passed" && sessionId ? `\n${t("nextExercise")}` : "";
        emit(view, formatSubmission(view, locale) + next);
        return view.submission.evaluation?.outcome === "passed" ? 0 : 1;
      }
      case "feedback": {
        const arg = args[0];
        const id = !arg || arg === "last" ? config.lastSubmissionId : arg;
        if (!id) throw new CliError("noRecentSubmission");
        const fb = await authed().feedback(id);
        emit(fb, formatFeedback(fb, locale));
        return 0;
      }
      case "hint": {
        const { meta } = await projectDir();
        const api = authed();
        let level: number;
        if (args[0] !== undefined) {
          level = Number(args[0]);
          if (!Number.isInteger(level) || level < 1 || level > 5) throw new CliError("hintLevelInvalid", {}, 2);
        } else {
          const view = await api.exercise(meta.exerciseId);
          const revealed = view.revealedHints.reduce((m, h) => Math.max(m, h.level), 0);
          if (revealed >= view.exercise.hints.length) {
            emit({ hints: view.revealedHints }, `${t("allHintsRevealed")}\n\n${formatHints(view.revealedHints, locale)}`);
            return 0;
          }
          level = revealed + 1;
        }
        const hints = await api.revealHint(meta.exerciseId, { level });
        const warn = level >= 3 ? `\n\n${t("hintUnratedWarning")}` : "";
        emit({ level, hints }, formatHints(hints, locale) + warn);
        return 0;
      }
      case "explain": {
        const { meta } = await projectDir();
        if (!opts.yes) throw new CliError("explainConfirm");
        const ex = await authed().explanation(meta.exerciseId);
        emit(ex, formatExplanation(ex, locale));
        return 0;
      }
      case "progress": {
        const p = await authed().progress(LANGUAGE);
        emit(p, formatProgress(p, locale));
        return 0;
      }
      case "course": {
        const course = await authed().course();
        emit(course, formatCourse(course, locale));
        return 0;
      }
      case "lesson": {
        const [target = "next", ...extra] = args;
        if (extra.length > 0) throw new CliError("lessonUsage", {}, 2);
        const api = authed();
        let ref: { unitId: string; lessonId: string };
        if (target === "next") {
          const { next } = await api.course();
          if (next.kind !== "lesson") {
            emit({ next }, nextStepLine(next, locale));
            return 0;
          }
          ref = { unitId: next.unitId, lessonId: next.lessonId };
        } else if (!target.includes("/")) {
          // A bare unit id opens its first lesson that is not completed yet.
          const unit = (await api.course()).units.find((u) => u.id === target);
          const done = new Set(unit?.progress.lessonsCompleted ?? []);
          const lessonId = unit?.lessonIds.find((id) => !done.has(id)) ?? unit?.lessonIds[0];
          if (!lessonId) throw new CliError("unitNotFound", { unit: target });
          ref = { unitId: target, lessonId };
        } else {
          ref = parseLessonRef(target, "lessonUsage");
        }
        const view = await api.lesson(ref.unitId, ref.lessonId);
        emit(view, formatLesson(view, locale));
        return 0;
      }
      case "answer": {
        const [refArg, exerciseArg, choiceArg, ...extra] = args;
        if (!exerciseArg || !choiceArg || extra.length > 0) throw new CliError("answerUsage", {}, 2);
        const ref = parseLessonRef(refArg, "answerUsage");
        const giveUp = choiceArg.trim().toLowerCase() === "show";
        let choice: number | null = null;
        if (!giveUp) {
          if (!/^\d+$/.test(choiceArg.trim()) || Number(choiceArg) < 1) throw new CliError("answerChoiceInvalid", { value: choiceArg }, 2);
          choice = Number(choiceArg) - 1;
        }
        const api = authed();
        let exerciseId = exerciseArg;
        if (/^\d+$/.test(exerciseArg)) {
          // Exercise number as printed by `fp lesson`.
          const exercises = exerciseBlocks((await api.lesson(ref.unitId, ref.lessonId)).lesson);
          const ex = exercises[Number(exerciseArg) - 1];
          if (!ex) throw new CliError("exerciseNumberInvalid", { n: exerciseArg, total: exercises.length }, 2);
          if (choice !== null && choice >= ex.choices.length) throw new CliError("answerChoiceInvalid", { value: choiceArg }, 2);
          exerciseId = ex.id;
        }
        const res = await api.lessonAnswer(ref.unitId, ref.lessonId, { exerciseId, choice, ...(giveUp ? { giveUp: true } : {}) });
        emit(res, formatAnswer(res, giveUp, locale));
        return res.correct || giveUp ? 0 : 1;
      }
      case "lesson-done": {
        const [refArg, ...extra] = args;
        if (extra.length > 0) throw new CliError("lessonDoneUsage", {}, 2);
        const ref = parseLessonRef(refArg, "lessonDoneUsage");
        const api = authed();
        const progress = await api.lessonComplete(ref.unitId, ref.lessonId);
        // The next step is a convenience; completing the lesson already succeeded.
        const next = await api.course().then(
          (c) => c.next,
          () => null,
        );
        emit({ progress, next }, formatLessonDone(`${ref.unitId}/${ref.lessonId}`, progress, next, locale));
        return 0;
      }
      case "checkpoint": {
        const [unitId, ...extra] = args;
        if (!unitId || extra.length > 0) throw new CliError("checkpointUsage", {}, 2);
        return await takeQuiz("checkpoint", unitId);
      }
      case "placement": {
        if (args.length > 0) throw new CliError("placementUsage", {}, 2);
        return await takeQuiz("placement");
      }
      case "token": {
        const [sub, ...rest] = args;
        const label = rest.join(" ").trim();
        if (sub !== "issue" || !label) throw new CliError("tokenUsage", {}, 2);
        const tk = await authed().issueToken({ label });
        const mcp = { mcpServers: { fp: { command: "fp-mcp", env: { FP_TOKEN: tk.token, FP_API_URL: apiUrl() } } } };
        emit({ token: tk, mcpConfig: mcp }, t("tokenIssued", { label: tk.label, id: tk.tokenId, token: tk.token, config: JSON.stringify(mcp, null, 2) }));
        return 0;
      }
      default:
        deps.stderr(`${t("unknownCommand", { command })}\n\n${usage(locale)}`);
        return 2;
    }
  } catch (e) {
    const message = describeError(e, locale);
    if (json) out(JSON.stringify({ error: e instanceof ApiError ? { code: e.code, message: e.message, status: e.status } : { message } }, null, 2));
    deps.stderr(message);
    return e instanceof LocalizedError ? e.exitCode : 1;
  }
}
