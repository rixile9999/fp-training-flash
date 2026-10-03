/**
 * Pure per-(user, card) progress: stage transitions, automatic ratings and the same-day rule. Used by the live
 * answer path and by `replayCard`, so replaying the review log reproduces the stored state.
 */
import type { RecallStage } from "@fp/content/contract";
import type { RecallItemForm, RecallRating } from "../contract/index.ts";
import { activePolicy, utcDay, type MemoryState, type SchedulingPolicy } from "./policy/fsrs-v1.ts";

export type StageNumber = 0 | 1 | 2;
export type Stage1Form = "cloze" | "predict";

export const STAGE_NAMES: readonly RecallStage[] = ["recognize", "cloze", "produce"];

export function stageName(stage: StageNumber): RecallStage {
  return STAGE_NAMES[stage] ?? "recognize";
}

export function formStage(form: RecallItemForm): StageNumber {
  return form === "recognize" ? 0 : form === "produce" ? 2 : 1;
}

/** Slow (-> hard) and fast (-> easy, stage >= 1 forms only) thresholds in ms. */
export const RATING_THRESHOLDS: Readonly<Record<RecallItemForm, { readonly slowMs: number; readonly fastMs: number }>> = {
  recognize: { slowMs: 15_000, fastMs: 4_000 },
  cloze: { slowMs: 25_000, fastMs: 8_000 },
  predict: { slowMs: 25_000, fastMs: 8_000 },
  produce: { slowMs: 150_000, fastMs: 45_000 },
};

export function deriveRating(form: RecallItemForm, correct: boolean, elapsedMs: number): RecallRating {
  if (!correct) return "again";
  const { slowMs, fastMs } = RATING_THRESHOLDS[form];
  if (elapsedMs > slowMs) return "hard";
  if (elapsedMs < fastMs && formStage(form) >= 1) return "easy";
  return "good";
}

/** Correct at the current stage -> +1 (max 2); wrong at a form >= the current stage -> -1 (min 0). */
export function nextStage(stage: StageNumber, form: RecallItemForm, correct: boolean): StageNumber {
  const f = formStage(form);
  if (correct && f === stage) return Math.min(2, stage + 1) as StageNumber;
  if (!correct && f >= stage) return Math.max(0, stage - 1) as StageNumber;
  return stage;
}

export interface CardProgress {
  readonly memory: MemoryState;
  readonly stage: StageNumber;
  readonly dueAt: string;
  readonly lastAnswerAt: string;
  readonly firstSeenAt: string;
  readonly lastStage1Form: Stage1Form | null;
  readonly lastProduceCorrect: boolean | null;
  readonly policyVersion: string;
}

export interface AnswerFact {
  readonly form: RecallItemForm;
  readonly correct: boolean;
  readonly rating: RecallRating;
  readonly at: Date;
}

export interface Applied {
  readonly progress: CardProgress;
  /** False for later answers on the same UTC day (only the stage moved). */
  readonly memoryUpdated: boolean;
}

export function applyAnswer(prev: CardProgress | null, fact: AnswerFact, policy: SchedulingPolicy = activePolicy): Applied {
  const at = fact.at;
  const sameDay = prev !== null && utcDay(prev.memory.lastReviewAt) === utcDay(at);
  const memory = sameDay ? prev.memory : policy.review(prev?.memory ?? null, fact.rating, at);
  const dueAt = policy.dueAfter(memory, fact.rating, at).toISOString();
  const stage = nextStage(prev?.stage ?? 0, fact.form, fact.correct);
  const progress: CardProgress = {
    memory,
    stage,
    dueAt,
    lastAnswerAt: at.toISOString(),
    firstSeenAt: prev?.firstSeenAt ?? at.toISOString(),
    lastStage1Form: fact.form === "cloze" || fact.form === "predict" ? fact.form : (prev?.lastStage1Form ?? null),
    lastProduceCorrect: fact.form === "produce" ? fact.correct : (prev?.lastProduceCorrect ?? null),
    policyVersion: policy.version,
  };
  return { progress, memoryUpdated: !sameDay };
}

/** Recomputes a card's progress from its review log (oldest first). */
export function replayCard(log: readonly AnswerFact[], policy: SchedulingPolicy = activePolicy): CardProgress | null {
  let state: CardProgress | null = null;
  for (const fact of log) state = applyAnswer(state, fact, policy).progress;
  return state;
}

/** Stage 1 alternates between cloze and predict when the card has a predict form. */
export function stage1Form(progress: CardProgress | null, hasPredict: boolean): Stage1Form {
  return hasPredict && progress?.lastStage1Form === "cloze" ? "predict" : "cloze";
}

export function isMastered(p: CardProgress): boolean {
  return p.stage === 2 && p.lastProduceCorrect === true;
}
