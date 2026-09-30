import { appError, err, ok, type Clock, type Db, type ExerciseId, type Logger, type UserId } from "@fp/kernel";
import type { ContentCatalog, ExerciseDetail, Hint } from "@fp/content/contract";
import type { Evaluation, GradingService, HelpUsed } from "@fp/grading/contract";
import type { ErrorTagStat, LearnerModel } from "@fp/learner/contract";
import type { ChatReply, CoachingFeedback, CoachingService, Explanation } from "../contract/index.ts";
import { createFeedbackCache } from "./feedback-cache.ts";
import { createHelpLedger, isHintLevel, parseHintLevel } from "./ledger.ts";
import { withTimeout, type LlmClient, type LlmMessage } from "./llm.ts";
import {
  PROMPT_VERSION,
  buildChatRequest,
  buildFeedbackRequest,
  validateLlmFeedback,
  type RevealedReference,
} from "./prompts.ts";
import { countLines, extractLineReferences } from "./references.ts";
import { runChatAgent } from "./chat-agent.ts";
import { RULE_BASED_MODEL, RULE_BASED_VERSION, ruleBasedChatReply, ruleBasedFeedback } from "./rule-based.ts";

export interface CoachingServiceDeps {
  readonly db: Db;
  readonly clock: Clock;
  readonly logger: Logger;
  readonly catalog: ContentCatalog;
  readonly grading: GradingService;
  readonly learner: LearnerModel;
  /** null = provider "none": always rule-based. */
  readonly llm: LlmClient | null;
  readonly llmTimeoutMs?: number;
  /** Answer chat with the tool-using agent when the LLM client supports tools (see chat-agent.ts). */
  readonly chatAgent?: boolean;
  readonly chatAgentTimeoutMs?: number;
}

const MAX_CHAT_MESSAGES = 20;
const MAX_CHAT_MESSAGE_CHARS = 4000;
const MAX_CODE_CHARS = 50_000;

