/**
 * Recall contract (docs/design/recall.md): spaced-repetition memorization of Gleam syntax and the core library.
 * Each card climbs recognize -> cloze -> produce; scheduling is FSRS with automatic ratings; answers are always
 * checked server-side, produce answers in the grading sandbox. Recall does not change Elo ratings.
 */
import type { AppError, Locale, Result, UserId } from "@fp/kernel";
import type { RecallCard, RecallStage } from "@fp/content/contract";

export type RecallItemKind = "new" | "review" | "mix" | "finale";
/** "predict" is the typed-value variant of stage 1. */
export type RecallItemForm = RecallStage | "predict";
export type RecallRating = "again" | "hard" | "good" | "easy";

export interface RecallItem {
  readonly itemId: string;
  readonly kind: RecallItemKind;
  readonly form: RecallItemForm;
  /** For "new" items the UI first shows card.summary and card.example, then asks the recognize question. */
  readonly card: RecallCard;
}

export interface RecallSessionView {
  readonly sessionId: string;
  readonly items: readonly RecallItem[];
  readonly startedAt: string;
}

export type RecallResponse =
  | { readonly kind: "choice"; readonly choice: number }
  /** Cloze fill or typed predict value. */
  | { readonly kind: "text"; readonly text: string }
  /** Produce: the function body only (without the header). */
  | { readonly kind: "code"; readonly body: string };

export interface RecallAnswerResult {
  readonly correct: boolean;
  readonly rating: RecallRating;
  readonly feedback: string;
  /** Shown after answering cloze/predict items. */
  readonly expected?: string;
  /** Value the learner's code or typed expression produced (sandbox). */
  readonly actual?: string;
  /** Compile/runtime problems of a produce answer, already localized. */
  readonly diagnostics?: readonly string[];
  /** Missing mustUse tokens of a produce answer. */
  readonly missing?: readonly string[];
  /** Revealed after a wrong produce answer. */
  readonly reference?: string;
  readonly stage: RecallStage;
  readonly nextDueAt: string;
}

export interface DeckProgress {
  readonly deckId: string;
  readonly title: string;
  readonly total: number;
  readonly seen: number;
  /** Stage produce reached and stability >= 21 days. */
  readonly mastered: number;
  readonly due: number;
}

export interface RecallOverview {
  readonly decks: readonly DeckProgress[];
  readonly dueNow: number;
  readonly newAvailableToday: number;
  readonly newPerDay: number;
}

export interface RecallSummary {
  readonly sessionId: string;
  readonly answered: number;
  readonly correct: number;
  readonly newLearned: number;
  readonly dueTomorrow: number;
  readonly decks: readonly DeckProgress[];
}

export interface RecallCardState {
  readonly stage: RecallStage;
  readonly reps: number;
  readonly lapses: number;
  readonly dueAt?: string;
  readonly stabilityDays?: number;
}

export interface RecallService {
  overview(userId: UserId, locale?: Locale): Promise<RecallOverview>;
  /** Builds about `minutes` (default 10) of items: due reviews, new cards, mix, finale. */
  startSession(
    userId: UserId,
    opts?: { readonly minutes?: number; readonly deckIds?: readonly string[] },
    locale?: Locale,
  ): Promise<Result<RecallSessionView, AppError>>;
  /** Idempotent per (session, item): a second answer returns the first result. */
  answer(
    userId: UserId,
    sessionId: string,
    itemId: string,
    response: RecallResponse,
    elapsedMs: number,
    locale?: Locale,
  ): Promise<Result<RecallAnswerResult, AppError>>;
  finish(userId: UserId, sessionId: string, locale?: Locale): Promise<Result<RecallSummary, AppError>>;
  /** Browse a deck with the learner's state per card. */
  cards(userId: UserId, deckId: string, locale?: Locale): Promise<Result<readonly (RecallCard & { readonly state: RecallCardState | null })[], AppError>>;
}
