/**
 * HTTP mapping only: authentication, validation, rate limiting, and composition of module calls into
 * the DTOs of @fp/api-contract. No business rules live here.
 */
import { Hono } from "hono";
import type { Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { appError, asId, silentLogger, systemClock } from "@fp/kernel";
import type { AppError, Clock, ExerciseId, Logger, SessionId, SubmissionId } from "@fp/kernel";
import { ROUTES } from "@fp/api-contract";
import type {
  DevLoginResponse,
  ExerciseView,
  HealthResponse,
  ProgressView,
  SubmissionView,
} from "@fp/api-contract";
import type { AccountsService, User } from "@fp/accounts/contract";
import type { ContentCatalog, ExerciseDetail } from "@fp/content/contract";
import type { GradingService } from "@fp/grading/contract";
import type { LearnerModel } from "@fp/learner/contract";
import type { SessionService } from "@fp/sessions/contract";
import type { CoachingService } from "@fp/coaching/contract";
import { fail, json, parseBody, parseQuery, respond } from "./http.ts";
import { createRateLimiter } from "./rate-limit.ts";
import type { RateLimitRule } from "./rate-limit.ts";
import * as s from "./schemas.ts";

export interface AppServices {
  readonly accounts: AccountsService;
  readonly catalog: ContentCatalog;
  readonly grading: GradingService;
  readonly learner: LearnerModel;
  readonly sessions: SessionService;
  readonly coaching: CoachingService;
}

export type RateLimitedAction = "submit" | "run" | "chat" | "feedback";

export interface AppOptions {
  readonly clock?: Clock;
  readonly logger?: Logger;
  /** Allowed CORS origin for the web app. */
  readonly webOrigin?: string;
  /** Runner label reported by /v1/health, e.g. "docker:fp-gleam-runner:1.18.1". */
  readonly runner?: string;
  readonly llm?: HealthResponse["llm"];
  /** Per user and action. Default 30 per minute. */
  readonly rateLimit?: RateLimitRule;
  readonly maxBodyBytes?: number;
}

type AppEnv = { Variables: { user: User } };
export type ApiApp = Hono<AppEnv>;

const PUBLIC_PATHS: ReadonlySet<string> = new Set([ROUTES.health.path, ROUTES.devLogin.path]);
const DEFAULT_RATE_LIMIT: RateLimitRule = { limit: 30, windowMs: 60_000 };

const notFound = (what: string): AppError => appError("not_found", `${what}을(를) 찾을 수 없습니다.`);

/**
 * The learner-facing view hides content the help ledger has not released: unrevealed hints keep
 * their level/kind but lose their text, and predict answers are never sent.
 */
export function redactExercise(ex: ExerciseDetail, maxHintLevel: number): ExerciseDetail {
  const hints = ex.hints.map((h) => (h.level <= maxHintLevel ? h : { ...h, markdown: "" }));
  const redacted: ExerciseDetail = { ...ex, hints };
  return ex.predict === undefined ? redacted : { ...redacted, predict: { code: ex.predict.code, acceptedAnswers: [] } };
}

export function createApp(services: AppServices, options: AppOptions = {}): ApiApp {
  const { accounts, catalog, grading, learner, sessions, coaching } = services;
  const clock = options.clock ?? systemClock;
  const logger = options.logger ?? silentLogger;
  const rule = options.rateLimit ?? DEFAULT_RATE_LIMIT;
  const limiter = createRateLimiter(clock);

  const app = new Hono<AppEnv>();

  app.onError((e, c) => {
    logger.error("unhandled request error", {
      method: c.req.method,
      path: c.req.path,
      error: e instanceof Error ? (e.stack ?? e.message) : String(e),
    });
    return fail(c, appError("internal", "서버 내부 오류가 발생했습니다."));
  });
  app.notFound((c) => fail(c, appError("not_found", "요청한 경로를 찾을 수 없습니다.")));

  app.use(
    "/v1/*",
    cors({
      origin: options.webOrigin ?? "http://localhost:5173",
      allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
      allowHeaders: ["authorization", "content-type", "accept"],
      maxAge: 600,
    }),
  );
  app.use(
    "/v1/*",
    bodyLimit({
      maxSize: options.maxBodyBytes ?? 512 * 1024,
      onError: (c) => fail(c, appError("invalid_input", "요청 본문이 너무 큽니다."), 413),
    }),
  );

  app.use("/v1/*", async (c, next) => {
    if (PUBLIC_PATHS.has(c.req.path)) return next();
    const match = /^Bearer\s+(\S+)\s*$/i.exec(c.req.header("authorization") ?? "");
    const token = match?.[1];
    if (token === undefined) return fail(c, appError("unauthorized", "로그인이 필요합니다."));
    const user = await accounts.authenticate(token);
    if (user === null) return fail(c, appError("unauthorized", "인증 토큰이 유효하지 않거나 만료되었습니다."));
    c.set("user", user);
    return next();
  });

  /** Returns a 429 response when the user exceeded the limit for `action`, otherwise null. */
  function limited(c: Context<AppEnv>, action: RateLimitedAction): Response | null {
    const decision = limiter.check(`${c.get("user").id}:${action}`, rule);
    if (decision.allowed) return null;
    const retryAfterSeconds = Math.max(1, Math.ceil(decision.retryAfterMs / 1000));
    c.header("retry-after", String(retryAfterSeconds));
    return fail(
      c,
      appError("rate_limited", "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.", { action, retryAfterSeconds }),
    );
  }

  const exerciseIdParam = (c: Context<AppEnv>): ExerciseId => asId<ExerciseId>(c.req.param("exerciseId") ?? "");

  // ---------- public ----------

  app.get(ROUTES.health.path, async (c) => {
    const bundle = await catalog.currentBundle();
    const body: HealthResponse = {
      status: "ok",
      contentBundle: bundle?.bundleId ?? null,
      runner: options.runner ?? "unknown",
      llm: options.llm ?? "none",
    };
    return json(c, body);
  });

  app.post(ROUTES.devLogin.path, async (c) => {
    const req = await parseBody(c, s.devLoginSchema);
    if (!req.ok) return fail(c, req.error);
    const r = await accounts.devLogin(req.value.displayName);
    if (!r.ok) return fail(c, r.error);
    const body: DevLoginResponse = { user: r.value.user, token: r.value.token };
    return json(c, body);
  });

  // ---------- accounts ----------

  app.get(ROUTES.me.path, (c) => json(c, c.get("user")));

  app.post(ROUTES.issueToken.path, async (c) => {
    const req = await parseBody(c, s.issueTokenSchema);
    if (!req.ok) return fail(c, req.error);
    return respond(c, await accounts.issueToken(c.get("user").id, req.value.label), 201);
  });

  app.get(ROUTES.listTokens.path, async (c) => json(c, await accounts.listTokens(c.get("user").id)));

  app.delete(ROUTES.revokeToken.path, async (c) => {
    const r = await accounts.revokeToken(c.get("user").id, c.req.param("tokenId") ?? "");
    return r.ok ? json(c, null) : fail(c, r.error);
  });

  // ---------- content ----------

  app.get(ROUTES.skills.path, async (c) => json(c, await catalog.listSkills()));

  app.get(ROUTES.exercises.path, async (c) => {
    const q = parseQuery(c, s.exerciseFilterSchema);
    if (!q.ok) return fail(c, q.error);
    const filter = Object.fromEntries(Object.entries(q.value).filter(([, v]) => v !== undefined));
    return json(c, await catalog.listExercises(filter));
  });

  app.get(ROUTES.exercise.path, async (c) => {
    const user = c.get("user");
    const id = exerciseIdParam(c);
    const ex = await catalog.getExercise(id);
    if (ex === null) return fail(c, notFound("문제"));
    const [conceptNotes, theoryTopics, help] = await Promise.all([
      catalog.getConceptNotes(ex.conceptNoteIds),
      catalog.getTheoryTopics(ex.theoryTopicIds),
      coaching.helpUsed(user.id, id),
    ]);
    const body: ExerciseView = {
      exercise: redactExercise(ex, help.maxHintLevel),
      conceptNotes,
      theoryTopics,
      revealedHints: ex.hints.filter((h) => h.level <= help.maxHintLevel),
    };
    return json(c, body);
  });

  app.get(ROUTES.theoryTopics.path, async (c) => json(c, await catalog.listTheoryTopics()));

  // ---------- grading ----------

  app.post(ROUTES.trialRun.path, async (c) => {
    const req = await parseBody(c, s.trialRunSchema);
    if (!req.ok) return fail(c, req.error);
    const blocked = limited(c, "run");
    if (blocked) return blocked;
    return respond(c, await grading.trialRun({ exerciseId: exerciseIdParam(c), code: req.value.code }));
  });

  app.post(ROUTES.submit.path, async (c) => {
    const req = await parseBody(c, s.submitSchema);
    if (!req.ok) return fail(c, req.error);
    const blocked = limited(c, "submit");
    if (blocked) return blocked;
    const user = c.get("user");
    const { exerciseId, code, idempotencyKey, sessionId } = req.value;
    const helpUsed = await coaching.helpUsed(user.id, exerciseId);
    const r = await grading.submit({
      userId: user.id,
      exerciseId,
      code,
      idempotencyKey,
      helpUsed,
      ...(sessionId === undefined ? {} : { sessionId }),
    });
    if (!r.ok) return fail(c, r.error);
    const body: SubmissionView = { submission: r.value, ratingChange: await learner.ratingChangeFor(r.value.id) };
    return json(c, body);
  });

  app.get(ROUTES.submission.path, async (c) => {
    const id = asId<SubmissionId>(c.req.param("submissionId") ?? "");
    const submission = await grading.getSubmission(id, c.get("user").id);
    if (submission === null) return fail(c, notFound("제출"));
    const body: SubmissionView = { submission, ratingChange: await learner.ratingChangeFor(submission.id) };
    return json(c, body);
  });

  // ---------- coaching ----------

  app.post(ROUTES.feedback.path, async (c) => {
    const blocked = limited(c, "feedback");
    if (blocked) return blocked;
    const id = asId<SubmissionId>(c.req.param("submissionId") ?? "");
    return respond(c, await coaching.feedback(id, c.get("user").id));
  });

  app.post(ROUTES.chat.path, async (c) => {
    const req = await parseBody(c, s.chatSchema);
    if (!req.ok) return fail(c, req.error);
    const blocked = limited(c, "chat");
    if (blocked) return blocked;
    const { exerciseId, code, submissionId, messages } = req.value;
    return respond(
      c,
      await coaching.chat({
        userId: c.get("user").id,
        exerciseId,
        messages,
        ...(code === undefined ? {} : { code }),
        ...(submissionId === undefined ? {} : { submissionId }),
      }),
    );
  });

  app.post(ROUTES.revealHint.path, async (c) => {
    const req = await parseBody(c, s.revealHintSchema);
    if (!req.ok) return fail(c, req.error);
    return respond(c, await coaching.revealHint(c.get("user").id, exerciseIdParam(c), req.value.level));
  });

  app.post(ROUTES.noteOpened.path, async (c) => {
    const req = await parseBody(c, s.noteOpenedSchema);
    if (!req.ok) return fail(c, req.error);
    const id = exerciseIdParam(c);
    if ((await catalog.getExercise(id)) === null) return fail(c, notFound("문제"));
    const kind = req.value.kind === "concept" ? "concept_note" : "theory_note";
    await coaching.recordHelp(c.get("user").id, id, kind, req.value.noteId);
    return json(c, null);
  });

  app.post(ROUTES.explanation.path, async (c) =>
    respond(c, await coaching.revealExplanation(c.get("user").id, exerciseIdParam(c))),
  );

  // ---------- sessions ----------
  // "/v1/sessions/active" must be registered before "/v1/sessions/:sessionId".

  app.get(ROUTES.activeSession.path, async (c) => {
    const q = parseQuery(c, s.languageQuerySchema);
    if (!q.ok) return fail(c, q.error);
    return json(c, await sessions.active(c.get("user").id, q.value.language));
  });

  app.post(ROUTES.startSession.path, async (c) => {
    const req = await parseBody(c, s.startSessionSchema);
    if (!req.ok) return fail(c, req.error);
    const { language, targetMinutes, focusSkill, includeChallenge } = req.value;
    return respond(
      c,
      await sessions.start({
        userId: c.get("user").id,
        language,
        targetMinutes,
        ...(focusSkill === undefined ? {} : { focusSkill }),
        ...(includeChallenge === undefined ? {} : { includeChallenge }),
      }),
      201,
    );
  });

  const sessionIdParam = (c: Context<AppEnv>): SessionId => asId<SessionId>(c.req.param("sessionId") ?? "");

  app.get(ROUTES.session.path, async (c) => {
    const session = await sessions.get(sessionIdParam(c), c.get("user").id);
    return session === null ? fail(c, notFound("세션")) : json(c, session);
  });

  app.post(ROUTES.skipItem.path, async (c) =>
    respond(c, await sessions.skip(sessionIdParam(c), c.get("user").id)),
  );

  app.post(ROUTES.completeSession.path, async (c) =>
    respond(c, await sessions.complete(sessionIdParam(c), c.get("user").id)),
  );

  app.get(ROUTES.recommend.path, async (c) => {
    const q = parseQuery(c, s.recommendQuerySchema);
    if (!q.ok) return fail(c, q.error);
    return respond(c, await sessions.recommend(c.get("user").id, q.value.language, q.value.skill));
  });

  // ---------- learner ----------

  app.get(ROUTES.progress.path, async (c) => {
    const q = parseQuery(c, s.languageQuerySchema);
    if (!q.ok) return fail(c, q.error);
    const [profile, skills] = await Promise.all([
      learner.getProfile(c.get("user").id, q.value.language),
      catalog.listSkills(),
    ]);
    const body: ProgressView = { profile, skills };
    return json(c, body);
  });

  return app;
}
