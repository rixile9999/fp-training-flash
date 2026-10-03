/**
 * Pure session composition (docs/design/recall.md "Session"): due reviews -> new cards -> mix -> finale, within
 * an estimated time budget. Item ids are stable: `<kind>:<form>:<cardId>` (a card appears at most once per kind).
 */
import type { RecallItemForm, RecallItemKind } from "../contract/index.ts";
import { stage1Form, type CardProgress } from "./progress.ts";
import { DAY_MS } from "./policy/fsrs-v1.ts";

/** Estimated seconds per item. */
export const ITEM_COST_SEC = { recognize: 20, new: 40, stage1: 30, produce: 120 } as const;
export const MIX_RECENT_MAX = 2;
export const RECENT_DAYS = 7;
export const FINALE_MAX = 2;

/**
 * Writing code is the core of recall, so every session of 4 minutes or more ends with produce items: one below
 * 10 minutes, FINALE_MAX from 10 minutes. Their time is reserved before reviews and new cards are chosen.
 */
export function finaleTarget(budgetSec: number): number {
  return budgetSec >= 600 ? FINALE_MAX : budgetSec >= 240 ? 1 : 0;
}
export const MAX_SAME_TOPIC_RUN = 2;

export interface StoredItem {
  readonly itemId: string;
  readonly kind: RecallItemKind;
  readonly form: RecallItemForm;
  readonly cardId: string;
}

export interface CardRef {
  readonly id: string;
  readonly topic: string;
  readonly hasPredict: boolean;
}

export interface BuildInput {
  readonly now: Date;
  readonly budgetSec: number;
  /** Candidate cards in deck order, then card order. */
  readonly cards: readonly CardRef[];
  readonly progress: ReadonlyMap<string, CardProgress>;
  /** New cards still allowed today (newCardsPerDay minus cards first seen today). */
  readonly newAllowed: number;
}

export function itemCost(kind: RecallItemKind, form: RecallItemForm): number {
  if (kind === "new") return ITEM_COST_SEC.new;
  if (form === "recognize") return ITEM_COST_SEC.recognize;
  if (form === "produce") return ITEM_COST_SEC.produce;
  return ITEM_COST_SEC.stage1;
}

export function sessionCost(items: readonly StoredItem[]): number {
  return items.reduce((s, i) => s + itemCost(i.kind, i.form), 0);
}

function currentForm(card: CardRef, p: CardProgress | null): RecallItemForm {
  if (!p || p.stage === 0) return "recognize";
  return p.stage === 2 ? "produce" : stage1Form(p, card.hasPredict);
}

const item = (kind: RecallItemKind, form: RecallItemForm, cardId: string): StoredItem => ({ itemId: `${kind}:${form}:${cardId}`, kind, form, cardId });

/** Reorders so that no more than MAX_SAME_TOPIC_RUN items with the same topic follow each other, when possible. */
export function interleaveByTopic<T>(items: readonly T[], topicOf: (x: T) => string): T[] {
  const rest = [...items];
  const out: T[] = [];
  while (rest.length > 0) {
    const last = out.slice(-MAX_SAME_TOPIC_RUN).map(topicOf);
    const blocked = last.length === MAX_SAME_TOPIC_RUN && last.every((t) => t === last[0]) ? last[0] : undefined;
    let idx = rest.findIndex((x) => topicOf(x) !== blocked);
    if (idx < 0) idx = 0; // only that topic left: unavoidable
    out.push(rest.splice(idx, 1)[0] as T);
  }
  return out;
}

