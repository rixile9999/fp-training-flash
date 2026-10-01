/**
 * Sessions contract: builds short training sessions (review -> focus -> variation) and picks
 * the next exercise via the recommender.
 */
import type { AppError, ExerciseId, Language, Locale, Result, SessionId, SkillId, SubmissionId, UserId } from "@fp/kernel";

export type SessionItemKind = "review" | "focus" | "variation" | "challenge";
export type SessionItemStatus = "pending" | "in_progress" | "passed" | "failed" | "skipped";

export interface SessionItem {
  readonly index: number;
  readonly kind: SessionItemKind;
  readonly exerciseId: ExerciseId;
  readonly skillId: SkillId;
  /** Human-readable reason, e.g. "복습 예정: 데이터 변환". */
  readonly reason: string;
  readonly expectedSuccess: number;
  readonly status: SessionItemStatus;
  readonly submissionIds: readonly SubmissionId[];
}

export type SessionStatus = "active" | "completed" | "abandoned";

export interface Session {
  readonly id: SessionId;
  readonly userId: UserId;
  readonly language: Language;
  readonly status: SessionStatus;
  readonly targetMinutes: number;
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly items: readonly SessionItem[];
  /** Index of the item the learner should work on, or null when all are done. */
  readonly currentIndex: number | null;
}

export interface SessionSummary {
  readonly sessionId: SessionId;
  readonly passed: number;
  readonly failed: number;
  readonly fixedAfterFeedback: number;
  readonly skillsPracticed: readonly SkillId[];
  readonly nextReviews: readonly { readonly skillId: SkillId; readonly dueAt: string }[];
}

export interface StartSessionRequest {
  readonly userId: UserId;
  readonly language: Language;
  readonly targetMinutes: number;
  /** Optional: restrict focus items to one skill. */
  readonly focusSkill?: SkillId;
  readonly includeChallenge?: boolean;
  /** Language of item reasons. Default "ko". */
  readonly locale?: Locale;
}

export interface Recommendation {
  readonly exerciseId: ExerciseId;
  readonly skillId: SkillId;
  readonly kind: SessionItemKind;
  readonly reason: string;
  readonly expectedSuccess: number;
}

export interface SessionService {
  start(req: StartSessionRequest): Promise<Result<Session, AppError>>;
  get(sessionId: SessionId, userId: UserId): Promise<Session | null>;
  /** Most recent active session, if any. */
  active(userId: UserId, language: Language): Promise<Session | null>;
  /** Marks the current item skipped and advances. */
  skip(sessionId: SessionId, userId: UserId): Promise<Result<Session, AppError>>;
  complete(sessionId: SessionId, userId: UserId): Promise<Result<SessionSummary, AppError>>;
  /** Single recommendation outside a session (e.g. MCP "give me one exercise"). */
  recommend(userId: UserId, language: Language, skill?: SkillId, locale?: Locale): Promise<Result<Recommendation, AppError>>;
}

export const SESSION_EVENTS = {
  completed: "sessions.session_completed",
} as const;

export interface SessionCompletedPayload {
  readonly sessionId: SessionId;
  readonly userId: UserId;
  readonly summary: SessionSummary;
}
