import type {
  CoachingFeedback,
  Explanation,
  Hint,
  ProgressView,
  RatingChange,
  Session,
  SubmissionView,
  TrialRun,
} from "@fp/api-contract";
import { DEFAULT_LOCALE, translator } from "./messages.ts";
import type { Locale, MessageId, Translate } from "./messages.ts";

// Every renderer takes the display locale (default "ko"). Server-provided text (test names, messages,
// feedback, hints, skill names) already arrives in the account's locale and is printed as is.

type Outcome = TrialRun["outcome"];
type TestResult = TrialRun["tests"][number];
type Diagnostic = TrialRun["compileDiagnostics"][number];
type Evaluation = NonNullable<SubmissionView["submission"]["evaluation"]>;

const OUTCOME: Record<Outcome, MessageId> = {
  passed: "outcomePassed",
  failed_tests: "outcomeFailedTests",
  too_slow: "outcomeTooSlow",
  compile_error: "outcomeCompileError",
  timeout: "outcomeTimeout",
  rejected: "outcomeRejected",
  system_error: "outcomeSystemError",
};
const TEST_MARK: Record<TestResult["status"], string> = { passed: "✓", failed: "✗", error: "!", timeout: "⏱" };
const ITEM_KIND: Record<Session["items"][number]["kind"], MessageId> = {
  review: "kindReview",
  focus: "kindFocus",
  variation: "kindVariation",
  challenge: "kindChallenge",
};
const ITEM_STATUS: Record<Session["items"][number]["status"], MessageId> = {
  pending: "statusPending",
  in_progress: "statusInProgress",
  passed: "statusPassed",
  failed: "statusFailed",
  skipped: "statusSkipped",
};

export function outcomeLabel(outcome: Outcome, locale: Locale = DEFAULT_LOCALE): string {
  return translator(locale)(OUTCOME[outcome]);
}

function indent(s: string, pad = "    "): string {
  return s
    .split("\n")
    .map((l) => pad + l)
    .join("\n");
}

function diagnostics(t: Translate, ds: readonly Diagnostic[]): string {
  return ds
    .map((d) => {
      const loc = d.file ? `${d.file}${d.line !== undefined ? `:${d.line}` : ""}${d.column !== undefined ? `:${d.column}` : ""}: ` : "";
      return `  ${t(d.severity === "error" ? "diagError" : "diagWarning")} ${loc}${d.message}`;
    })
    .join("\n");
}

function tests(t: Translate, ts: readonly TestResult[]): string {
  return ts
    .map((r) => {
      let line = `  ${TEST_MARK[r.status]} ${r.name}${r.visibility === "hidden" ? t("hiddenSuffix") : ""}`;
      if (r.status !== "passed" && r.message) line += `\n${indent(r.message)}`;
      if (r.status !== "passed" && r.code) line += `\n${indent(r.code)}`;
      return line;
    })
    .join("\n");
}

function common(
  t: Translate,
  r: {
    readonly outcome: Outcome;
    readonly compileDiagnostics: readonly Diagnostic[];
    readonly tests: readonly TestResult[];
    readonly rejectionReasons?: readonly string[] | undefined;
  },
): string[] {
  const passed = r.tests.filter((x) => x.status === "passed").length;
  const count = r.tests.length > 0 ? t("passedCount", { passed, total: r.tests.length }) : "";
  const out = [t("resultLine", { outcome: t(OUTCOME[r.outcome]) }) + count];
  if (r.rejectionReasons?.length) out.push(`${t("rejectionReasons")}\n${r.rejectionReasons.map((x) => `  - ${x}`).join("\n")}`);
  if (r.compileDiagnostics.length > 0) out.push(`${t("compileDiagnostics")}\n${diagnostics(t, r.compileDiagnostics)}`);
  if (r.tests.length > 0) out.push(`${t("testsHeading")}\n${tests(t, r.tests)}`);
  return out;
}

export function formatTrialRun(run: TrialRun, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  const out = [t("trialRunHeading"), ...common(t, run)];
  if (run.outcome === "passed") out.push(t("trialRunPassed"));
  return out.join("\n");
}

export function formatRatingChange(rc: RatingChange | null, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  if (!rc) return t("ratingNone");
  const delta = Math.round(rc.after - rc.before);
  return t("ratingChange", {
    skill: rc.skillId,
    before: Math.round(rc.before),
    after: Math.round(rc.after),
    delta: `${delta > 0 ? "+" : ""}${delta}`,
    provisional: rc.provisional ? t("provisionalSuffix") : "",
  });
}