export function buildSession(input: BuildInput): StoredItem[] {
  const { now, budgetSec, cards, progress } = input;
  const nowMs = now.getTime();
  const byId = new Map(cards.map((c) => [c.id, c]));
  const seen = cards.filter((c) => progress.has(c.id));
  const prog = (c: CardRef) => progress.get(c.id) ?? null;
  const due = (c: CardRef) => Date.parse(prog(c)?.dueAt ?? "") <= nowMs;

  let used = 0;
  const inSession = new Set<string>();
  const fits = (cost: number, limit: number, count: number) => used + cost <= limit || count === 0;

  const target = finaleTarget(budgetSec);
  const mainLimit = budgetSec - target * ITEM_COST_SEC.produce;

  // 1. Due reviews: most overdue first, chosen within budget, then interleaved by topic.
  const dueCards = seen.filter(due).sort((a, b) => Date.parse(prog(a)!.dueAt) - Date.parse(prog(b)!.dueAt));
  const chosen: StoredItem[] = [];
  for (const c of dueCards) {
    const form = currentForm(c, prog(c));
    const cost = itemCost("review", form);
    if (!fits(cost, mainLimit, chosen.length)) continue;
    used += cost;
    chosen.push(item("review", form, c.id));
    inSession.add(c.id);
  }
  const reviews = interleaveByTopic(chosen, (i) => byId.get(i.cardId)?.topic ?? "");

  // 2. New cards (deck order then card order), each with its stage-1 mix item later.
  const newItems: StoredItem[] = [];
  const newMix: StoredItem[] = [];
  for (const c of cards) {
    if (newItems.length >= input.newAllowed) break;
    if (progress.has(c.id)) continue;
    const cost = ITEM_COST_SEC.new + ITEM_COST_SEC.stage1;
    if (!fits(cost, mainLimit, reviews.length + newItems.length)) break;
    used += cost;
    newItems.push(item("new", "recognize", c.id));
    newMix.push(item("mix", stage1Form(null, c.hasPredict), c.id));
    inSession.add(c.id);
  }

  // Nothing due and nothing new: practice the weakest cards (stage-1 forms, then produce), or nothing.
  if (reviews.length === 0 && newItems.length === 0) return practice(input, seen);

  // 3. Mix: a few recently introduced cards (stage-1 form) before today's new cards' stage-1 items.
  const recentFrom = nowMs - RECENT_DAYS * DAY_MS;
  const recent = seen
    .filter((c) => !inSession.has(c.id) && Date.parse(prog(c)!.firstSeenAt) >= recentFrom)
    .sort((a, b) => Date.parse(prog(b)!.firstSeenAt) - Date.parse(prog(a)!.firstSeenAt));
  const mix: StoredItem[] = [];
  for (const c of recent) {
    if (mix.length >= MIX_RECENT_MAX) break;
    if (used + ITEM_COST_SEC.stage1 > mainLimit) break;
    used += ITEM_COST_SEC.stage1;
    mix.push(item("mix", stage1Form(prog(c), c.hasPredict), c.id));
    inSession.add(c.id);
  }

  // 4. Finale: produce items from stage-2 cards not yet in the session (due first); then today's new cards (they
  // reach stage 2 within the session when recognize and the mix item are right); then reviewed cards at stage 1.
  const finaleCands = [
    ...seen.filter((c) => !inSession.has(c.id) && prog(c)!.stage === 2).sort((a, b) => Date.parse(prog(a)!.dueAt) - Date.parse(prog(b)!.dueAt)),
    ...newItems.map((i) => byId.get(i.cardId)!),
    ...reviews.filter((i) => i.form !== "recognize" && i.form !== "produce").map((i) => byId.get(i.cardId)!),
  ];
  const finale: StoredItem[] = [];
  for (const c of finaleCands) {
    if (finale.length >= target || used + ITEM_COST_SEC.produce > budgetSec) break;
    used += ITEM_COST_SEC.produce;
    finale.push(item("finale", "produce", c.id));
  }

  return [...reviews, ...newItems, ...mix, ...newMix, ...finale];
}

/** Weakest first: lowest stage, most lapses, lowest stability. */
function practice(input: BuildInput, seen: readonly CardRef[]): StoredItem[] {
  const p = (c: CardRef) => input.progress.get(c.id)!;
  const ordered = [...seen].sort(
    (a, b) => p(a).stage - p(b).stage || p(b).memory.lapses - p(a).memory.lapses || p(a).memory.stability - p(b).memory.stability,
  );
  const stage1: StoredItem[] = [];
  const produce: StoredItem[] = [];
  let used = 0;
  for (const c of ordered) {
    const isProduce = p(c).stage === 2;
    const cost = isProduce ? ITEM_COST_SEC.produce : ITEM_COST_SEC.stage1;
    if (used + cost > input.budgetSec && stage1.length + produce.length > 0) continue;
    used += cost;
    if (isProduce) produce.push(item("finale", "produce", c.id));
    else stage1.push(item("mix", stage1Form(p(c), c.hasPredict), c.id));
  }
  return [...interleaveByTopic(stage1, (i) => input.cards.find((c) => c.id === i.cardId)?.topic ?? ""), ...produce];
}
