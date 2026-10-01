/**
 * HTTP mapping only: authentication, validation, rate limiting, and composition of module calls into
 * the DTOs of @fp/api-contract. No business rules live here.
 */
import { Hono } from "hono";
import type { Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { asId, isLocale, silentLogger, systemClock } from "@fp/kernel";
import type { Clock, ExerciseId, Locale, Logger, SessionId, SubmissionId } from "@fp/kernel";
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
import type { LessonService } from "@fp/lessons/contract";
import type { SessionService } from "@fp/sessions/contract";
import type { CoachingService } from "@fp/coaching/contract";
import { apiError, fail, json, parseBody, parseParams, parseQuery, requestLocale, respond } from "./http.ts";
import { createRateLimiter } from "./rate-limit.ts";
import type { RateLimitRule } from "./rate-limit.ts";
import * as s from "./schemas.ts";

export interface AppServices {
  readonly accounts: AccountsService;
  readonly catalog: ContentCatalog;
  readonly grading: GradingService;
  readonly learner: LearnerModel;
  readonly lessons: LessonService;
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

/** `locale` is the authenticated user's locale; before auth, `requestLocale` falls back to Accept-Language. */
type AppEnv = { Variables: { user: User; locale: Locale } };
export type ApiApp = Hono<AppEnv>;

const PUBLIC_PATHS: ReadonlySet<string> = new Set([ROUTES.health.path, ROUTES.devLogin.path]);
const DEFAULT_RATE_LIMIT: RateLimitRule = { limit: 30, windowMs: 60_000 };

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
  const { accounts, catalog, grading, learner, lessons, sessions, coaching } = services;
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
    return fail(c, apiError(c, "internal", "internal"));
  });
  app.notFound((c) => fail(c, apiError(c, "not_found", "routeNotFound")));

  app.use(
    "/v1/*",
    cors({
      origin: options.webOrigin ?? "http://localhost:5173",
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["authorization", "content-type", "accept", "accept-language"],
      maxAge: 600,
    }),
  );
  app.use(
    "/v1/*",
    bodyLimit({
      maxSize: options.maxBodyBytes ?? 512 * 1024,
      onError: (c) => fail(c, apiError(c, "invalid_input", "bodyTooLarge"), 413),
    }),
  );

  app.use("/v1/*", async (c, next) => {
    if (PUBLIC_PATHS.has(c.req.path)) return next();
    const match = /^Bearer\s+(\S+)\s*$/i.exec(c.req.header("authorization") ?? "");
    const token = match?.[1];
    if (token === undefined) return fail(c, apiError(c, "unauthorized", "loginRequired"));
    const user = await accounts.authenticate(token);
    if (user === null) return fail(c, apiError(c, "unauthorized", "invalidToken"));
    c.set("user", user);
    // Defensive: an account without a valid stored locale keeps the Accept-Language fallback.
    if (typeof user.locale === "string" && isLocale(user.locale)) c.set("locale", user.locale);
    return next();
  });

  /** Returns a 429 response when the user exceeded the limit for `action`, otherwise null. */
  function limited(c: Context<AppEnv>, action: RateLimitedAction): Response | null {
    const decision = limiter.check(`${c.get("user").id}:${action}`, rule);
    if (decision.allowed) return null;
    const retryAfterSeconds = Math.max(1, Math.ceil(decision.retryAfterMs / 1000));
    c.header("retry-after", String(retryAfterSeconds));
    return fail(c, apiError(c, "rate_limited", "rateLimited", { action, retryAfterSeconds }));
  }

  /** Locale of the authenticated user (see requestLocale); every module call with a locale parameter gets it. */
  const loc = (c: Context<AppEnv>): Locale => requestLocale(c);

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
    const { displayName, locale } = req.value;
    const r = locale === undefined ? await accounts.devLogin(displayName) : await accounts.devLogin(displayName, locale);
    if (!r.ok) return fail(c, r.error);
    const body: DevLoginResponse = { user: r.value.user, token: r.value.token };
    return json(c, body);
  });

  // ---------- accounts ----------

  app.get(ROUTES.me.path, (c) => json(c, c.get("user")));

  app.patch(ROUTES.updateMe.path, async (c) => {
    const req = await parseBody(c, s.updateMeSchema);
    if (!req.ok) return fail(c, req.error);
    return respond(c, await accounts.setLocale(c.get("user").id, req.value.locale));
  });

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

  app.get(ROUTES.skills.path, async (c) => json(c, await catalog.listSkills(loc(c))));

  app.get(ROUTES.exercises.path, async (c) => {
    const q = parseQuery(c, s.exerciseFilterSchema);
    if (!q.ok) return fail(c, q.error);
    const filter = Object.fromEntries(Object.entries(q.value).filter(([, v]) => v !== undefined));
    return json(c, await catalog.listExercises(filter, loc(c)));
  });

  app.get(ROUTES.exercise.path, async (c) => {
    const user = c.get("user");
    const locale = loc(c);
    const id = exerciseIdParam(c);
    const ex = await catalog.getExercise(id, locale);
    if (ex === null) return fail(c, apiError(c, "not_found", "exerciseNotFound"));
    const [conceptNotes, theoryTopics, help] = await Promise.all([
      catalog.getConceptNotes(ex.conceptNoteIds, locale),
      catalog.getTheoryTopics(ex.theoryTopicIds, locale),
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

  app.get(ROUTES.theoryTopics.path, async (c) => json(c, await catalog.listTheoryTopics(loc(c))));

  // ---------- grading ----------

  app.post(ROUTES.trialRun.path, async (c) => {
    const req = await parseBody(c, s.trialRunSchema);
    if (!req.ok) return fail(c, req.error);
    const blocked = limited(c, "run");
    if (blocked) return blocked;
    return respond(
      c,
      await grading.trialRun({ exerciseId: exerciseIdParam(c), code: req.value.code, locale: loc(c) }),
    );
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
      locale: loc(c),
    });
    if (!r.ok) return fail(c, r.error);
    const body: SubmissionView = { submission: r.value, ratingChange: await learner.ratingChangeFor(r.value.id) };
    return json(c, body);
  });

  app.get(ROUTES.submission.path, async (c) => {
    const id = asId<SubmissionId>(c.req.param("submissionId") ?? "");
    const submission = await grading.getSubmission(id, c.get("user").id);
    if (submission === null) return fail(c, apiError(c, "not_found", "submissionNotFound"));
    const body: SubmissionView = { submission, ratingChange: await learner.ratingChangeFor(submission.id) };
    return json(c, body);
  });

  // ---------- coaching ----------

  app.post(ROUTES.feedback.path, async (c) => {
    const blocked = limited(c, "feedback");
    if (blocked) return blocked;
    const id = asId<SubmissionId>(c.req.param("submissionId") ?? "");
    return respond(c, await coaching.feedback(id, c.get("user").id, loc(c)));
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
        locale: loc(c),
      }),
    );
  });

  app.post(ROUTES.revealHint.path, async (c) => {
    const req = await parseBody(c, s.revealHintSchema);
    if (!req.ok) return fail(c, req.error);
    return respond(c, await coaching.revealHint(c.get("user").id, exerciseIdParam(c), req.value.level, loc(c)));
  });

  app.post(ROUTES.noteOpened.path, async (c) => {
    const req = await parseBody(c, s.noteOpenedSchema);
    if (!req.ok) return fail(c, req.error);
    const id = exerciseIdParam(c);
    if ((await catalog.getExercise(id, loc(c))) === null) return fail(c, apiError(c, "not_found", "exerciseNotFound"));
    const kind = req.value.kind === "concept" ? "concept_note" : "theory_note";
    await coaching.recordHelp(c.get("user").id, id, kind, req.value.noteId);
    return json(c, null);
  });

  app.post(ROUTES.explanation.path, async (c) =>
    respond(c, await coaching.revealExplanation(c.get("user").id, exerciseIdParam(c), loc(c))),
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
        locale: loc(c),
      }),
      201,
    );
  });

  const sessionIdParam = (c: Context<AppEnv>): SessionId => asId<SessionId>(c.req.param("sessionId") ?? "");

  app.get(ROUTES.session.path, async (c) => {
    const session = await sessions.get(sessionIdParam(c), c.get("user").id);
    return session === null ? fail(c, apiError(c, "not_found", "sessionNotFound")) : json(c, session);
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
    return respond(c, await sessions.recommend(c.get("user").id, q.value.language, q.value.skill, loc(c)));
  });

  // ---------- learner ----------

  app.get(ROUTES.progress.path, async (c) => {
    const q = parseQuery(c, s.languageQuerySchema);
    if (!q.ok) return fail(c, q.error);
    const [profile, skills] = await Promise.all([
      learner.getProfile(c.get("user").id, q.value.language),
      catalog.listSkills(loc(c)),
    ]);
    const body: ProgressView = { profile, skills };
    return json(c, body);
  });

  // ---------- lessons (Gleam basics course) ----------
  // Unit, lesson and quiz ids are single path segments, validated after decoding (parseParams).

  app.get(ROUTES.course.path, async (c) => json(c, await lessons.course(c.get("user").id, loc(c))));

  app.get(ROUTES.lesson.path, async (c) => {
    const p = parseParams(c, s.lessonParamsSchema);
    if (!p.ok) return fail(c, p.error);
    return respond(c, await lessons.lesson(c.get("user").id, p.value.unitId, p.value.lessonId, loc(c)));
  });

  app.post(ROUTES.lessonAnswer.path, async (c) => {
    const p = parseParams(c, s.lessonParamsSchema);
    if (!p.ok) return fail(c, p.error);
    const req = await parseBody(c, s.lessonAnswerSchema);
    if (!req.ok) return fail(c, req.error);
    const { exerciseId, choice, giveUp } = req.value;
    return respond(
      c,
      await lessons.answer(c.get("user").id, p.value.unitId, p.value.lessonId, exerciseId, choice, {
        ...(giveUp === undefined ? {} : { giveUp }),
        locale: loc(c),
      }),
    );
  });

  app.post(ROUTES.lessonComplete.path, async (c) => {
    const p = parseParams(c, s.lessonParamsSchema);
    if (!p.ok) return fail(c, p.error);
    return respond(c, await lessons.completeLesson(c.get("user").id, p.value.unitId, p.value.lessonId));
  });

  app.post(ROUTES.startCheckpoint.path, async (c) => {
    const p = parseParams(c, s.unitParamsSchema);
    if (!p.ok) return fail(c, p.error);
    return respond(c, await lessons.startCheckpoint(c.get("user").id, p.value.unitId, loc(c)), 201);
  });

  app.post(ROUTES.submitCheckpoint.path, async (c) => {
    const p = parseParams(c, s.quizParamsSchema);
    if (!p.ok) return fail(c, p.error);
    const req = await parseBody(c, s.quizSubmitSchema);
    if (!req.ok) return fail(c, req.error);
    return respond(c, await lessons.submitCheckpoint(c.get("user").id, p.value.quizId, req.value.answers, loc(c)));
  });

  app.post(ROUTES.startPlacement.path, async (c) =>
    respond(c, await lessons.startPlacement(c.get("user").id, loc(c)), 201),
  );

  app.post(ROUTES.submitPlacement.path, async (c) => {
    const p = parseParams(c, s.quizParamsSchema);
    if (!p.ok) return fail(c, p.error);
    const req = await parseBody(c, s.quizSubmitSchema);
    if (!req.ok) return fail(c, req.error);
    return respond(c, await lessons.submitPlacement(c.get("user").id, p.value.quizId, req.value.answers, loc(c)));
  });

  return app;
}
