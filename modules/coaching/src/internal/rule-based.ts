/**
 * Deterministic coaching built only from execution evidence. Used when no LLM is configured and
 * whenever the LLM call fails, times out, or returns output that fails validation.
 * All learner-facing text comes from the message catalog (messages.ts) in the requested locale.
 */
import { DEFAULT_LOCALE, type Locale, type SubmissionId } from "@fp/kernel";
import type { ExerciseDetail, RubricItem } from "@fp/content/contract";
import type { Evaluation, HelpUsed, TestResult } from "@fp/grading/contract";
import type { ErrorTagStat } from "@fp/learner/contract";
import type { CoachingFeedback, FeedbackEvidence, RubricNote } from "../contract/index.ts";
import { msg } from "./messages.ts";

export const RULE_BASED_VERSION = "rules-v1";
export const RULE_BASED_MODEL = "rule-based";

export interface RuleFeedbackInput {
  readonly submissionId: SubmissionId;
  readonly evaluation: Evaluation;
  readonly rubric: readonly RubricItem[];
  readonly errorTagHistory: readonly ErrorTagStat[];
  readonly createdAt: string;
  /** Default "ko". */
  readonly locale?: Locale;
}

export function isFailing(t: TestResult): boolean {
  return t.status !== "passed";
}

export function ruleBasedFeedback(input: RuleFeedbackInput): CoachingFeedback {
  const { evaluation } = input;
  const locale = input.locale ?? DEFAULT_LOCALE;
  const parts = describeOutcome(input, locale);
  const rubricNotes = rubricNotesFrom(evaluation, input.rubric, locale);
  return {
    submissionId: input.submissionId,
    summary: parts.summary,
    evidence: parts.evidence,
    priorities: parts.priorities.slice(0, 2),
    nextAction: parts.nextAction,
    rubricNotes: evaluation.outcome === "system_error" ? [] : rubricNotes,
    source: "rule_based",
    promptVersion: RULE_BASED_VERSION,
    createdAt: input.createdAt,
  };
}

interface Parts {
  summary: string;
  evidence: FeedbackEvidence[];
  priorities: string[];
  nextAction: string;
}

function describeOutcome(input: RuleFeedbackInput, l: Locale): Parts {
  const ev = input.evaluation;
  switch (ev.outcome) {
    case "compile_error": {
      const diag = ev.compileDiagnostics.find((d) => d.severity === "error") ?? ev.compileDiagnostics[0];
      const where = diag?.line !== undefined ? msg(l, "fb.where_line", { line: diag.line }) : msg(l, "fb.where_code");
      return {
        summary: msg(l, "fb.compile.summary"),
        evidence: diag
          ? [withLine({ text: msg(l, "fb.compile.evidence", { message: diag.message }) }, diag.line)]
          : [{ text: msg(l, "fb.compile.no_message") }],
        priorities: [msg(l, "fb.compile.priority", { where })],
        nextAction: msg(l, "fb.compile.next", { where }),
      };
    }
    case "failed_tests": {
      const failing = ev.tests.filter(isFailing);
      const first = failing[0];
      if (!first) {
        return {
          summary: msg(l, "fb.unmet.summary"),
          evidence: unmetRequirements(ev, l),
          priorities: [msg(l, "fb.unmet.priority")],
          nextAction: msg(l, "fb.unmet.next"),
        };
      }
      const priorities = [msg(l, "fb.failed.priority", { name: first.name })];
      const recurring = first.errorTag ? recurringTag(first.errorTag, input.errorTagHistory) : undefined;
      if (recurring) priorities.push(msg(l, "fb.failed.recurring", { tag: recurring.tag, count: recurring.count }));
      return {
        summary: msg(l, "fb.failed.summary", { total: ev.tests.length, failed: failing.length }),
        evidence: failing.slice(0, 3).map((t) => ({
          text:
            msg(l, "fb.failed.evidence", { name: t.name, status: statusText(t, l) }) +
            (t.message ? msg(l, "fb.failed.evidence_message", { message: t.message }) : "") +
            (t.errorTag ? msg(l, "fb.failed.evidence_tag", { tag: t.errorTag }) : ""),
          testId: t.id,
        })),
        priorities,
        nextAction: msg(l, "fb.failed.next", { name: first.name }),
      };
    }
    case "too_slow": {
      const ratio = ev.performance?.ratio;
      return {
        summary: msg(l, "fb.slow.summary"),
        evidence: [
          { text: ratio !== undefined ? msg(l, "fb.slow.ratio", { ratio: ratio.toFixed(1) }) : msg(l, "fb.slow.no_ratio") },
        ],
        priorities: [msg(l, "fb.slow.priority")],
        nextAction: msg(l, "fb.slow.next"),
      };
    }
    case "timeout":
      return {
        summary: msg(l, "fb.timeout.summary"),
        evidence: [{ text: msg(l, "fb.timeout.evidence") }],
        priorities: [msg(l, "fb.timeout.priority")],
        nextAction: msg(l, "fb.timeout.next"),
      };
    case "rejected": {
      const reason = ev.rejectionReasons?.[0] ?? msg(l, "fb.rejected.default_reason");
      return {
        summary: msg(l, "fb.rejected.summary"),
        evidence: [{ text: reason }],
        priorities: [msg(l, "fb.rejected.priority")],
        nextAction: msg(l, "fb.rejected.next"),
      };
    }
    case "system_error":
      return {
        summary: msg(l, "fb.system.summary"),
        evidence: [],
        priorities: [msg(l, "fb.system.priority")],
        nextAction: msg(l, "fb.system.next"),
      };
    case "passed": {
      const flagged = ev.rubricChecks.find((c) => c.status === "flagged");
      const rubricItem = flagged
        ? input.rubric.find((r) => r.id === flagged.rubricId)
        : input.rubric[0];
      const suggestion = flagged
        ? `${flagged.rubricId}: ${flagged.message ?? rubricItem?.title ?? msg(l, "fb.passed.flagged_default")}`
        : rubricItem
          ? msg(l, "fb.passed.rubric_suggestion", { id: rubricItem.id, title: rubricItem.title })
          : msg(l, "fb.passed.generic_suggestion");
      return {
        summary: msg(l, "fb.passed.summary"),
        evidence: [{ text: msg(l, "fb.passed.evidence", { count: ev.tests.length }) }],
        priorities: [suggestion],
        nextAction: rubricItem
          ? msg(l, "fb.passed.next_rubric", { id: rubricItem.id, title: rubricItem.title })
          : msg(l, "fb.passed.next_generic"),
      };
    }
  }
}

