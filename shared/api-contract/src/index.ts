/**
 * HTTP API contract. All routes are under /v1, JSON in and out, `Authorization: Bearer <token>`
 * except POST /v1/auth/dev-login and GET /v1/health. Ids containing "/" or "@" (exercise ids) are
 * passed through encodeURIComponent in paths. Errors: HTTP status + `{ "error": ApiErrorBody }`.
 * Only type imports from module contracts are allowed here so browsers can bundle this file.
 */
import type { AppErrorCode, Language } from "@fp/kernel";
import type { IssuedToken, TokenInfo, User } from "@fp/accounts/contract";
import type {
  ConceptNote,
  ExerciseDetail,
  ExerciseFilter,
  ExerciseSummary,
  Hint,
  Skill,
  TheoryTopic,
} from "@fp/content/contract";
import type { Submission, TrialRun } from "@fp/grading/contract";
import type { LearnerProfile, RatingChange } from "@fp/learner/contract";
import type { Recommendation, Session, SessionSummary } from "@fp/sessions/contract";
import type { ChatMessage, ChatReply, CoachingFeedback, Explanation } from "@fp/coaching/contract";

export type {
  User,
  IssuedToken,
  TokenInfo,
  Skill,
  ExerciseSummary,
  ExerciseDetail,
  ConceptNote,
  TheoryTopic,
  Hint,
  Submission,
  TrialRun,
  LearnerProfile,
  RatingChange,
  Session,
  SessionSummary,
  Recommendation,
  ChatMessage,
  ChatReply,
  CoachingFeedback,
  Explanation,
  Language,
};

export interface ApiErrorBody {
  readonly code: AppErrorCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

// ---------- DTOs ----------

export interface DevLoginRequest {
  readonly displayName: string;
}
export interface DevLoginResponse {
  readonly user: User;
  readonly token: IssuedToken;
}

/** Exercise with its concept notes and theory topics resolved. */
export interface ExerciseView {
  readonly exercise: ExerciseDetail;
  readonly conceptNotes: readonly ConceptNote[];
  readonly theoryTopics: readonly TheoryTopic[];
  /** Hints already revealed to this user (from the help ledger). */
  readonly revealedHints: readonly Hint[];
}

export interface TrialRunRequest {
  readonly code: string;
}

export interface SubmitRequest {
  readonly exerciseId: string;
  readonly code: string;
  readonly idempotencyKey: string;
  readonly sessionId?: string;
}

export interface SubmissionView {
  readonly submission: Submission;
  /** Null when the submission was not rated (resubmission, heavy help, system error). */
  readonly ratingChange: RatingChange | null;
}

export interface RevealHintRequest {
  readonly level: number;
}

export interface NoteOpenedRequest {
  readonly kind: "concept" | "theory";
  readonly noteId: string;
}

export interface ChatRequest {
  readonly exerciseId: string;
  readonly code?: string;
  readonly submissionId?: string;
  readonly messages: readonly ChatMessage[];
}

export interface StartSessionRequest {
  readonly language: Language;
  readonly targetMinutes: number;
  readonly focusSkill?: string;
  readonly includeChallenge?: boolean;
}

export interface ProgressView {
  readonly profile: LearnerProfile;
  /** Skill metadata for display, keyed by skill id. */
  readonly skills: readonly Skill[];
}

export interface IssueTokenRequest {
  readonly label: string;
}

export interface HealthResponse {
  readonly status: "ok";
  readonly contentBundle: string | null;
  readonly runner: string;
  readonly llm: "anthropic" | "dashscope" | "none";
}

// ---------- Routes ----------

export const ROUTES = {
  health: { method: "GET", path: "/v1/health" },
  devLogin: { method: "POST", path: "/v1/auth/dev-login" },
  me: { method: "GET", path: "/v1/me" },
  issueToken: { method: "POST", path: "/v1/me/tokens" },
  listTokens: { method: "GET", path: "/v1/me/tokens" },
  revokeToken: { method: "DELETE", path: "/v1/me/tokens/:tokenId" },
  skills: { method: "GET", path: "/v1/skills" },
  exercises: { method: "GET", path: "/v1/exercises" },
  exercise: { method: "GET", path: "/v1/exercises/:exerciseId" },
  trialRun: { method: "POST", path: "/v1/exercises/:exerciseId/run" },
  revealHint: { method: "POST", path: "/v1/exercises/:exerciseId/hints" },
  noteOpened: { method: "POST", path: "/v1/exercises/:exerciseId/notes-opened" },
  explanation: { method: "POST", path: "/v1/exercises/:exerciseId/explanation" },
  theoryTopics: { method: "GET", path: "/v1/theory" },
  submit: { method: "POST", path: "/v1/submissions" },
  submission: { method: "GET", path: "/v1/submissions/:submissionId" },
  feedback: { method: "POST", path: "/v1/submissions/:submissionId/feedback" },
  chat: { method: "POST", path: "/v1/coach/chat" },
  startSession: { method: "POST", path: "/v1/sessions" },
  activeSession: { method: "GET", path: "/v1/sessions/active" },
  session: { method: "GET", path: "/v1/sessions/:sessionId" },
  skipItem: { method: "POST", path: "/v1/sessions/:sessionId/skip" },
  completeSession: { method: "POST", path: "/v1/sessions/:sessionId/complete" },
  recommend: { method: "GET", path: "/v1/recommendation" },
  progress: { method: "GET", path: "/v1/progress" },
} as const;

// ---------- Client ----------

export class ApiError extends Error {
  readonly status: number;
  readonly code: AppErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.status = status;
    this.code = body.code;
    if (body.details !== undefined) this.details = body.details;
  }
}

