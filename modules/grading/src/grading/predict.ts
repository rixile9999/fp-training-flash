import type { PredictSpec } from "@fp/content/contract";

/** Trim and collapse all whitespace runs to one space. */
export function normalizeAnswer(answer: string): string {
  return answer.trim().replace(/\s+/g, " ");
}

export function isAcceptedAnswer(predict: PredictSpec, answer: string): boolean {
  const given = normalizeAnswer(answer);
  return given.length > 0 && predict.acceptedAnswers.some((a) => normalizeAnswer(a) === given);
}