function withLine(e: { text: string }, line: number | undefined): FeedbackEvidence {
  return line === undefined ? e : { ...e, line };
}

function statusText(t: TestResult, l: Locale): string {
  if (t.status === "timeout") return msg(l, "fb.status.timeout");
  if (t.status === "error") return msg(l, "fb.status.error");
  return msg(l, "fb.status.failed");
}

function unmetRequirements(ev: Evaluation, l: Locale): FeedbackEvidence[] {
  const unmet = ev.requirements.filter((r) => r.status === "unmet");
  if (unmet.length === 0) return [{ text: msg(l, "fb.unmet.none") }];
  return unmet.slice(0, 3).map((r) => ({ text: msg(l, "fb.unmet.item", { description: r.description }) }));
}

function recurringTag(tag: string, history: readonly ErrorTagStat[]): ErrorTagStat | undefined {
  const stat = history.find((s) => s.tag === tag);
  return stat && stat.count >= 2 ? stat : undefined;
}

/** Rubric notes from grading's deterministic checks, restricted to the exercise's rubric ids. */
export function rubricNotesFrom(ev: Evaluation, rubric: readonly RubricItem[], locale: Locale = DEFAULT_LOCALE): RubricNote[] {
  const ids = new Set(rubric.map((r) => r.id));
  return ev.rubricChecks
    .filter((c) => ids.has(c.rubricId))
    .map((c) => {
      const title = rubric.find((r) => r.id === c.rubricId)?.title ?? c.rubricId;
      return c.status === "flagged"
        ? { rubricId: c.rubricId, verdict: "suggestion" as const, text: c.message ?? msg(locale, "fb.rubric.flagged", { title }) }
        : { rubricId: c.rubricId, verdict: "good" as const, text: msg(locale, "fb.rubric.good", { title }) };
    });
}

export interface RuleChatInput {
  readonly exercise: ExerciseDetail;
  readonly helpUsed: HelpUsed;
  readonly evaluation?: Evaluation;
  readonly conceptNoteTitles: readonly string[];
  /** Default "ko". */
  readonly locale?: Locale;
}

/** Short guidance when no LLM is available: points to evidence, the next hint, and notes. */
export function ruleBasedChatReply(input: RuleChatInput): string {
  const l = input.locale ?? DEFAULT_LOCALE;
  const lines: string[] = [msg(l, "chat.intro")];
  const ev = input.evaluation;
  if (ev) {
    if (ev.outcome === "compile_error") {
      const d = ev.compileDiagnostics.find((x) => x.severity === "error") ?? ev.compileDiagnostics[0];
      if (d) {
        lines.push(
          d.line !== undefined
            ? msg(l, "chat.compile_at_line", { line: d.line, message: d.message })
            : msg(l, "chat.compile", { message: d.message }),
        );
      }
    } else {
      const failing = ev.tests.find(isFailing);
      if (failing) {
        const detail = failing.message ? msg(l, "chat.failing_detail", { message: failing.message }) : "";
        lines.push(msg(l, "chat.failing", { name: failing.name, status: statusText(failing, l), detail }));
      } else if (ev.outcome === "passed") {
        lines.push(msg(l, "chat.passed"));
      }
    }
  }
  const available = input.exercise.hints.map((h) => h.level).filter((lv) => lv > input.helpUsed.maxHintLevel);
  const next = available.length > 0 ? Math.min(...available) : undefined;
  if (next !== undefined) lines.push(msg(l, "chat.next_hint", { level: next }));
  const note = input.conceptNoteTitles[0];
  if (note) lines.push(msg(l, "chat.note", { title: note }));
  lines.push(msg(l, "chat.question"));
  return lines.join("\n");
}
