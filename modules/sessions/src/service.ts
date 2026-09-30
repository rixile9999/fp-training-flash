/** SessionService implementation and the grading.submission_evaluated consumer. */
import { appError, createEvent, err, newId, ok } from "@fp/kernel";
import type {
  AppError,
  Clock,
  Db,
  DomainEvent,
  EventBus,
  ExerciseId,
  FamilyId,
  Language,
  Logger,
  Result,
  SessionId,
  SkillId,
  UserId,
} from "@fp/kernel";
import type { ContentCatalog } from "@fp/content/contract";
import type { SubmissionEvaluatedPayload } from "@fp/grading/contract";
import type { LearnerModel } from "@fp/learner/contract";
import {
  SESSION_EVENTS,
  type Recommendation,
  type Session,
  type SessionCompletedPayload,
  type SessionService,
  type SessionSummary,
  type StartSessionRequest,
} from "./contract/index.ts";
import { chooseFocus, loadPlanContext, planSession } from "./planner.ts";
import { applyEvaluation, skipCurrent, summarize, toPublicSession, type StoredSession } from "./progress.ts";
import { insertAttempt, insertSession, loadActiveSession, loadHistory, loadSession, saveSession } from "./store.ts";

export interface ServiceDeps {
  readonly db: Db;
  readonly clock: Clock;
  readonly events: EventBus;
  readonly logger: Logger;
  readonly catalog: ContentCatalog;
  readonly learner: LearnerModel;
}

/** Upcoming reviews reported in a session summary. */
export const NEXT_REVIEW_WINDOW_DAYS = 30;
export const MAX_TARGET_MINUTES = 240;
const DAY_MS = 24 * 60 * 60 * 1000;

const notFound = (): AppError => appError("not_found", "세션을 찾을 수 없습니다.");

/** Parses `<familyId>/<variantKey>@<version>`; used when the catalog no longer knows an exercise id. */
export function parseExerciseId(id: ExerciseId): { familyId: FamilyId; variantKey: string } {
  const at = id.lastIndexOf("@");
  const head = at >= 0 ? id.slice(0, at) : id;
  const slash = head.lastIndexOf("/");
  return slash >= 0
    ? { familyId: head.slice(0, slash) as FamilyId, variantKey: head.slice(slash + 1) }
    : { familyId: head as FamilyId, variantKey: "base" };
}

