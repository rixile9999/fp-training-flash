/**
 * Coaching contract: structured feedback on evaluated submissions, problem-scoped chat,
 * authored hints, the reference explanation, and the server-side help ledger.
 * Evidence from execution always wins over LLM opinion; LLM output never changes grading results
 * or ratings.
 */
import type { AppError, ExerciseId, Result, SubmissionId, UserId } from "@fp/kernel";
import type { Hint } from "@fp/content/contract";
import type { HelpUsed } from "@fp/grading/contract";

export interface FeedbackEvidence {
  readonly text: string;
  readonly line?: number;
  readonly testId?: string;
}

export interface RubricNote {
  readonly rubricId: string;
  readonly verdict: "good" | "suggestion";
  readonly text: string;
}

/** The four-part coach response: current result, evidence, 1-2 priorities, next action. */
export interface CoachingFeedback {
  readonly submissionId: SubmissionId;
  readonly summary: string;
  readonly evidence: readonly FeedbackEvidence[];
  readonly priorities: readonly string[];
  readonly nextAction: string;
  /** Code-quality notes; never affect correctness or rating. */
  readonly rubricNotes: readonly RubricNote[];
  /** "rule_based" when no LLM was available or the LLM output failed validation. */
  readonly source: "llm" | "rule_based";
  readonly model?: string;
  readonly promptVersion: string;
  readonly createdAt: string;
}

export interface ChatMessage {
  readonly role: "user" | "assistant";
  readonly content: string;
}

export interface ChatRequest {
  readonly userId: UserId;
  readonly exerciseId: ExerciseId;
  /** Current editor content; treated as data, never as instructions. */
  readonly code?: string;
  readonly submissionId?: SubmissionId;
  readonly messages: readonly ChatMessage[];
}

export interface ChatReply {
  readonly message: ChatMessage;
  /** Code references the UI can highlight, e.g. line numbers. */
  readonly references: readonly { readonly line: number }[];
  readonly source: "llm" | "rule_based";
}

export interface Explanation {
  readonly exerciseId: ExerciseId;
  readonly markdown: string;
  readonly solutionCode: string;
}

export type HelpKind = "hint" | "concept_note" | "theory_note" | "explanation" | "coach_message";

export interface CoachingService {
  /** Cached per (submission, prompt version, model). Falls back to rule-based feedback. */
  feedback(submissionId: SubmissionId, userId: UserId): Promise<Result<CoachingFeedback, AppError>>;
  chat(req: ChatRequest): Promise<Result<ChatReply, AppError>>;
  /** Reveals hints up to `level` (authored content, no LLM) and records it in the help ledger. */
  revealHint(userId: UserId, exerciseId: ExerciseId, level: number): Promise<Result<readonly Hint[], AppError>>;
  /** Reveals the reference explanation and records it; later mastery must be shown on a new exercise. */
  revealExplanation(userId: UserId, exerciseId: ExerciseId): Promise<Result<Explanation, AppError>>;
  recordHelp(userId: UserId, exerciseId: ExerciseId, kind: HelpKind, ref?: string): Promise<void>;
  /** Server-side summary passed to grading on submit. */
  helpUsed(userId: UserId, exerciseId: ExerciseId): Promise<HelpUsed>;
}
