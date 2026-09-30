/**
 * Exercise selection: focus skill, review/focus/variation/challenge items and the minutes budget.
 * Reads catalog + learner through their contracts; history comes from our own store.
 */
import { appError, err, ok } from "@fp/kernel";
import type { AppError, ExerciseId, FamilyId, Language, Result, SkillId, UserId } from "@fp/kernel";
import type { ContentCatalog, ExerciseSummary, Skill } from "@fp/content/contract";
import type { LearnerModel, SkillEstimate } from "@fp/learner/contract";
import type { SessionItemKind } from "./contract/index.ts";
import { variantRef, type History } from "./store.ts";

export const TARGET_SUCCESS = 0.8;
export const BAND_MIN = 0.6;
export const BAND_MAX = 0.9;
/** Entry-level difficulty used for skills without rating evidence. */
export const ENTRY_DIFFICULTY = 1200;
/** A prerequisite is met at this rating (or with any independent success). */
export const PREREQUISITE_RATING = 1250;
/** Review items avoid exercises submitted within this many days. */
export const REVIEW_RECENT_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface PlannerDeps {
  readonly catalog: ContentCatalog;
  readonly learner: LearnerModel;
}

export interface PlannedItem {
  readonly kind: SessionItemKind;
  readonly exercise: ExerciseSummary;
  readonly reason: string;
  readonly expectedSuccess: number;
}

export interface PlanContext {
  readonly userId: UserId;
  readonly language: Language;
  readonly now: Date;
  /** Skills that have at least one drill in this language, sorted by order. */
  readonly skills: readonly Skill[];
  readonly skillById: ReadonlyMap<SkillId, Skill>;
  readonly drills: readonly ExerciseSummary[];
  readonly challenges: readonly ExerciseSummary[];
  readonly estimates: ReadonlyMap<SkillId, SkillEstimate>;
  readonly history: History;
  readonly learner: LearnerModel;
  readonly esCache: Map<string, number>;
}

export async function loadPlanContext(
  deps: PlannerDeps,
  history: History,
  userId: UserId,
  language: Language,
  now: Date,
): Promise<PlanContext> {
  const [skillList, exercises, profile] = await Promise.all([
    deps.catalog.listSkills(),
    deps.catalog.listExercises({ language }),
    deps.learner.getProfile(userId, language),
  ]);
  const drills = exercises.filter((e) => e.format === "drill");
  const challenges = exercises.filter((e) => e.format === "challenge");
  const skillById = new Map<SkillId, Skill>(skillList.map((s) => [s.id, s]));
  // Exercises may reference skills the catalog does not list; treat them as unordered, prerequisite-free.
  for (const e of exercises) {
    if (!skillById.has(e.primarySkill)) {
      skillById.set(e.primarySkill, {
        id: e.primarySkill,
        name: e.primarySkill,
        description: "",
        track: "core",
        prerequisites: [],
        order: Number.MAX_SAFE_INTEGER,
      });
    }
  }
  const drillSkills = new Set(drills.map((e) => e.primarySkill));
  const skills = [...skillById.values()]
    .filter((s) => drillSkills.has(s.id))
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const estimates = new Map<SkillId, SkillEstimate>(profile.estimates.map((e) => [e.skillId, e]));
  return {
    userId, language, now, skills, skillById, drills, challenges, estimates, history,
    learner: deps.learner, esCache: new Map(),
  };
}

// ---------- ranking helpers ----------

async function expected(ctx: PlanContext, ex: ExerciseSummary): Promise<number> {
  const key = `${ex.primarySkill}|${ex.difficulty}`;
  const hit = ctx.esCache.get(key);
  if (hit !== undefined) return hit;
  const es = await ctx.learner.expectedSuccess(ctx.userId, ex.primarySkill, ctx.language, ex.difficulty);
  ctx.esCache.set(key, es);
  return es;
}

function hasRatingEvidence(ctx: PlanContext, skillId: SkillId): boolean {
  const est = ctx.estimates.get(skillId);
  return est !== undefined && est.ratedObservations > 0;
}