export function createSessionService(deps: ServiceDeps): SessionService & {
  onSubmissionEvaluated(event: DomainEvent<string, SubmissionEvaluatedPayload>): Promise<void>;
} {
  const { db, clock, catalog, learner } = deps;

  async function context(userId: UserId, language: Language) {
    const now = clock.now();
    const history = await loadHistory(db, userId, language);
    return loadPlanContext({ catalog, learner }, history, userId, language, now);
  }

  async function owned(conn: Db, sessionId: SessionId, userId: UserId, lock = false): Promise<StoredSession | null> {
    const s = await loadSession(conn, sessionId, lock);
    return s && s.userId === userId ? s : null;
  }

  async function start(req: StartSessionRequest): Promise<Result<Session, AppError>> {
    if (!Number.isFinite(req.targetMinutes) || req.targetMinutes <= 0 || req.targetMinutes > MAX_TARGET_MINUTES) {
      return err(appError("invalid_input", `목표 시간은 1분에서 ${MAX_TARGET_MINUTES}분 사이여야 합니다.`));
    }
    const ctx = await context(req.userId, req.language);
    const due = await learner.dueReviews(req.userId, req.language, ctx.now);
    const dueSkills: SkillId[] = [];
    for (const r of [...due].sort((a, b) => a.dueAt.localeCompare(b.dueAt))) {
      if (Date.parse(r.dueAt) <= ctx.now.getTime() && !dueSkills.includes(r.skillId)) dueSkills.push(r.skillId);
    }
    const plan = await planSession(ctx, req, dueSkills);
    if (!plan.ok) return plan;

    const session: StoredSession = {
      id: newId() as SessionId,
      userId: req.userId,
      language: req.language,
      status: "active",
      targetMinutes: Math.round(req.targetMinutes),
      startedAt: ctx.now.toISOString(),
      currentIndex: 0,
      summary: null,
      items: plan.value.map((p, index) => ({
        index,
        kind: p.kind,
        exerciseId: p.exercise.id,
        skillId: p.exercise.primarySkill,
        familyId: p.exercise.familyId,
        variantKey: p.exercise.variantKey,
        reason: p.reason,
        expectedSuccess: p.expectedSuccess,
        status: index === 0 ? "in_progress" : "pending",
        submissionIds: [],
        hadFailure: false,
      })),
    };
    await db.transaction((tx) => insertSession(tx, session));
    return ok(toPublicSession(session));
  }

  async function skip(sessionId: SessionId, userId: UserId): Promise<Result<Session, AppError>> {
    return db.transaction(async (tx): Promise<Result<Session, AppError>> => {
      const s = await owned(tx, sessionId, userId, true);
      if (!s) return err(notFound());
      if (s.status !== "active") return err(appError("conflict", "진행 중인 세션이 아닙니다."));
      const next = skipCurrent(s);
      if (!next) return err(appError("conflict", "건너뛸 문제가 없습니다."));
      await saveSession(tx, next);
      return ok(toPublicSession(next));
    });
  }

  async function complete(sessionId: SessionId, userId: UserId): Promise<Result<SessionSummary, AppError>> {
    const s = await owned(db, sessionId, userId);
    if (!s) return err(notFound());
    if (s.status === "completed" && s.summary) return ok(s.summary);
    if (s.status !== "active") return err(appError("conflict", "중단된 세션은 완료할 수 없습니다."));

    const now = clock.now();
    const horizon = new Date(now.getTime() + NEXT_REVIEW_WINDOW_DAYS * DAY_MS);
    const reviews = await learner.dueReviews(userId, s.language, horizon);
    const nextReviews = [...reviews]
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
      .map((r) => ({ skillId: r.skillId, dueAt: r.dueAt }));

    let transitioned = false;
    const result = await db.transaction(async (tx): Promise<Result<SessionSummary, AppError>> => {
      const fresh = await owned(tx, sessionId, userId, true);
      if (!fresh) return err(notFound());
      if (fresh.status === "completed" && fresh.summary) return ok(fresh.summary);
      if (fresh.status !== "active") return err(appError("conflict", "중단된 세션은 완료할 수 없습니다."));
      const summary = summarize(fresh, nextReviews);
      await saveSession(tx, {
        ...fresh,
        status: "completed",
        completedAt: now.toISOString(),
        currentIndex: null,
        summary,
      });
      transitioned = true;
      return ok(summary);
    });
    if (result.ok && transitioned) {
      const payload: SessionCompletedPayload = { sessionId, userId, summary: result.value };
      await deps.events.publish(createEvent(SESSION_EVENTS.completed, payload, clock));
    }
    return result;
  }

  async function recommend(
    userId: UserId,
    language: Language,
    skill?: SkillId,
  ): Promise<Result<Recommendation, AppError>> {
    const ctx = await context(userId, language);
    const focus = await chooseFocus(ctx, skill);
    if (!focus.ok) return focus;
    const f = focus.value;
    return ok({
      exerciseId: f.exercise.id,
      skillId: f.exercise.primarySkill,
      kind: f.kind,
      reason: f.reason,
      expectedSuccess: f.expectedSuccess,
    });
  }

  async function onSubmissionEvaluated(event: DomainEvent<string, SubmissionEvaluatedPayload>): Promise<void> {
    const p = event.payload;
    if (p.outcome === "system_error") return;
    const detail = await catalog.getExercise(p.exerciseId);
    const ref = detail ? { familyId: detail.familyId, variantKey: detail.variantKey } : parseExerciseId(p.exerciseId);
    const passed = p.outcome === "passed";
    await db.transaction(async (tx) => {
      const fresh = await insertAttempt(tx, {
        submissionId: p.submissionId,
        userId: p.userId,
        exerciseId: p.exerciseId,
        familyId: ref.familyId,
        variantKey: ref.variantKey,
        skillId: detail?.primarySkill ?? null,
        contextTags: detail?.contextTags ?? [],
        sessionId: p.sessionId ?? null,
        passed,
        evaluatedAt: p.evaluatedAt,
      });
      if (!fresh || p.sessionId === undefined) return;
      const s = await owned(tx, p.sessionId, p.userId, true);
      if (!s || s.status !== "active") return;
      const next = applyEvaluation(s, { submissionId: p.submissionId, exerciseId: p.exerciseId, ...ref, passed });
      if (next && next !== s) await saveSession(tx, next);
    });
  }

  return {
    start,
    skip,
    complete,
    recommend,
    onSubmissionEvaluated,
    get: async (sessionId, userId) => {
      const s = await owned(db, sessionId, userId);
      return s ? toPublicSession(s) : null;
    },
    active: async (userId, language) => {
      const s = await loadActiveSession(db, userId, language);
      return s ? toPublicSession(s) : null;
    },
  };
}
