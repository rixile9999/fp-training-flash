import { appError, createEvent, err, newId, ok } from "@fp/kernel";
import type { AppError, Clock, Db, EventBus, Logger, Result, SubmissionId } from "@fp/kernel";
import type { ContentCatalog, GradingSpec } from "@fp/content/contract";
import { GRADING_EVENTS } from "../contract/index.ts";
import type {
  CodeRunner,
  Evaluation,
  GradingService,
  RunJob,
  RunOutput,
  SnippetRequest,
  SnippetResult,
  Submission,
  SubmissionEvaluatedPayload,
  SubmitRequest,
  TrialRun,
  TrialRunRequest,
} from "../contract/index.ts";
import { interpretRunOutput, predictEvaluation, rejectedEvaluation } from "../grading/interpret.ts";
import { rubricChecks } from "../grading/rubric.ts";
import { buildRunJob, learnerFiles } from "../grading/run-job.ts";
import { buildSnippetJob, interpretSnippetOutput, newSnippetToken } from "../grading/snippet.ts";
import { staticChecks } from "../grading/static-checks.ts";
import { createJobQueue } from "./queue.ts";
import { createSubmissionRepo } from "./repo.ts";

export interface GradingServiceDeps {
  readonly db: Db;
  readonly clock: Clock;
  readonly events: EventBus;
  readonly logger: Logger;
  readonly catalog: ContentCatalog;
  readonly runner: CodeRunner;
  readonly concurrency?: number;
}

/** Hard cap on stored code; larger inputs are invalid requests, not submissions. */
const MAX_STORED_CODE = 256 * 1024;
const MAX_KEY = 200;

export interface GradingServiceInternal extends GradingService {
  /** Marks submissions left running by a crashed process as system errors and publishes their events. */
  recoverInterrupted(): Promise<number>;
}

