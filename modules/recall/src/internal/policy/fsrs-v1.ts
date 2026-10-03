/**
 * Scheduling policy "fsrs-v1": FSRS-5 with its default parameters, desired retention 0.9. Pure: no I/O, no
 * clock. Replacing the policy means adding a new module implementing `SchedulingPolicy` and pointing
 * `activePolicy` at it; the review log (recall.reviews) can then be replayed with `replayCard`.
 *
 * Only long-term FSRS steps are used: the caller applies `review` to the first graded answer of a UTC day
 * (see progress.ts), so the short-term weights w17/w18 are unused.
 */
import type { RecallRating } from "../../contract/index.ts";

/** FSRS-5 default weights w0..w18. */
export const FSRS5_DEFAULT_WEIGHTS: readonly number[] = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605,
  2.2698, 0.2315, 2.9898, 0.51655, 0.6621,
];

export const DAY_MS = 24 * 60 * 60 * 1000;
export const AGAIN_DELAY_MS = 10 * 60 * 1000;
export const MAX_INTERVAL_DAYS = 365;
export const MIN_INTERVAL_DAYS = 1;

/** FSRS memory state of one (user, card). */
export interface MemoryState {
  /** 1..10 */
  readonly difficulty: number;
  /** Days until retrievability falls to 90%. */
  readonly stability: number;
  /** Memory updates applied (first graded answer per UTC day). */
  readonly reps: number;
  /** "again" ratings on a card that already had a memory state. */
  readonly lapses: number;
  /** ISO time of the last memory update. */
  readonly lastReviewAt: string;
}

export interface SchedulingPolicy {
  readonly version: string;
  readonly desiredRetention: number;
  /** Applies one memory update (the first graded answer of a UTC day, or the very first answer). */
  review(prev: MemoryState | null, rating: RecallRating, at: Date): MemoryState;
  /** Whole days (MIN..MAX) until retrievability reaches the desired retention. */
  intervalDays(stability: number): number;
  /** Due time after an answer at `at`: 10 minutes after "again", else `intervalDays(stability)` days. */
  dueAfter(state: MemoryState, rating: RecallRating, at: Date): Date;
  /** Probability of recall after `elapsedDays`. */
  retrievability(elapsedDays: number, stability: number): number;
}

const DECAY = -0.5;
const FACTOR = 0.9 ** (1 / DECAY) - 1; // 19/81
const GRADE: Readonly<Record<RecallRating, 1 | 2 | 3 | 4>> = { again: 1, hard: 2, good: 3, easy: 4 };

const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));

/** Calendar days between two instants in UTC (0 on the same UTC day). */
export function utcDayDiff(from: Date, to: Date): number {
  const day = (d: Date) => Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / DAY_MS);
  return day(to) - day(from);
}

export function utcDay(d: Date | string): string {
  return new Date(d).toISOString().slice(0, 10);
}

export function createFsrs(weights: readonly number[] = FSRS5_DEFAULT_WEIGHTS, desiredRetention = 0.9, version = "fsrs-v1"): SchedulingPolicy {
  const w = (i: number): number => weights[i] ?? 0;
  const initStability = (g: number) => Math.max(w(g - 1), 0.1);
  const initDifficulty = (g: number) => w(4) - Math.exp(w(5) * (g - 1)) + 1;
  const retrievability = (t: number, s: number) => (1 + (FACTOR * Math.max(0, t)) / s) ** DECAY;

  const nextDifficulty = (d: number, g: number) => {
    const delta = -w(6) * (g - 3);
    const damped = d + (delta * (10 - d)) / 9;
    return clamp(w(7) * initDifficulty(4) + (1 - w(7)) * damped, 1, 10);
  };
  const recallStability = (d: number, s: number, r: number, g: number) => {
    const hardPenalty = g === 2 ? w(15) : 1;
    const easyBonus = g === 4 ? w(16) : 1;
    return s * (1 + Math.exp(w(8)) * (11 - d) * s ** -w(9) * (Math.exp(w(10) * (1 - r)) - 1) * hardPenalty * easyBonus);
  };
  const forgetStability = (d: number, s: number, r: number) =>
    Math.min(s, w(11) * d ** -w(12) * ((s + 1) ** w(13) - 1) * Math.exp(w(14) * (1 - r)));

  const intervalDays = (stability: number) => {
    const raw = (stability / FACTOR) * (desiredRetention ** (1 / DECAY) - 1);
    return clamp(Math.round(raw), MIN_INTERVAL_DAYS, MAX_INTERVAL_DAYS);
  };

  return {
    version,
    desiredRetention,
    retrievability,
    intervalDays,
    review(prev, rating, at) {
      const g = GRADE[rating];
      const lastReviewAt = at.toISOString();
      if (prev === null) {
        return { difficulty: clamp(initDifficulty(g), 1, 10), stability: initStability(g), reps: 1, lapses: 0, lastReviewAt };
      }
      const t = Math.max(0, utcDayDiff(new Date(prev.lastReviewAt), at));
      const r = retrievability(t, prev.stability);
      const stability = g === 1 ? forgetStability(prev.difficulty, prev.stability, r) : recallStability(prev.difficulty, prev.stability, r, g);
      return {
        difficulty: nextDifficulty(prev.difficulty, g),
        stability: clamp(stability, 0.01, 36500),
        reps: prev.reps + 1,
        lapses: prev.lapses + (g === 1 ? 1 : 0),
        lastReviewAt,
      };
    },
    dueAfter(state, rating, at) {
      if (rating === "again") return new Date(at.getTime() + AGAIN_DELAY_MS);
      return new Date(at.getTime() + intervalDays(state.stability) * DAY_MS);
    },
  };
}

export const fsrsV1: SchedulingPolicy = createFsrs();

/** The policy used for live updates and replay. */
export const activePolicy: SchedulingPolicy = fsrsV1;
