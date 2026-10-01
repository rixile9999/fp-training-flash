/**
 * Pure quiz logic: deterministic sampling of checkpoint / placement items, difficulty, scoring and placement bands.
 * No I/O; randomness comes from a seeded generator so the same seed always yields the same quiz.
 */
import type { PlacementBand } from "./contract/index.ts";

export const CHECKPOINT_PASS_THRESHOLD = 0.8;
export const CHECKPOINT_MIN_ITEMS = 6;
export const CHECKPOINT_MAX_ITEMS = 10;
/** Items per level in placement: one per unit, clamped to this range. */
export const PLACEMENT_MIN_PER_LEVEL = 3;
export const PLACEMENT_MAX_PER_LEVEL = 4;
export const PLACEMENT_ADVANCED_SCORE = 0.8;
export const PLACEMENT_ADVANCED_HIGH_LEVEL = 2 / 3;
export const PLACEMENT_INTERMEDIATE_SCORE = 0.5;

/** One lesson exercise usable as a quiz item. */
export interface Candidate {
  readonly unitId: string;
  readonly lessonId: string;
  readonly exerciseId: string;
  readonly type: "choice" | "predict";
  /** Unit level 1-4. */
  readonly level: number;
  readonly skillId: string;
  /** Position of the lesson in its unit and of the exercise in its lesson (stable ordering). */
  readonly lessonIndex: number;
  readonly exerciseIndex: number;
}

export interface UnitCandidates {
  readonly unitId: string;
  readonly order: number;
  readonly level: number;
  readonly candidates: readonly Candidate[];
}

/** FNV-1a 32-bit. */
function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** mulberry32 seeded by a string: returns floats in [0, 1). */
export function seededRandom(seed: string): () => number {
  let a = hash32(seed);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Takes one item from `pool` (mutated), preferring the type picked less often so far. */
function takeBalanced(pool: Candidate[], counts: { choice: number; predict: number }): Candidate | undefined {
  if (pool.length === 0) return undefined;
  const want = counts.choice <= counts.predict ? "choice" : "predict";
  const idx = Math.max(0, pool.findIndex((c) => c.type === want));
  const [picked] = pool.splice(idx, 1);
  if (picked) counts[picked.type]++;
  return picked;
}

export function checkpointSize(available: number, lessonCount: number): number {
  return Math.min(available, clamp(lessonCount * 2, CHECKPOINT_MIN_ITEMS, CHECKPOINT_MAX_ITEMS));
}

/**
 * Checkpoint items from one unit's exercises: round-robin over the lessons in a shuffled order (so items come from
 * different lessons first), balancing choice/predict. Returned in lesson order.
 */
export function sampleCheckpoint(candidates: readonly Candidate[], rand: () => number): Candidate[] {
  const lessonIds = [...new Set(candidates.map((c) => c.lessonId))];
  const n = checkpointSize(candidates.length, lessonIds.length);
  const pools = new Map(lessonIds.map((l) => [l, shuffle(candidates.filter((c) => c.lessonId === l), rand)]));
  const order = shuffle(lessonIds, rand);
  const counts = { choice: 0, predict: 0 };
  const picked: Candidate[] = [];
  while (picked.length < n) {
    let progressed = false;
    for (const l of order) {
      if (picked.length >= n) break;
      const c = takeBalanced(pools.get(l) ?? [], counts);
      if (c) {
        picked.push(c);
        progressed = true;
      }
    }
    if (!progressed) break;
  }
  return picked.sort((a, b) => a.lessonIndex - b.lessonIndex || a.exerciseIndex - b.exerciseIndex);
}

/**
 * Placement ladder: levels ascending; per level clamp(#units with items, 3, 4) items, round-robin over that level's
 * units (by order) so each unit gets one item before any gets a second; choice/predict balanced across the quiz.
 */
export function samplePlacement(units: readonly UnitCandidates[], rand: () => number): Candidate[] {
  const withItems = units.filter((u) => u.candidates.length > 0);
  const levels = [...new Set(withItems.map((u) => u.level))].sort((a, b) => a - b);
  const counts = { choice: 0, predict: 0 };
  const out: Candidate[] = [];
  for (const level of levels) {
    const atLevel = withItems.filter((u) => u.level === level).sort((a, b) => a.order - b.order);
    const want = clamp(atLevel.length, PLACEMENT_MIN_PER_LEVEL, PLACEMENT_MAX_PER_LEVEL);
    const pools = atLevel.map((u) => shuffle(u.candidates, rand));
    const picked: Candidate[] = [];
    while (picked.length < want) {
      let progressed = false;
      for (const pool of pools) {
        if (picked.length >= want) break;
        const c = takeBalanced(pool, counts);
        if (c) {
          picked.push(c);
          progressed = true;
        }
      }
      if (!progressed) break;
    }
    const unitOrder = new Map(atLevel.map((u, i) => [u.unitId, i]));
    out.push(...picked.sort((a, b) => (unitOrder.get(a.unitId) ?? 0) - (unitOrder.get(b.unitId) ?? 0)));
  }
  return out;
}

/** Observation difficulty: L1 900, L2 1000, L3 1100, L4 1200; predict items +50. */
export function itemDifficulty(level: number, type: "choice" | "predict"): number {
  return 800 + clamp(Math.round(level), 1, 4) * 100 + (type === "predict" ? 50 : 0);
}

export function checkpointPassed(score: number, total: number): boolean {
  return total > 0 && score / total + 1e-9 >= CHECKPOINT_PASS_THRESHOLD;
}

export interface GradedLevelItem {
  readonly unitId: string;
  readonly level: number;
  readonly correct: boolean;
}

/**
 * advanced: >= 80% overall and >= 2/3 of the L3-L4 items correct (vacuously true without L3-L4 items);
 * intermediate: >= 50%; otherwise beginner.
 */
export function placementBand(items: readonly GradedLevelItem[]): PlacementBand {
  const total = items.length;
  if (total === 0) return "beginner";
  const score = items.filter((i) => i.correct).length / total;
  const high = items.filter((i) => i.level >= 3);
  const highOk = high.length === 0 || high.filter((i) => i.correct).length / high.length + 1e-9 >= PLACEMENT_ADVANCED_HIGH_LEVEL;
  if (score + 1e-9 >= PLACEMENT_ADVANCED_SCORE && highOk) return "advanced";
  if (score + 1e-9 >= PLACEMENT_INTERMEDIATE_SCORE) return "intermediate";
  return "beginner";
}

/**
 * Units whose checkpoints the placement implies: advanced -> every unit of levels 1-3; intermediate -> level 1-2 units
 * with more than half of their placement items correct; beginner -> none. Returned in `units` order.
 */
export function placementUnitsPassed(
  band: PlacementBand,
  units: readonly { readonly id: string; readonly level: number }[],
  items: readonly GradedLevelItem[],
): string[] {
  if (band === "beginner") return [];
  if (band === "advanced") return units.filter((u) => u.level <= 3).map((u) => u.id);
  return units
    .filter((u) => u.level <= 2)
    .filter((u) => {
      const mine = items.filter((i) => i.unitId === u.id);
      return mine.length > 0 && mine.filter((i) => i.correct).length * 2 > mine.length;
    })
    .map((u) => u.id);
}