export function createGradingService(deps: GradingServiceDeps): GradingServiceInternal {
  const { clock, logger, catalog, runner } = deps;
  const repo = createSubmissionRepo(deps.db);
  const queue = createJobQueue(deps.concurrency ?? 2);
  /** In-process duplicate submits share one evaluation. */
  const inFlight = new Map<string, Promise<Result<Submission, AppError>>>();
  const now = () => clock.now().toISOString();

  const runSafely = async (job: RunJob): Promise<RunOutput> => {
    try {
      return await queue.run(() => runner.run(job));
    } catch (e) {
      return { kind: "system_error", message: `채점 실행기 오류: ${e instanceof Error ? e.message : String(e)}` };
    }
  };

  const loadSpec = async (exerciseId: string): Promise<Result<GradingSpec, AppError>> => {
    const spec = await catalog.getGradingSpec(exerciseId as GradingSpec["exerciseId"]);
    return spec ? ok(spec) : err(appError("not_found", "문제를 찾을 수 없습니다.", { exerciseId }));
  };

  /** Full evaluation of a submission (hidden tests + performance). Never throws for runner failures. */
  const evaluate = async (spec: GradingSpec, code: string): Promise<Evaluation> => {
    if (spec.kind === "predict") return predictEvaluation(spec, code, now());
    const files = learnerFiles(spec, code);
    const rubric = rubricChecks(spec.rubric, files);
    const reasons = staticChecks(spec, files);
    if (reasons.length > 0) return { ...rejectedEvaluation(spec, reasons, now()), rubricChecks: rubric };
    const output: RunOutput =
      spec.language === runner.language
        ? await runSafely(buildRunJob(spec, files, true))
        : { kind: "system_error", message: `${spec.language} 실행기가 없습니다.` };
    if (output.kind === "system_error") {
      logger.error("grading system error", { exerciseId: spec.exerciseId, message: output.message });
    }
    return { ...interpretRunOutput(spec, output, now()), rubricChecks: rubric };
  };

  const publish = async (s: Submission, evaluation: Evaluation): Promise<void> => {
    const payload: SubmissionEvaluatedPayload = {
      submissionId: s.id,
      userId: s.userId,
      exerciseId: s.exerciseId,
      ...(s.sessionId ? { sessionId: s.sessionId } : {}),
      attemptNo: s.attemptNo,
      outcome: evaluation.outcome,
      correctness: evaluation.correctness,
      efficiency:
        evaluation.performance?.verdict === "ok" || evaluation.performance?.verdict === "too_slow"
          ? evaluation.performance.verdict
          : null,
      errorTags: evaluation.errorTags,
      helpUsed: s.helpUsed,
      evaluatedAt: evaluation.evaluatedAt,
    };
    try {
      await deps.events.publish(createEvent(GRADING_EVENTS.submissionEvaluated, payload, clock));
    } catch (e) {
      logger.error("publishing grading.submission_evaluated failed", { submissionId: s.id, error: String(e) });
    }
  };

  const doSubmit = async (req: SubmitRequest): Promise<Result<Submission, AppError>> => {
    const existing = await repo.findByKey(req.userId, req.idempotencyKey);
    if (existing) return ok(existing);
    const spec = await loadSpec(req.exerciseId);
    if (!spec.ok) return spec;
    const inserted = await repo.insertRunning({
      id: newId() as SubmissionId,
      userId: req.userId,
      exerciseId: req.exerciseId,
      ...(req.sessionId ? { sessionId: req.sessionId } : {}),
      idempotencyKey: req.idempotencyKey,
      code: req.code,
      helpUsed: req.helpUsed,
      createdAt: now(),
    });
    if (!inserted) {
      // Another process inserted the same key between our lookup and insert: return its submission.
      const winner = await repo.findByKey(req.userId, req.idempotencyKey);
      return winner ? ok(winner) : err(appError("conflict", "제출을 처리하지 못했습니다. 다시 시도하세요."));
    }
    const evaluation = await evaluate(spec.value, req.code);
    // Committed before the event goes out, so consumers can read a consistent state.
    const completed = await repo.complete(inserted.id, evaluation);
    await publish(completed, evaluation);
    return ok(completed);
  };

  return {
    async submit(req) {
      if (!req.idempotencyKey || req.idempotencyKey.length > MAX_KEY) {
        return err(appError("invalid_input", "idempotencyKey가 올바르지 않습니다."));
      }
      if (req.code.length > MAX_STORED_CODE) return err(appError("invalid_input", "코드가 너무 깁니다."));
      const key = `${req.userId}\u0000${req.idempotencyKey}`;
      const pending = inFlight.get(key);
      if (pending) return pending;
      const p = doSubmit(req).finally(() => inFlight.delete(key));
      inFlight.set(key, p);
      return p;
    },

    async trialRun(req: TrialRunRequest): Promise<Result<TrialRun, AppError>> {
      if (req.code.length > MAX_STORED_CODE) return err(appError("invalid_input", "코드가 너무 깁니다."));
      const loaded = await loadSpec(req.exerciseId);
      if (!loaded.ok) return loaded;
      const spec = loaded.value;
      if (spec.kind === "predict") return err(appError("invalid_input", "예측 문제는 실행할 수 없습니다. 답을 제출하세요."));
      const files = learnerFiles(spec, req.code);
      const reasons = staticChecks(spec, files);
      if (reasons.length > 0) return ok({ outcome: "rejected", compileDiagnostics: [], tests: [], rejectionReasons: reasons });
      if (spec.language !== runner.language) return err(appError("unavailable", `${spec.language} 실행기가 없습니다.`));
      const output = await runSafely(buildRunJob(spec, files, false));
      if (output.kind === "system_error") {
        logger.error("grading system error (trial run)", { exerciseId: spec.exerciseId, message: output.message });
        return err(appError("unavailable", "채점 환경 오류로 실행하지 못했습니다. 잠시 후 다시 시도하세요.", { message: output.message }));
      }
      const evaluation = interpretRunOutput(spec, output, now());
      return ok({
        outcome: evaluation.outcome,
        compileDiagnostics: evaluation.compileDiagnostics,
        // Public tests only: hidden tests are never run in a trial, and never shown.
        tests: evaluation.tests.filter((t) => t.visibility === "public"),
      });
    },

    async evaluateSnippet(req: SnippetRequest): Promise<Result<SnippetResult, AppError>> {
      const token = newSnippetToken();
      const built = buildSnippetJob(req, token);
      if (!built.ok) return built;
      if (built.value.kind === "rejected") return ok(built.value);
      if (runner.language !== "gleam") return err(appError("unavailable", "gleam 실행기가 없습니다."));
      const output = await runSafely(built.value.job);
      if (output.kind === "system_error") logger.error("grading system error (snippet)", { message: output.message });
      return interpretSnippetOutput(output, token);
    },

    async recoverInterrupted() {
      const evaluation: Evaluation = {
        outcome: "system_error",
        correctness: false,
        compileDiagnostics: [],
        tests: [],
        requirements: [],
        rubricChecks: [],
        errorTags: [],
        rejectionReasons: ["채점 중 서버가 중단되어 결과를 얻지 못했습니다. 다시 제출해 주세요."],
        evaluatedAt: now(),
      };
      const recovered = await repo.completeInterrupted(evaluation);
      for (const s of recovered) await publish(s, evaluation);
      if (recovered.length > 0) logger.warn("recovered interrupted submissions", { count: recovered.length });
      return recovered.length;
    },

    getSubmission: (id, userId) => repo.get(id, userId),
    listSubmissions: (userId, exerciseId) => repo.list(userId, exerciseId),
  };
}