export interface ApiClientOptions {
  readonly baseUrl: string;
  readonly token?: string;
  readonly fetch?: typeof fetch;
}

type Query = Record<string, string | undefined>;

export function createApiClient(opts: ApiClientOptions) {
  const doFetch = opts.fetch ?? globalThis.fetch.bind(globalThis);
  const base = opts.baseUrl.replace(/\/+$/, "");

  async function call<T>(
    route: { readonly method: string; readonly path: string },
    params: Record<string, string> = {},
    body?: unknown,
    query?: Query,
  ): Promise<T> {
    let path = route.path.replace(/:([A-Za-z]+)/g, (_, name: string) => {
      const v = params[name];
      if (v === undefined) throw new Error(`missing path param ${name}`);
      return encodeURIComponent(v);
    });
    if (query) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) if (v !== undefined) qs.set(k, v);
      const s = qs.toString();
      if (s) path += `?${s}`;
    }
    const headers: Record<string, string> = { accept: "application/json" };
    if (body !== undefined) headers["content-type"] = "application/json";
    if (opts.token) headers.authorization = `Bearer ${opts.token}`;
    const init: RequestInit = { method: route.method, headers };
    if (body !== undefined) init.body = JSON.stringify(body);
    const res = await doFetch(base + path, init);
    const text = await res.text();
    const json: unknown = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const errBody = (json as { error?: ApiErrorBody } | null)?.error ?? {
        code: "internal" as const,
        message: `HTTP ${res.status}`,
      };
      throw new ApiError(res.status, errBody);
    }
    return json as T;
  }

  return {
    health: () => call<HealthResponse>(ROUTES.health),
    devLogin: (req: DevLoginRequest) => call<DevLoginResponse>(ROUTES.devLogin, {}, req),
    me: () => call<User>(ROUTES.me),
    issueToken: (req: IssueTokenRequest) => call<IssuedToken>(ROUTES.issueToken, {}, req),
    listTokens: () => call<TokenInfo[]>(ROUTES.listTokens),
    revokeToken: (tokenId: string) => call<null>(ROUTES.revokeToken, { tokenId }),
    skills: () => call<Skill[]>(ROUTES.skills),
    exercises: (filter: ExerciseFilter = {}) =>
      call<ExerciseSummary[]>(ROUTES.exercises, {}, undefined, {
        language: filter.language,
        skill: filter.skill,
        kind: filter.kind,
        format: filter.format,
        familyId: filter.familyId,
      }),
    exercise: (exerciseId: string) => call<ExerciseView>(ROUTES.exercise, { exerciseId }),
    trialRun: (exerciseId: string, req: TrialRunRequest) => call<TrialRun>(ROUTES.trialRun, { exerciseId }, req),
    revealHint: (exerciseId: string, req: RevealHintRequest) => call<Hint[]>(ROUTES.revealHint, { exerciseId }, req),
    noteOpened: (exerciseId: string, req: NoteOpenedRequest) => call<null>(ROUTES.noteOpened, { exerciseId }, req),
    explanation: (exerciseId: string) => call<Explanation>(ROUTES.explanation, { exerciseId }, {}),
    theoryTopics: () => call<TheoryTopic[]>(ROUTES.theoryTopics),
    submit: (req: SubmitRequest) => call<SubmissionView>(ROUTES.submit, {}, req),
    submission: (submissionId: string) => call<SubmissionView>(ROUTES.submission, { submissionId }),
    feedback: (submissionId: string) => call<CoachingFeedback>(ROUTES.feedback, { submissionId }, {}),
    chat: (req: ChatRequest) => call<ChatReply>(ROUTES.chat, {}, req),
    startSession: (req: StartSessionRequest) => call<Session>(ROUTES.startSession, {}, req),
    activeSession: (language: Language) => call<Session | null>(ROUTES.activeSession, {}, undefined, { language }),
    session: (sessionId: string) => call<Session>(ROUTES.session, { sessionId }),
    skipItem: (sessionId: string) => call<Session>(ROUTES.skipItem, { sessionId }, {}),
    completeSession: (sessionId: string) => call<SessionSummary>(ROUTES.completeSession, { sessionId }, {}),
    recommend: (language: Language, skill?: string) =>
      call<Recommendation>(ROUTES.recommend, {}, undefined, { language, skill }),
    progress: (language: Language) => call<ProgressView>(ROUTES.progress, {}, undefined, { language }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
