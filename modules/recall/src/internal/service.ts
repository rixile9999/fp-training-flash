/** RecallService (docs/design/recall.md): sessions, server-side grading, FSRS scheduling and stages. */
import { appError, DEFAULT_LOCALE, err, isLocale, newId, ok } from "@fp/kernel";
import type { AppError, Clock, Db, Locale, Logger, Result, UserId } from "@fp/kernel";
import type { ContentCatalog, RecallCard, RecallCardKey, RecallDeck } from "@fp/content/contract";
import type { GradingService } from "@fp/grading/contract";
import type {
  DeckProgress,
  RecallAnswerResult,
  RecallCardState,
  RecallItem,
  RecallOverview,
  RecallResponse,
  RecallService,
  RecallSessionView,
  RecallSummary,
} from "../contract/index.ts";
import { gradeResponse, renderOutcome, validateResponse } from "./grade.ts";
import { t } from "./messages.ts";
import { activePolicy, DAY_MS, utcDay } from "./policy/fsrs-v1.ts";
import { applyAnswer, deriveRating, isMastered, stageName, type CardProgress } from "./progress.ts";
import { buildSession, type CardRef } from "./session-builder.ts";
import { createStore, type StoredReview } from "./store.ts";

export const DEFAULT_MINUTES = 10;
export const MAX_MINUTES = 60;
export const DEFAULT_NEW_CARDS_PER_DAY = 10;

export interface RecallServiceDeps {
  readonly db: Db;
  readonly clock: Clock;
  readonly logger: Logger;
  readonly catalog: ContentCatalog;
  readonly grading: GradingService;
  readonly newCardsPerDay?: number;
}

function resolveLocale(locale: string | undefined | null): Locale {
  return locale != null && isLocale(locale) ? locale : DEFAULT_LOCALE;
}

function startOfUtcDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function createRecallService(deps: RecallServiceDeps): RecallService {
  const { db, clock, catalog, grading, logger } = deps;
  const store = createStore(db);
  const newPerDay = Math.max(0, Math.floor(deps.newCardsPerDay ?? DEFAULT_NEW_CARDS_PER_DAY));
  const policy = activePolicy;

  /** Decks by `order`; cards in deck order, then catalog (authoring) order. */
  async function loadCatalog(locale: Locale): Promise<{ decks: RecallDeck[]; cards: RecallCard[] }> {
    const decks = [...(await catalog.listRecallDecks(locale))].sort((a, b) => a.order - b.order);
    const rank = new Map(decks.map((d, i) => [d.id, i]));
    const all = await catalog.listRecallCards(undefined, locale);
    const cards = all
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => rank.has(c.deckId))
      .sort((a, b) => (rank.get(a.c.deckId) ?? 0) - (rank.get(b.c.deckId) ?? 0) || a.i - b.i)
      .map(({ c }) => c);
    return { decks, cards };
  }

  function introducedToday(states: ReadonlyMap<string, CardProgress>, now: Date): number {
    const today = utcDay(now);
    let n = 0;
    for (const p of states.values()) if (utcDay(p.firstSeenAt) === today) n++;
    return n;
  }

  function deckProgress(decks: readonly RecallDeck[], cards: readonly RecallCard[], states: ReadonlyMap<string, CardProgress>, now: Date): DeckProgress[] {
    const nowMs = now.getTime();
    return decks.map((d) => {
      const own = cards.filter((c) => c.deckId === d.id);
      const ps = own.map((c) => states.get(c.id)).filter((p): p is CardProgress => p !== undefined);
      return {
        deckId: d.id,
        title: d.title,
        total: own.length,
        seen: ps.length,
        mastered: ps.filter(isMastered).length,
        due: ps.filter((p) => Date.parse(p.dueAt) <= nowMs).length,
      };
    });
  }

  function cardState(p: CardProgress): RecallCardState {
    return {
      stage: stageName(p.stage),
      reps: p.memory.reps,
      lapses: p.memory.lapses,
      dueAt: p.dueAt,
      stabilityDays: Math.round(p.memory.stability * 10) / 10,
    };
  }

  function toResult(r: StoredReview, key: RecallCardKey | null, locale: Locale): RecallAnswerResult {
    return {
      correct: r.correct,
      rating: r.rating,
      ...renderOutcome(r.result, key, locale),
      stage: stageName(r.stageAfter),
      nextDueAt: r.dueAt,
    };
  }

  async function ownSession(userId: UserId, sessionId: string, locale: Locale) {
    const session = typeof sessionId === "string" ? await store.session(sessionId) : null;
    if (!session || session.userId !== userId) return err(appError("not_found", t(locale, "error.sessionNotFound")));
    return ok(session);
  }

  return {
    async overview(userId, loc) {
      const locale = resolveLocale(loc);
      const now = clock.now();
      const [{ decks, cards }, states] = await Promise.all([loadCatalog(locale), store.states(userId)]);
      const unseen = cards.filter((c) => !states.has(c.id)).length;
      const nowMs = now.getTime();
      return {
        decks: deckProgress(decks, cards, states, now),
        dueNow: cards.filter((c) => {
          const p = states.get(c.id);
          return p !== undefined && Date.parse(p.dueAt) <= nowMs;
        }).length,
        newAvailableToday: Math.min(unseen, Math.max(0, newPerDay - introducedToday(states, now))),
        newPerDay,
      } satisfies RecallOverview;
    },

    async startSession(userId, opts, loc): Promise<Result<RecallSessionView, AppError>> {
      const locale = resolveLocale(loc);
      const minutesIn: unknown = opts?.minutes ?? DEFAULT_MINUTES;
      if (typeof minutesIn !== "number" || !Number.isFinite(minutesIn) || minutesIn < 1) {
        return err(appError("invalid_input", t(locale, "error.invalidMinutes")));
      }
      const minutes = Math.min(MAX_MINUTES, minutesIn);
      const deckIdsIn: unknown = opts?.deckIds;
      if (deckIdsIn !== undefined && (!Array.isArray(deckIdsIn) || deckIdsIn.some((d) => typeof d !== "string"))) {
        return err(appError("invalid_input", t(locale, "error.invalidDeckIds")));
      }
      const now = clock.now();
      const [{ decks, cards }, states] = await Promise.all([loadCatalog(locale), store.states(userId)]);
      let deckIds: string[] | null = null;
      if (deckIdsIn !== undefined && deckIdsIn.length > 0) {
        const known = new Set(decks.map((d) => d.id));
        const unknown = (deckIdsIn as string[]).find((d) => !known.has(d));
        if (unknown !== undefined) return err(appError("invalid_input", t(locale, "error.deckNotFound", { deckId: unknown }), { deckId: unknown }));
        deckIds = [...new Set(deckIdsIn as string[])];
      }
      const pool = deckIds === null ? cards : cards.filter((c) => deckIds.includes(c.deckId));
      const byId = new Map(pool.map((c) => [c.id, c]));
      const refs: CardRef[] = pool.map((c) => ({ id: c.id, topic: c.topic, hasPredict: c.predict !== undefined }));
      const items = buildSession({
        now,
        budgetSec: minutes * 60,
        cards: refs,
        progress: states,
        newAllowed: Math.max(0, newPerDay - introducedToday(states, now)),
      });
      const id = newId();
      const startedAt = now.toISOString();
      await store.createSession({ id, userId, items, startedAt, finishedAt: null }, minutes, deckIds);
      logger.info("recall session started", { sessionId: id, items: items.length });
      const view: RecallItem[] = items.map((i) => ({ itemId: i.itemId, kind: i.kind, form: i.form, card: byId.get(i.cardId) as RecallCard }));
      return ok({ sessionId: id, items: view, startedAt });
    },

    async answer(userId, sessionId, itemId, response: RecallResponse, elapsedMs, loc): Promise<Result<RecallAnswerResult, AppError>> {
      const locale = resolveLocale(loc);
      const s = await ownSession(userId, sessionId, locale);
      if (!s.ok) return s;
      const session = s.value;
      const item = session.items.find((i) => i.itemId === itemId);
      if (!item) return err(appError("not_found", t(locale, "error.itemNotFound", { itemId: String(itemId) })));

      const existing = await store.review(session.id, item.itemId);
      if (existing) return ok(toResult(existing, await catalog.getRecallCardKey(item.cardId, locale), locale));
      if (session.finishedAt !== null) return err(appError("conflict", t(locale, "error.sessionFinished")));
      if (typeof elapsedMs !== "number" || !Number.isFinite(elapsedMs) || elapsedMs < 0) {
        return err(appError("invalid_input", t(locale, "error.invalidElapsed")));
      }

      const [card, key] = await Promise.all([catalog.getRecallCard(item.cardId, locale), catalog.getRecallCardKey(item.cardId, locale)]);
      if (!card || !key || (item.form === "predict" && (!card.predict || !key.predict))) {
        return err(appError("conflict", t(locale, "error.cardMissing"), { cardId: item.cardId }));
      }
      const valid = validateResponse(item.form, response, card, locale);
      if (!valid.ok) return valid;
      const graded = await gradeResponse(item.form, valid.value, card, key, grading, locale);
      if (!graded.ok) {
        logger.warn("recall answer not graded", { sessionId: session.id, itemId, code: graded.error.code });
        return graded;
      }
      const outcome = graded.value;
      const elapsed = Math.min(2_147_483_647, Math.round(elapsedMs));
      const rating = deriveRating(item.form, outcome.correct, elapsed);
      const at = clock.now();

      const stored = await db.transaction(async (tx) => {
        const again = await store.review(session.id, item.itemId, tx);
        if (again) return again;
        const prev = await store.state(userId, item.cardId, tx);
        const { progress, memoryUpdated } = applyAnswer(prev, { form: item.form, correct: outcome.correct, rating, at }, policy);
        const review: StoredReview = {
          itemId: item.itemId,
          cardId: item.cardId,
          kind: item.kind,
          form: item.form,
          correct: outcome.correct,
          rating,
          elapsedMs: elapsed,
          policyVersion: policy.version,
          memoryUpdated,
          stageBefore: prev?.stage ?? 0,
          stageAfter: progress.stage,
          dueAt: progress.dueAt,
          answeredAt: at.toISOString(),
          result: outcome,
        };
        const inserted = await store.insertReview({ ...review, userId, sessionId: session.id }, tx);
        if (!inserted) return (await store.review(session.id, item.itemId, tx)) ?? review;
        await store.saveState(userId, item.cardId, progress, tx);
        return review;
      });
      return ok(toResult(stored, key, locale));
    },

    async finish(userId, sessionId, loc): Promise<Result<RecallSummary, AppError>> {
      const locale = resolveLocale(loc);
      const s = await ownSession(userId, sessionId, locale);
      if (!s.ok) return s;
      const now = clock.now();
      await store.finishSession(s.value.id, now.toISOString());
      const [reviews, { decks, cards }, states] = await Promise.all([store.sessionReviews(s.value.id), loadCatalog(locale), store.states(userId)]);
      const tomorrowEnd = startOfUtcDay(now) + 2 * DAY_MS;
      const known = new Set(cards.map((c) => c.id));
      let dueTomorrow = 0;
      for (const [cardId, p] of states) if (known.has(cardId) && Date.parse(p.dueAt) < tomorrowEnd) dueTomorrow++;
      return ok({
        sessionId: s.value.id,
        answered: reviews.length,
        correct: reviews.filter((r) => r.correct).length,
        newLearned: new Set(reviews.filter((r) => r.kind === "new").map((r) => r.cardId)).size,
        dueTomorrow,
        decks: deckProgress(decks, cards, states, now),
      });
    },

    async cards(userId, deckId, loc) {
      const locale = resolveLocale(loc);
      const decks = await catalog.listRecallDecks(locale);
      if (!decks.some((d) => d.id === deckId)) return err(appError("not_found", t(locale, "error.deckNotFound", { deckId: String(deckId) })));
      const [cards, states] = await Promise.all([catalog.listRecallCards(deckId, locale), store.states(userId)]);
      return ok(
        cards
          .filter((c) => c.deckId === deckId)
          .map((c) => {
            const p = states.get(c.id);
            return { ...c, state: p ? cardState(p) : null };
          }),
      );
    },
  };
}