export function createCoachingService(deps: CoachingServiceDeps): CoachingService {
  const { catalog, grading, learner, clock, logger, llm } = deps;
  const ledger = createHelpLedger(deps.db, clock);
  const cache = createFeedbackCache(deps.db, clock);
  const timeoutMs = deps.llmTimeoutMs ?? 30_000;

  async function revealedReference(exercise: ExerciseDetail, help: HelpUsed): Promise<RevealedReference | undefined> {
    if (!help.explanationViewed) return undefined;
    const ref = await catalog.getReferenceMaterial(exercise.id);
    return ref ? { explanationMarkdown: ref.explanationMarkdown, solutionCode: solutionCode(exercise, ref.solutionFiles) } : undefined;
  }

  async function errorTagHistory(userId: UserId, exercise: ExerciseDetail): Promise<readonly ErrorTagStat[]> {
    try {
      return (await learner.getProfile(userId, exercise.language)).errorTags;
    } catch (e) {
      logger.warn("coaching: learner profile unavailable", { error: String(e) });
      return [];
    }
  }

  const service: CoachingService = {
    async feedback(submissionId, userId) {
      const submission = await grading.getSubmission(submissionId, userId);
      if (!submission) return err(appError("not_found", "제출을 찾을 수 없습니다."));
      if (submission.userId !== userId) return err(appError("forbidden", "다른 사용자의 제출입니다."));
      const evaluation = submission.evaluation;
      if (submission.status !== "completed" || !evaluation) {
        return err(appError("conflict", "채점이 아직 끝나지 않았습니다."));
      }

      const key = llm
        ? { submissionId, promptVersion: PROMPT_VERSION, model: llm.model }
        : { submissionId, promptVersion: RULE_BASED_VERSION, model: RULE_BASED_MODEL };
      const cached = await cache.get(key);
      if (cached) return ok(cached);

      const exercise = await catalog.getExercise(submission.exerciseId);
      if (!exercise) return err(appError("not_found", "문제를 찾을 수 없습니다.", { exerciseId: submission.exerciseId }));

      const history = await errorTagHistory(userId, exercise);
      const createdAt = clock.now().toISOString();
      const fallback = (): CoachingFeedback =>
        ruleBasedFeedback({ submissionId, evaluation, rubric: exercise.rubric, errorTagHistory: history, createdAt });

      if (!llm) {
        const fb = fallback();
        await cache.put(key, userId, fb);
        return ok(fb);
      }
      // Infrastructure failures get a fixed apology; no LLM opinion is useful there.
      if (evaluation.outcome === "system_error") return ok(fallback());

      const ledgerHelp = await ledger.summary(userId, submission.exerciseId);
      const help: HelpUsed = {
        ...ledgerHelp,
        explanationViewed: ledgerHelp.explanationViewed || submission.helpUsed.explanationViewed,
      };
      const request = buildFeedbackRequest({
        exercise,
        code: submission.code,
        attemptNo: submission.attemptNo,
        evaluation,
        errorTagHistory: history,
        helpUsed: help,
        reference: await revealedReference(exercise, help),
      });

      let raw: string;
      try {
        raw = await withTimeout(llm.complete(request), timeoutMs);
      } catch (e) {
        logger.warn("coaching: llm feedback failed, using rules", { submissionId, error: String(e) });
        return ok(fallback());
      }
      const validated = validateLlmFeedback(raw, { evaluation, exercise, codeLines: countLines(submission.code) ?? 0 });
      if (!validated.ok) {
        logger.warn("coaching: llm feedback rejected, using rules", { submissionId, reason: validated.reason });
        return ok(fallback());
      }
      const fb: CoachingFeedback = {
        submissionId,
        ...validated.value,
        source: "llm",
        model: llm.model,
        promptVersion: PROMPT_VERSION,
        createdAt,
      };
      await cache.put(key, userId, fb);
      // Re-read so concurrent callers converge on the stored row.
      return ok((await cache.get(key)) ?? fb);
    },

    async chat(req) {
      const last = req.messages[req.messages.length - 1];
      if (!last || last.role !== "user") return err(appError("invalid_input", "마지막 메시지는 학습자의 질문이어야 합니다."));
      if (last.content.trim().length === 0) return err(appError("invalid_input", "질문 내용이 비어 있습니다."));
      if (req.messages.some((m) => m.content.length > MAX_CHAT_MESSAGE_CHARS)) {
        return err(appError("invalid_input", `메시지는 ${MAX_CHAT_MESSAGE_CHARS}자 이하여야 합니다.`));
      }
      if (req.code !== undefined && req.code.length > MAX_CODE_CHARS) {
        return err(appError("invalid_input", "코드가 너무 깁니다."));
      }

      const exercise = await catalog.getExercise(req.exerciseId);
      if (!exercise) return err(appError("not_found", "문제를 찾을 수 없습니다."));

      let evaluation: Evaluation | undefined;
      if (req.submissionId !== undefined) {
        const submission = await grading.getSubmission(req.submissionId, req.userId);
        if (!submission) return err(appError("not_found", "제출을 찾을 수 없습니다."));
        if (submission.userId !== req.userId) return err(appError("forbidden", "다른 사용자의 제출입니다."));
        if (submission.exerciseId !== req.exerciseId) {
          return err(appError("invalid_input", "제출이 이 문제에 속하지 않습니다."));
        }
        evaluation = submission.evaluation;
      }

      const help = await ledger.summary(req.userId, req.exerciseId);
      const [conceptNotes, theoryTopics] = await Promise.all([
        catalog.getConceptNotes(exercise.conceptNoteIds),
        catalog.getTheoryTopics(exercise.theoryTopicIds),
      ]);
      const maxLine = countLines(req.code);

      let text: string | undefined;
      let source: ChatReply["source"] = "rule_based";
      if (llm) {
        const messages: LlmMessage[] = req.messages.slice(-MAX_CHAT_MESSAGES).map((m) => ({ role: m.role, content: m.content }));
        const reference = await revealedReference(exercise, help);
        const request = buildChatRequest({
          exercise,
          conceptNotes,
          theoryTopics,
          helpUsed: help,
          ...(req.code !== undefined ? { code: req.code } : {}),
          ...(evaluation ? { evaluation } : {}),
          ...(reference ? { reference } : {}),
          messages,
        });
        if (deps.chatAgent && llm.chatWithTools) {
          try {
            const agent = await runChatAgent({
              llm,
              grading,
              logger,
              exercise,
              conceptNotes,
              theoryTopics,
              request,
              timeoutMs: deps.chatAgentTimeoutMs ?? 60_000,
            });
            text = agent.text.trim();
            source = "llm";
          } catch (e) {
            logger.warn("coaching: chat agent failed, using single call", { exerciseId: req.exerciseId, error: String(e) });
          }
        }
        if (text === undefined) {
          try {
            const reply = (await withTimeout(llm.complete(request), timeoutMs)).trim();
            if (reply.length > 0) {
              text = reply;
              source = "llm";
            }
          } catch (e) {
            logger.warn("coaching: llm chat failed, using rules", { exerciseId: req.exerciseId, error: String(e) });
          }
        }
      }
      text ??= ruleBasedChatReply({
        exercise,
        helpUsed: help,
        ...(evaluation ? { evaluation } : {}),
        conceptNoteTitles: conceptNotes.map((n) => n.title),
      });

      await ledger.record(req.userId, req.exerciseId, "coach_message");
      return ok({
        message: { role: "assistant", content: text },
        references: extractLineReferences(text, maxLine),
        source,
      });
    },

    async revealHint(userId, exerciseId, level) {
      if (!isHintLevel(level)) return err(appError("invalid_input", "힌트 단계는 1에서 5 사이여야 합니다.", { level }));
      const exercise = await catalog.getExercise(exerciseId);
      if (!exercise) return err(appError("not_found", "문제를 찾을 수 없습니다."));
      const authored = [...exercise.hints].sort((a, b) => a.level - b.level);
      const maxAuthored = authored.reduce((m, h) => Math.max(m, h.level), 0);
      if (level > maxAuthored) {
        return err(appError("invalid_input", `이 문제에는 ${maxAuthored}단계 힌트까지만 있습니다.`, { level, maxAuthored }));
      }
      const current = (await ledger.summary(userId, exerciseId)).maxHintLevel;
      if (level > current + 1) {
        return err(
          appError("invalid_input", `힌트는 순서대로 열어야 합니다. 다음에 열 수 있는 단계는 ${current + 1}단계입니다.`, {
            level,
            currentMaxLevel: current,
          }),
        );
      }
      if (level > current) await ledger.record(userId, exerciseId, "hint", String(level), level);
      const hints: readonly Hint[] = authored.filter((h) => h.level <= level);
      return ok(hints);
    },

    async revealExplanation(userId, exerciseId) {
      const exercise = await catalog.getExercise(exerciseId);
      if (!exercise) return err(appError("not_found", "문제를 찾을 수 없습니다."));
      const ref = await catalog.getReferenceMaterial(exerciseId);
      if (!ref) return err(appError("not_found", "이 문제에는 해설이 없습니다."));
      await ledger.record(userId, exerciseId, "explanation");
      const explanation: Explanation = {
        exerciseId,
        markdown: ref.explanationMarkdown,
        solutionCode: solutionCode(exercise, ref.solutionFiles),
      };
      return ok(explanation);
    },

    async recordHelp(userId, exerciseId, kind, ref) {
      await ledger.record(userId, exerciseId, kind, ref, kind === "hint" ? parseHintLevel(ref) : undefined);
    },

    helpUsed(userId: UserId, exerciseId: ExerciseId) {
      return ledger.summary(userId, exerciseId);
    },
  };
  return service;
}

/** The learner's module file from the reference solution; all files with headers if it is missing. */
function solutionCode(exercise: ExerciseDetail, files: readonly { path: string; content: string }[]): string {
  const main = files.find((f) => f.path === `src/${exercise.moduleName}.gleam`);
  if (main) return main.content;
  if (files.length === 1 && files[0]) return files[0].content;
  return files.map((f) => `// ${f.path}\n${f.content}`).join("\n\n");
}
