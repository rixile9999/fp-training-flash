import { appError, createEvent, DEFAULT_LOCALE, err, isLocale, newId, ok } from "@fp/kernel";
import type { AppError, Clock, Db, EventBus, Locale, Logger, Result, SubmissionId } from "@fp/kernel";
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
import { msg } from "../messages.ts";
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
      return { kind: "system_error", message: `runner threw: ${e instanceof Error ? e.message : String(e)}` };
    }
  };

  /** Test names, requirement descriptions and rubric texts come from the catalog in `locale`. */
  const loadSpec = async (exerciseId: string, locale: Locale): Promise<Result<GradingSpec, AppError>> => {
    const spec = await catalog.getGradingSpec(exerciseId as GradingSpec["exerciseId"], locale);
    return spec ? ok(spec) : err(appError("not_found", msg("service.notFound", locale), { exerciseId }));
  };

  /** `req.locale` or the default; an unsupported value is invalid_input. */
  const localeOf = (requested: string | undefined): Result<Locale, AppError> =>
    requested === undefined
      ? ok(DEFAULT_LOCALE)
      : isLocale(requested)
        ? ok(requested)
        : err(appError("invalid_input", msg("service.badLocale", DEFAULT_LOCALE, { locale: String(requested).slice(0, 20) })));

  /** Full evaluation of a submission (hidden tests + performance). Never throws for runner failures. */
  const evaluate = async (spec: GradingSpec, code: string, locale: Locale): Promise<Evaluation> => {
    if (spec.kind === "predict") return predictEvaluation(spec, code, now(), locale);
    const files = learnerFiles(spec, code);
    const rubric = rubricChecks(spec.rubric, files, locale);
    const reasons = staticChecks(spec, files, locale);
    if (reasons.length > 0) return { ...rejectedEvaluation(spec, reasons, now()), rubricChecks: rubric };
    const output: RunOutput =
      spec.language === runner.language
        ? await runSafely(buildRunJob(spec, files, true))
        : { kind: "system_error", message: `no runner for language ${spec.language}` };
    if (output.kind === "system_error") {
      logger.error("grading system error", { exerciseId: spec.exerciseId, message: output.message });
    }
    return { ...interpretRunOutput(spec, output, now(), locale), rubricChecks: rubric };
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

  const doSubmit = async (req: SubmitRequest, locale: Locale): Promise<Result<Submission, AppError>> => {
    // A retried key returns the original submission, in the locale it was evaluated in.
    const existing = await repo.findByKey(req.userId, req.idempotencyKey);
    if (existing) return ok(existing);
    const spec = await loadSpec(req.exerciseId, locale);
    if (!spec.ok) return spec;
    const inserted = await repo.insertRunning({
      id: newId() as SubmissionId,
      userId: req.userId,
      exerciseId: req.exerciseId,
      ...(req.sessionId ? { sessionId: req.sessionId } : {}),
      idempotencyKey: req.idempotencyKey,
      code: req.code,
      helpUsed: req.helpUsed,
      locale,
      createdAt: now(),
    });
    if (!inserted) {
      // Another process inserted the same key between our lookup and insert: return its submission.
      const winner = await repo.findByKey(req.userId, req.idempotencyKey);
      return winner ? ok(winner) : err(appError("conflict", msg("service.conflict", locale)));
    }
    const evaluation = await evaluate(spec.value, req.code, locale);
    // Committed before the event goes out, so consumers can read a consistent state.
    const completed = await repo.complete(inserted.id, evaluation);
    await publish(completed, evaluation);
    return ok(completed);
  };

  return {
    async submit(req) {
      const loc = localeOf(req.locale);
      if (!loc.ok) return loc;
      const locale = loc.value;
      if (!req.idempotencyKey || req.idempotencyKey.length > MAX_KEY) {
        return err(appError("invalid_input", msg("service.badKey", locale)));
      }
      if (req.code.length > MAX_STORED_CODE) return err(appError("invalid_input", msg("service.codeTooLong", locale)));
      const key = `${req.userId}\u0000${req.idempotencyKey}`;
      const pending = inFlight.get(key);
      if (pending) return pending;
      const p = doSubmit(req, locale).finally(() => inFlight.delete(key));
      inFlight.set(key, p);
      return p;
    },

    async trialRun(req: TrialRunRequest): Promise<Result<TrialRun, AppError>> {
      const loc = localeOf(req.locale);
      if (!loc.ok) return loc;
      const locale = loc.value;
      if (req.code.length > MAX_STORED_CODE) return err(appError("invalid_input", msg("service.codeTooLong", locale)));
      const loaded = await loadSpec(req.exerciseId, locale);
      if (!loaded.ok) return loaded;
      const spec = loaded.value;
      if (spec.kind === "predict") return err(appError("invalid_input", msg("service.predictNotRunnable", locale)));
      const files = learnerFiles(spec, req.code);
      const reasons = staticChecks(spec, files, locale);
      if (reasons.length > 0) return ok({ outcome: "rejected", compileDiagnostics: [], tests: [], rejectionReasons: reasons });
      if (spec.language !== runner.language) {
        return err(appError("unavailable", msg("service.noRunner", locale, { language: spec.language })));
      }
      const output = await runSafely(buildRunJob(spec, files, false));
      if (output.kind === "system_error") {
        logger.error("grading system error (trial run)", { exerciseId: spec.exerciseId, message: output.message });
        return err(appError("unavailable", msg("service.trialUnavailable", locale), { message: output.message }));
      }
      const evaluation = interpretRunOutput(spec, output, now(), locale);
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
      if (runner.language !== "gleam") return err(appError("unavailable", msg("service.noRunner", DEFAULT_LOCALE, { language: "gleam" })));
      const output = await runSafely(built.value.job);
      if (output.kind === "system_error") logger.error("grading system error (snippet)", { message: output.message });
      return interpretSnippetOutput(output, token);
    },

    async recoverInterrupted() {
      const evaluatedAt = now();
      const evaluationFor = (locale: Locale): Evaluation => ({
        outcome: "system_error",
        correctness: false,
        compileDiagnostics: [],
        tests: [],
        requirements: [],
        rubricChecks: [],
        errorTags: [],
        rejectionReasons: [msg("eval.interrupted", locale)],
        evaluatedAt,
      });
      const recovered = await repo.completeInterrupted(evaluationFor);
      for (const s of recovered) await publish(s, s.evaluation ?? evaluationFor(DEFAULT_LOCALE));
      if (recovered.length > 0) logger.warn("recovered interrupted submissions", { count: recovered.length });
      return recovered.length;
    },

    getSubmission: (id, userId) => repo.get(id, userId),
    listSubmissions: (userId, exerciseId) => repo.list(userId, exerciseId),
  };
}