/** Lower is better. Unrated skills aim at entry difficulty; rated ones at 0.8 inside the 0.6..0.9 band. */
function difficultyKey(ctx: PlanContext, ex: ExerciseSummary, es: number): number[] {
  if (!hasRatingEvidence(ctx, ex.primarySkill)) return [0, Math.abs(ex.difficulty - ENTRY_DIFFICULTY) / 1000];
  return [es >= BAND_MIN && es <= BAND_MAX ? 0 : 1, Math.abs(es - TARGET_SUCCESS)];
}

function compareKeys(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

interface Pick {
  readonly exercise: ExerciseSummary;
  readonly es: number;
}

/** Best candidate by `prefix(ex)` then difficulty fit then id (deterministic). */
async function best(
  ctx: PlanContext,
  pool: readonly ExerciseSummary[],
  prefix: (ex: ExerciseSummary) => number[],
): Promise<Pick | null> {
  let top: { pick: Pick; key: number[] } | null = null;
  for (const ex of pool) {
    const es = await expected(ctx, ex);
    const key = [...prefix(ex), ...difficultyKey(ctx, ex, es)];
    const c = top === null ? -1 : compareKeys(key, top.key) || ex.id.localeCompare(top.pick.exercise.id);
    if (c < 0) top = { pick: { exercise: ex, es }, key };
  }
  return top?.pick ?? null;
}

const flag = (b: boolean): number => (b ? 1 : 0);
const isPassed = (ctx: PlanContext, ex: ExerciseSummary): boolean =>
  ctx.history.variants.get(variantRef(ex.familyId, ex.variantKey))?.passed === true;
const isRecentFamily = (ctx: PlanContext, ex: ExerciseSummary): boolean => ctx.history.recentFamilies.has(ex.familyId);
const sharesTag = (a: readonly string[], b: readonly string[]): boolean => a.some((t) => b.includes(t));
const skillName = (ctx: PlanContext, id: SkillId): string => ctx.skillById.get(id)?.name ?? id;
const pct = (es: number): string => `${Math.round(es * 100)}%`;

// ---------- focus ----------

function prerequisitesMet(ctx: PlanContext, skill: Skill): boolean {
  return skill.prerequisites.every((p) => {
    const est = ctx.estimates.get(p);
    return est !== undefined && (est.lastIndependentSuccessAt !== undefined || est.rating >= PREREQUISITE_RATING);
  });
}

/** Eligible skills (with drills), weakest first. The lowest-order core skill is always eligible. */
export function eligibleSkills(ctx: PlanContext): Skill[] {
  const entry = ctx.skills.find((s) => s.track === "core") ?? ctx.skills[0];
  const rating = (s: Skill): number => ctx.estimates.get(s.id)?.rating ?? ENTRY_DIFFICULTY;
  return ctx.skills
    .filter((s) => s.id === entry?.id || prerequisitesMet(ctx, s))
    .sort((a, b) => rating(a) - rating(b) || a.order - b.order || a.id.localeCompare(b.id));
}

function focusPool(ctx: PlanContext, skillId: SkillId, used: ReadonlySet<ExerciseId>, allowPassed: boolean) {
  return ctx.drills.filter(
    (e) => e.primarySkill === skillId && !used.has(e.id) && (allowPassed || !isPassed(ctx, e)),
  );
}

const focusPrefix = (ctx: PlanContext) => (e: ExerciseSummary) => [flag(isPassed(ctx, e)), flag(isRecentFamily(ctx, e))];

function focusReason(ctx: PlanContext, skillId: SkillId, es: number, forced: boolean): string {
  const name = skillName(ctx, skillId);
  if (forced) return `선택한 기술 집중 연습: ${name} (예상 성공률 ${pct(es)})`;
  if (!hasRatingEvidence(ctx, skillId)) return `학습 시작: ${name} (입문 난이도)`;
  return `집중 연습: ${name} — 지금 가장 약한 기술 (예상 성공률 ${pct(es)})`;
}

export async function chooseFocus(
  ctx: PlanContext,
  forcedSkill: SkillId | undefined,
  used: ReadonlySet<ExerciseId> = new Set(),
): Promise<Result<PlannedItem, AppError>> {
  if (ctx.drills.length === 0) return err(appError("not_found", "아직 풀 수 있는 연습 문제가 없습니다."));
  let pick: Pick | null = null;
  if (forcedSkill !== undefined) {
    pick = await best(ctx, focusPool(ctx, forcedSkill, used, true), focusPrefix(ctx));
    if (!pick) {
      return err(appError("not_found", `선택한 기술(${skillName(ctx, forcedSkill)})에 맞는 연습 문제가 없습니다.`, {
        skillId: forcedSkill,
      }));
    }
  } else {
    const order = eligibleSkills(ctx);
    // Prefer the weakest skill that still has unpassed exercises; otherwise allow repeats.
    for (const allowPassed of [false, true]) {
      for (const s of order) {
        pick = await best(ctx, focusPool(ctx, s.id, used, allowPassed), focusPrefix(ctx));
        if (pick) break;
      }
      if (pick) break;
    }
    if (!pick) return err(appError("not_found", "지금 추천할 수 있는 연습 문제가 없습니다."));
  }
  const skillId = pick.exercise.primarySkill;
  return ok({
    kind: "focus",
    exercise: pick.exercise,
    expectedSuccess: pick.es,
    reason: focusReason(ctx, skillId, pick.es, forcedSkill !== undefined),
  });
}

// ---------- session ----------

export interface PlanRequest {
  readonly targetMinutes: number;
  readonly focusSkill?: SkillId;
  readonly includeChallenge?: boolean;
}

async function chooseReviews(
  ctx: PlanContext,
  skillIds: readonly SkillId[],
  used: Set<ExerciseId>,
  usedFamilies: Set<FamilyId>,
): Promise<PlannedItem[]> {
  const out: PlannedItem[] = [];
  const recentCutoff = ctx.now.getTime() - REVIEW_RECENT_DAYS * DAY_MS;
  for (const skillId of skillIds) {
    let lastTags: readonly string[] = [];
    let lastAt = -Infinity;
    for (const h of ctx.history.variants.values()) {
      if (h.skillId === skillId && h.lastAt > lastAt) {
        lastAt = h.lastAt;
        lastTags = h.contextTags;
      }
    }
    const recentlySubmitted = (e: ExerciseSummary): boolean =>
      (ctx.history.variants.get(variantRef(e.familyId, e.variantKey))?.lastAt ?? -Infinity) >= recentCutoff;
    const pool = ctx.drills.filter((e) => e.primarySkill === skillId && !used.has(e.id) && !usedFamilies.has(e.familyId));
    const pick = await best(ctx, pool, (e) => [
      flag(recentlySubmitted(e)),
      flag(sharesTag(e.contextTags, lastTags)),
      flag(isPassed(ctx, e)),
    ]);
    if (!pick) continue;
    used.add(pick.exercise.id);
    usedFamilies.add(pick.exercise.familyId);
    out.push({ kind: "review", exercise: pick.exercise, expectedSuccess: pick.es, reason: `복습 예정: ${skillName(ctx, skillId)}` });
  }
  return out;
}

async function chooseVariation(
  ctx: PlanContext,
  focus: ExerciseSummary,
  used: ReadonlySet<ExerciseId>,
  usedFamilies: ReadonlySet<FamilyId>,
): Promise<PlannedItem | null> {
  const sameFamily = ctx.drills.filter(
    (e) => e.familyId === focus.familyId && e.variantKey !== focus.variantKey && !used.has(e.id),
  );
  const variant = await best(ctx, sameFamily, (e) => [flag(isPassed(ctx, e))]);
  if (variant) {
    return {
      kind: "variation",
      exercise: variant.exercise,
      expectedSuccess: variant.es,
      reason: `변형 연습: 같은 문제의 다른 변형 — ${variant.exercise.title}`,
    };
  }
  const differentContext = (e: ExerciseSummary): boolean =>
    !sharesTag(e.contextTags, focus.contextTags) && !(e.contextTags.length === 0 && focus.contextTags.length === 0);
  const sameSkill = ctx.drills.filter(
    (e) =>
      e.primarySkill === focus.primarySkill &&
      e.familyId !== focus.familyId &&
      !usedFamilies.has(e.familyId) &&
      !used.has(e.id) &&
      differentContext(e),
  );
  const other = await best(ctx, sameSkill, (e) => [flag(isPassed(ctx, e)), flag(isRecentFamily(ctx, e))]);
  if (!other) return null;
  return {
    kind: "variation",
    exercise: other.exercise,
    expectedSuccess: other.es,
    reason: `변형 연습: 다른 맥락에서 ${skillName(ctx, focus.primarySkill)} 다시 적용`,
  };
}

async function chooseChallenge(
  ctx: PlanContext,
  focusSkill: SkillId | undefined,
  used: ReadonlySet<ExerciseId>,
): Promise<PlannedItem | null> {
  const allowed = new Set<SkillId>(eligibleSkills(ctx).map((s) => s.id));
  if (focusSkill !== undefined) allowed.add(focusSkill);
  const pool = ctx.challenges.filter((e) => allowed.has(e.primarySkill) && !used.has(e.id));
  const pick = await best(ctx, pool, (e) => [flag(e.primarySkill !== focusSkill), flag(isPassed(ctx, e))]);
  if (!pick) return null;
  return {
    kind: "challenge",
    exercise: pick.exercise,
    expectedSuccess: pick.es,
    reason: `도전 과제 (선택): ${skillName(ctx, pick.exercise.primarySkill)}`,
  };
}

/**
 * Ordered items: reviews -> focus -> variation (-> challenge). The focus item (or the first review when
 * there is no focus) is always included; the rest are added while estimatedMinutes fit targetMinutes.
 * Challenges are optional and outside the budget.
 */
export async function planSession(
  ctx: PlanContext,
  req: PlanRequest,
  dueSkills: readonly SkillId[],
): Promise<Result<PlannedItem[], AppError>> {
  const used = new Set<ExerciseId>();
  const usedFamilies = new Set<FamilyId>();

  const focusResult = await chooseFocus(ctx, req.focusSkill);
  if (!focusResult.ok && req.focusSkill !== undefined) return focusResult;
  const focus = focusResult.ok ? focusResult.value : null;
  if (focus) {
    used.add(focus.exercise.id);
    usedFamilies.add(focus.exercise.familyId);
  }

  const reviewSkills = dueSkills.filter((s) => s !== focus?.exercise.primarySkill);
  const reviews = await chooseReviews(ctx, reviewSkills, used, usedFamilies);
  const variation = focus ? await chooseVariation(ctx, focus.exercise, used, usedFamilies) : null;

  let remaining = req.targetMinutes - (focus?.exercise.estimatedMinutes ?? 0);
  const chosenReviews: PlannedItem[] = [];
  for (const r of reviews) {
    const mandatory = focus === null && chosenReviews.length === 0;
    if (mandatory || r.exercise.estimatedMinutes <= remaining) {
      chosenReviews.push(r);
      remaining -= r.exercise.estimatedMinutes;
    }
  }
  const items: PlannedItem[] = [...chosenReviews];
  if (focus) items.push(focus);
  if (variation && variation.exercise.estimatedMinutes <= remaining) items.push(variation);
  if (items.length === 0) return err(appError("not_found", "아직 풀 수 있는 연습 문제가 없습니다."));

  if (req.includeChallenge) {
    const challenge = await chooseChallenge(ctx, focus?.exercise.primarySkill, new Set(items.map((i) => i.exercise.id)));
    if (challenge) items.push(challenge);
  }
  return ok(items);
}