function evaluation(t: Translate, ev: Evaluation): string[] {
  const out = common(t, ev);
  if (ev.requirements.length > 0) {
    const label = { met: "✓", unmet: "✗", undetermined: "?" } as const;
    out.push(`${t("requirementsHeading")}\n${ev.requirements.map((r) => `  ${label[r.status]} ${r.id} ${r.description}`).join("\n")}`);
  }
  if (ev.performance && ev.performance.verdict !== "not_measured") {
    const ratio = ev.performance.ratio !== undefined ? t("performanceRatio", { ratio: ev.performance.ratio.toFixed(2) }) : "";
    out.push(t("performanceLine", { verdict: t(ev.performance.verdict === "ok" ? "performanceOk" : "performanceSlow"), ratio }));
  }
  const flagged = ev.rubricChecks.filter((c) => c.status === "flagged");
  if (flagged.length > 0) out.push(`${t("rubricFlagged")}\n${flagged.map((c) => `  - ${c.rubricId}${c.message ? `: ${c.message}` : ""}`).join("\n")}`);
  return out;
}

export function formatSubmission(view: SubmissionView, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  const s = view.submission;
  const out = [t("submissionHeading", { id: s.id, attempt: s.attemptNo })];
  if (s.evaluation) out.push(...evaluation(t, s.evaluation));
  else out.push(t("stillGrading"));
  out.push(formatRatingChange(view.ratingChange, locale));
  out.push(t("coachFeedbackCommand"));
  return out.join("\n");
}

export function formatFeedback(fb: CoachingFeedback, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  const out = [`${t("feedbackHeading")}${fb.source === "rule_based" ? t("ruleBasedSuffix") : ""}`, fb.summary.trim()];
  if (fb.evidence.length > 0) {
    out.push(
      `${t("evidenceHeading")}\n${fb.evidence
        .map((e) => `  - ${e.text}${e.line !== undefined ? t("lineRef", { line: e.line }) : ""}${e.testId ? ` [${e.testId}]` : ""}`)
        .join("\n")}`,
    );
  }
  if (fb.priorities.length > 0) out.push(`${t("prioritiesHeading")}\n${fb.priorities.map((p, i) => `  ${i + 1}. ${p}`).join("\n")}`);
  out.push(t("nextAction", { action: fb.nextAction }));
  if (fb.rubricNotes.length > 0) {
    out.push(
      `${t("rubricNotesHeading")}\n${fb.rubricNotes
        .map((n) => `  - ${n.rubricId} (${t(n.verdict === "good" ? "verdictGood" : "verdictSuggestion")}): ${n.text}`)
        .join("\n")}`,
    );
  }
  return out.join("\n");
}

export function formatHints(hints: readonly Hint[], locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  if (hints.length === 0) return t("noHints");
  return hints.map((h) => `${t("hintLabel", { level: h.level })} ${h.markdown}`).join("\n\n");
}

export function formatExplanation(ex: Explanation, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  return [t("explanationHeading"), "", ex.markdown.trim(), "", t("referenceSolution"), indent(ex.solutionCode.trimEnd(), "  ")].join("\n");
}

export function formatSession(session: Session, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  const lines = session.items.map(
    (it) =>
      `${it.index === session.currentIndex ? "▶" : " "} ${it.index + 1}. [${t(ITEM_KIND[it.kind])}] ${it.exerciseId} · ${it.reason} · ${t(ITEM_STATUS[it.status])}`,
  );
  return `${t("sessionHeading", { id: session.id, minutes: session.targetMinutes })}\n${lines.join("\n")}`;
}

export function formatProgress(p: ProgressView, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  const names = new Map(p.skills.map((s) => [s.id as string, s.name]));
  const prof = p.profile;
  const out = [
    prof.overall
      ? t("overallRating", { rating: Math.round(prof.overall.rating), provisional: prof.overall.provisional ? t("provisionalParen") : "" })
      : t("overallNone"),
  ];
  if (prof.estimates.length > 0) {
    out.push(
      t("skillRatingsHeading") +
        "\n" +
        [...prof.estimates]
          .sort((a, b) => b.rating - a.rating)
          .map((e) =>
            t("skillRatingRow", {
              skill: names.get(e.skillId) ?? e.skillId,
              rating: Math.round(e.rating),
              deviation: Math.round(e.deviation),
              count: e.ratedObservations,
              provisional: e.provisional ? t("provisionalComma") : "",
            }),
          )
          .join("\n"),
    );
  }
  if (prof.reviews.length > 0) {
    out.push(
      t("reviewsHeading") +
        "\n" +
        [...prof.reviews]
          .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
          .map((r) => `  ${names.get(r.skillId) ?? r.skillId}: ${r.dueAt.slice(0, 10)}`)
          .join("\n"),
    );
  }
  const open = prof.errorTags.filter((x) => !x.lastResolvedAt || x.lastResolvedAt < x.lastSeenAt);
  if (open.length > 0) {
    out.push(
      t("mistakesHeading") +
        "\n" +
        [...open]
          .sort((a, b) => b.count - a.count)
          .map((x) => t("mistakeRow", { tag: x.tag, count: x.count }))
          .join("\n"),
    );
  }
  return out.join("\n");
}
