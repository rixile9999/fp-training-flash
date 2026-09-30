/** Spaced review schedule per (user, skill, language). Pure. Only rated observations reach this module. */

export const REVIEW_INTERVALS_DAYS: readonly number[] = [1, 3, 7, 14, 30];

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ReviewState {
  readonly intervalDays: number;
  readonly dueAt: string;
  readonly lastResult: "success" | "failure";
}

/** Next interval after a success at `current` (stays at the last interval). */
export function nextIntervalDays(current: number): number {
  for (const days of REVIEW_INTERVALS_DAYS) {
    if (days > current) return days;
  }
  return REVIEW_INTERVALS_DAYS[REVIEW_INTERVALS_DAYS.length - 1] ?? current;
}

/**
 * Applies one rated observation. A schedule is created on the first rated success; before that, failures
 * leave no schedule (returns null). A success advances the interval, a failure resets it to the first one.
 */
export function scheduleReview(previous: ReviewState | null, success: boolean, occurredAt: string): ReviewState | null {
  const first = REVIEW_INTERVALS_DAYS[0] ?? 1;
  let intervalDays: number;
  if (previous === null) {
    if (!success) return null;
    intervalDays = first;
  } else {
    intervalDays = success ? nextIntervalDays(previous.intervalDays) : first;
  }
  const dueAt = new Date(new Date(occurredAt).getTime() + intervalDays * DAY_MS).toISOString();
  return { intervalDays, dueAt, lastResult: success ? "success" : "failure" };
}
