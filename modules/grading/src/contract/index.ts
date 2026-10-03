/**
 * Grading module contract: submissions, evaluations, and the language runner (adapter) port.
 * Grading knows nothing about ratings or LLMs; it publishes `grading.submission_evaluated`.
 */
import type { ExerciseId, Language, Locale, Result, AppError, SessionId, SubmissionId, UserId } from "@fp/kernel";
import type { FileContent } from "@fp/content/contract";

// ---------- Runner (language adapter) port ----------

export interface RunnerInfo {
  readonly runner: "docker" | "local";
  readonly image?: string;
  readonly languageVersion: string;
  readonly runtimeVersion: string;
}

export interface Diagnostic {
  readonly severity: "error" | "warning";
  readonly message: string;
  readonly file?: string;
  readonly line?: number;
  readonly column?: number;
}

export type TestStatus = "passed" | "failed" | "error" | "timeout";

export interface RawTestResult {
  /** Gleam test function name. */
  readonly functionName: string;
  readonly status: TestStatus;
  readonly message?: string;
  readonly durationMs?: number;
}

export interface PerfMeasurement {
  readonly size: number;
  /** BEAM reductions consumed by `run(input)` (excludes setup). */
  readonly cost: number;
  readonly status: "ok" | "timeout" | "error";
}

export interface RunJob {
  readonly language: Language;
  /** Learner files, placed under src/. */
  readonly sourceFiles: readonly FileContent[];
  /** Placed under src/ too, but owned by the exercise. */
  readonly supportFiles: readonly FileContent[];
  /** Placed under test/. */
  readonly testFiles: readonly FileContent[];
  /** Test functions to run, "<module>.<function>" e.g. "coupon_test.keeps_other_orders_test". */
  readonly testFunctions: readonly string[];
  readonly performance?: { readonly perfModule: string; readonly sizes: readonly number[] };
  readonly limits: { readonly timeMs: number; readonly memoryMb: number };
}

export type RunOutput =
  | {
      readonly kind: "completed";
      readonly compileDiagnostics: readonly Diagnostic[];
      readonly tests: readonly RawTestResult[];
      readonly performance: readonly PerfMeasurement[];
      readonly runner: RunnerInfo;
      readonly durationMs: number;
    }
  | {
      readonly kind: "compile_error";
      readonly compileDiagnostics: readonly Diagnostic[];
      readonly runner: RunnerInfo;
      readonly durationMs: number;
    }
  | { readonly kind: "timeout"; readonly runner: RunnerInfo; readonly durationMs: number }
  | { readonly kind: "system_error"; readonly message: string; readonly runner?: RunnerInfo };

/** A language adapter. One implementation per (language, runtime) pair. */
export interface CodeRunner {
  readonly language: Language;
  run(job: RunJob): Promise<RunOutput>;
  info(): Promise<RunnerInfo>;
}

// ---------- Submissions and evaluations ----------

export type EvaluationOutcome =
  /** All tests passed (and performance ok if measured). */
  | "passed"
  | "failed_tests"
  | "too_slow"
  | "compile_error"
  | "timeout"
  /** Static checks rejected the code before running (e.g. @external, forbidden import). */
  | "rejected"
  /** Infrastructure failure; must never count as a learning failure. */
  | "system_error";

export interface TestResult {
  readonly id: string;
  readonly name: string;
  readonly status: TestStatus;
  readonly visibility: "public" | "hidden";
  readonly message?: string;
  /** Revealed on failure even for hidden tests. */
  readonly code?: string;
  readonly errorTag?: string;
}

export interface RequirementResult {
  readonly id: string;
  readonly description: string;
  readonly status: "met" | "unmet" | "undetermined";
}

export interface RubricCheckResult {
  readonly rubricId: string;
  readonly status: "ok" | "flagged";
  readonly message?: string;
}

export interface PerformanceResult {
  readonly verdict: "ok" | "too_slow" | "not_measured";
  readonly measurements: readonly PerfMeasurement[];
  readonly referenceCost: readonly number[];
  /** learner cost / reference cost at the largest measured size. */
  readonly ratio?: number;
}

export interface Evaluation {
  readonly outcome: EvaluationOutcome;
  readonly correctness: boolean;
  readonly compileDiagnostics: readonly Diagnostic[];
  readonly tests: readonly TestResult[];
  readonly requirements: readonly RequirementResult[];
  readonly rubricChecks: readonly RubricCheckResult[];
  readonly performance?: PerformanceResult;
  readonly rejectionReasons?: readonly string[];
  readonly errorTags: readonly string[];
  readonly runner?: RunnerInfo;
  readonly durationMs?: number;
  readonly evaluatedAt: string;
}

