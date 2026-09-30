/**
 * Rating policy "elo-v1". Pure: no I/O, no clock. Replacing the policy means adding a new module that
 * implements `RatingPolicy` and pointing `activePolicy` at it; `replayAll()` then recomputes all ratings.
 */

export interface RatingState {
  readonly rating: number;
  /** Rated observations already applied to `rating`. */
  readonly ratedObservations: number;
}

export interface RatingPolicy {
  readonly version: string;
  readonly initialRating: number;
  /** Probability (0..1) of success for a learner at `rating` on an exercise of `difficulty`. */
  expectedSuccess(rating: number, difficulty: number): number;
  /** Step size for the update, given `n` rated observations before this one. */
  kFactor(n: number): number;
  /** Uncertainty (±) after `n` rated observations. */
  deviation(n: number): number;
  /** Whether an estimate backed by `n` rated observations is still provisional. */
  isProvisional(n: number): boolean;
  /** Applies one rated observation. */
  update(state: RatingState, difficulty: number, success: boolean): RatingState;
}

export const ELO_V1_INITIAL_RATING = 1200;
export const ELO_V1_PROVISIONAL_BELOW = 5;

function expectedSuccess(rating: number, difficulty: number): number {
  return 1 / (1 + 10 ** ((difficulty - rating) / 400));
}

function kFactor(n: number): number {
  return Math.max(20, 80 / (1 + n / 3));
}

export const eloV1: RatingPolicy = {
  version: "elo-v1",
  initialRating: ELO_V1_INITIAL_RATING,
  expectedSuccess,
  kFactor,
  deviation: (n) => Math.max(50, Math.round(350 / Math.sqrt(1 + n))),
  isProvisional: (n) => n < ELO_V1_PROVISIONAL_BELOW,
  update: (state, difficulty, success) => ({
    rating: state.rating + kFactor(state.ratedObservations) * ((success ? 1 : 0) - expectedSuccess(state.rating, difficulty)),
    ratedObservations: state.ratedObservations + 1,
  }),
};

/** The policy used for live updates and replay. */
export const activePolicy: RatingPolicy = eloV1;
