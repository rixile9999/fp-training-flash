/** Pure session state transitions: evaluation results, skip, summary. No I/O. */
import type { ExerciseId, FamilyId, SkillId, SubmissionId } from "@fp/kernel";
import type { Session, SessionItem, SessionSummary } from "./contract/index.ts";

/** Item as stored: the public item plus bookkeeping the contract does not expose. */
export interface StoredItem extends SessionItem {
  readonly familyId: FamilyId;
  readonly variantKey: string;
  /** True once any submission for this item failed (used for fixedAfterFeedback). */
  readonly hadFailure: boolean;
}

export interface StoredSession extends Omit<Session, "items"> {
  readonly items: readonly StoredItem[];
  readonly summary: SessionSummary | null;
}

export function toPublicSession(s: StoredSession): Session {
  const items: SessionItem[] = s.items.map((i) => ({
    index: i.index,
    kind: i.kind,
    exerciseId: i.exerciseId,
    skillId: i.skillId,
    reason: i.reason,
    expectedSuccess: i.expectedSuccess,
    status: i.status,
    submissionIds: [...i.submissionIds],
  }));
  const base = {
    id: s.id,
    userId: s.userId,
    language: s.language,
    status: s.status,
    targetMinutes: s.targetMinutes,
    startedAt: s.startedAt,
    items,
    currentIndex: s.currentIndex,
  };
  return s.completedAt === undefined ? base : { ...base, completedAt: s.completedAt };
}

/** First pending item after `from`, wrapping around to earlier pending items; null when none is left. */
export function nextPendingIndex(items: readonly StoredItem[], from: number): number | null {
  const after = items.find((i) => i.index > from && i.status === "pending");
  if (after) return after.index;
  const before = items.find((i) => i.index < from && i.status === "pending");
  return before ? before.index : null;
}

function withCurrent(items: StoredItem[], current: number | null): StoredItem[] {
  if (current === null) return items;
  return items.map((i) => (i.index === current && i.status === "pending" ? { ...i, status: "in_progress" } : i));
}

export interface EvaluationInput {
  readonly submissionId: SubmissionId;
  readonly exerciseId: ExerciseId;
  readonly familyId: FamilyId;
  readonly variantKey: string;
  readonly passed: boolean;
}

/**
 * Applies one evaluated submission to an active session. Returns null when no item matches.
 * Matching: exact exercise id (current item first), then same family/variant (another version).
 * A passed current item advances; a failed item stays current so the learner can resubmit.
 */
export function applyEvaluation(session: StoredSession, ev: EvaluationInput): StoredSession | null {
  const byId = session.items.filter((i) => i.exerciseId === ev.exerciseId);
  const byVariant = session.items.filter((i) => i.familyId === ev.familyId && i.variantKey === ev.variantKey);
  const candidates = byId.length > 0 ? byId : byVariant;
  const target = candidates.find((i) => i.index === session.currentIndex) ?? candidates[0];
  if (!target) return null;
  if (target.submissionIds.includes(ev.submissionId)) return session;

  let items = session.items.map((i): StoredItem => {
    if (i.index !== target.index) return i;
    const submissionIds = [...i.submissionIds, ev.submissionId];
    if (i.status === "passed") return { ...i, submissionIds };
    return ev.passed
      ? { ...i, submissionIds, status: "passed" }
      : { ...i, submissionIds, status: "failed", hadFailure: true };
  });

  let currentIndex = session.currentIndex;
  if (ev.passed && target.index === currentIndex) {
    currentIndex = nextPendingIndex(items, target.index);
    items = withCurrent(items, currentIndex);
  }
  return { ...session, items, currentIndex };
}

/** Marks the current item skipped and advances. Null when there is no current item. */
export function skipCurrent(session: StoredSession): StoredSession | null {
  const current = session.currentIndex;
  if (current === null) return null;
  let items = session.items.map((i): StoredItem => (i.index === current ? { ...i, status: "skipped" } : i));
  const next = nextPendingIndex(items, current);
  items = withCurrent(items, next);
  return { ...session, items, currentIndex: next };
}

export function summarize(
  session: StoredSession,
  nextReviews: readonly { readonly skillId: SkillId; readonly dueAt: string }[],
): SessionSummary {
  const practiced: SkillId[] = [];
  for (const i of session.items) {
    if (i.submissionIds.length > 0 && !practiced.includes(i.skillId)) practiced.push(i.skillId);
  }
  return {
    sessionId: session.id,
    passed: session.items.filter((i) => i.status === "passed").length,
    failed: session.items.filter((i) => i.status === "failed").length,
    fixedAfterFeedback: session.items.filter((i) => i.status === "passed" && i.hadFailure).length,
    skillsPracticed: practiced,
    nextReviews: [...nextReviews],
  };
}