/** Help the learner used on this exercise before submitting; provided by the caller from the server-side help ledger. */
export interface HelpUsed {
  readonly maxHintLevel: number;
  readonly conceptNotesOpened: number;
  readonly theoryNotesOpened: number;
  readonly explanationViewed: boolean;
  readonly coachMessages: number;
}

export type SubmissionStatus = "running" | "completed";

export interface Submission {
  readonly id: SubmissionId;
  readonly userId: UserId;
  readonly exerciseId: ExerciseId;
  readonly sessionId?: SessionId;
  /** 1 for the first submission of this user on this exercise version. */
  readonly attemptNo: number;
  readonly code: string;
  /** For predict exercises the answer text is stored in `code`. */
  readonly helpUsed: HelpUsed;
  readonly status: SubmissionStatus;
  readonly evaluation?: Evaluation;
  readonly createdAt: string;
}

export interface SubmitRequest {
  readonly userId: UserId;
  readonly exerciseId: ExerciseId;
  readonly code: string;
  /** Client-generated key; resubmitting with the same key returns the original submission. */
  readonly idempotencyKey: string;
  readonly sessionId?: SessionId;
  readonly helpUsed: HelpUsed;
  /** Language of learner-facing texts in the stored evaluation (test names, messages, reasons). Default "ko". */
  readonly locale?: Locale;
}

export interface TrialRunRequest {
  readonly exerciseId: ExerciseId;
  readonly code: string;
  readonly locale?: Locale;
}

/** Result of "run" (public tests only). Not stored, no events. */
export interface TrialRun {
  readonly outcome: EvaluationOutcome;
  readonly compileDiagnostics: readonly Diagnostic[];
  readonly tests: readonly TestResult[];
  readonly rejectionReasons?: readonly string[];
}

/**
 * A small Gleam expression evaluated in the sandbox (used by the coach to verify examples before showing them).
 * The module is: `import gleam/string`, then `imports`, then `definitions`, then
 * `pub fn value() { <expression> }`; the result is `string.inspect(value())`.
 */
export interface SnippetRequest {
  /** Module paths such as "gleam/list" or "gleam/list.{map}"; learner/exercise modules are not available. */
  readonly imports: readonly string[];
  /** Optional top-level definitions (functions, types) used by the expression. */
  readonly definitions?: string;
  readonly expression: string;
  /** Language of rejection reasons and runtime error messages (default ko). Compiler diagnostics stay English. */
  readonly locale?: Locale;
}

export type SnippetResult =
  | { readonly kind: "value"; readonly value: string }
  | { readonly kind: "compile_error"; readonly diagnostics: readonly Diagnostic[] }
  | { readonly kind: "runtime_error"; readonly message: string }
  | { readonly kind: "timeout" }
  | { readonly kind: "rejected"; readonly reasons: readonly string[] };

export interface GradingService {
  /** Synchronous: returns the completed submission. Idempotent per (userId, idempotencyKey). */
  submit(req: SubmitRequest): Promise<Result<Submission, AppError>>;
  trialRun(req: TrialRunRequest): Promise<Result<TrialRun, AppError>>;
  getSubmission(id: SubmissionId, userId: UserId): Promise<Submission | null>;
  listSubmissions(userId: UserId, exerciseId?: ExerciseId): Promise<readonly Submission[]>;
  /** Evaluates a snippet in the sandbox with small limits. Not stored, no events. */
  evaluateSnippet(req: SnippetRequest): Promise<Result<SnippetResult, AppError>>;
}

// ---------- Events ----------

export const GRADING_EVENTS = {
  submissionEvaluated: "grading.submission_evaluated",
} as const;

export interface SubmissionEvaluatedPayload {
  readonly submissionId: SubmissionId;
  readonly userId: UserId;
  readonly exerciseId: ExerciseId;
  readonly sessionId?: SessionId;
  readonly attemptNo: number;
  readonly outcome: EvaluationOutcome;
  readonly correctness: boolean;
  readonly efficiency: "ok" | "too_slow" | null;
  readonly errorTags: readonly string[];
  readonly helpUsed: HelpUsed;
  readonly evaluatedAt: string;
}
