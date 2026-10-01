import type {
  CoachingFeedback,
  Explanation,
  ExerciseView,
  Hint,
  ProgressView,
  RatingChange,
  Recommendation,
  Session,
  SubmissionView,
  TrialRun,
} from "@fp/api-contract";
import { DEFAULT_LOCALE, translator } from "./messages.ts";
import type { Locale, MessageId, Translate } from "./messages.ts";

// Every renderer takes the learner's locale (default "ko"). Server-provided text (prompts, test names,
// feedback, hints, notes) already arrives in the account's locale and is passed through as is.

// Types that api-contract does not re-export are derived structurally so we depend on nothing else.
type Evaluation = NonNullable<SubmissionView["submission"]["evaluation"]>;
type Outcome = TrialRun["outcome"];
type TestResult = TrialRun["tests"][number];
type Diagnostic = TrialRun["compileDiagnostics"][number];
type SessionItem = Session["items"][number];

const KIND_LABEL: Record<ExerciseView["exercise"]["kind"], MessageId> = {
  implement: "kindImplement",
  fix: "kindFix",
  refactor: "kindRefactor",
  predict: "kindPredict",
};

const OUTCOME_LABEL: Record<Outcome, MessageId> = {
  passed: "outcomePassed",
  failed_tests: "outcomeFailedTests",
  too_slow: "outcomeTooSlow",
  compile_error: "outcomeCompileError",
  timeout: "outcomeTimeout",
  rejected: "outcomeRejected",
  system_error: "outcomeSystemError",
};

const TEST_STATUS_LABEL: Record<TestResult["status"], MessageId> = {
  passed: "testPassed",
  failed: "testFailed",
  error: "testError",
  timeout: "testTimeout",
};

const ITEM_KIND_LABEL: Record<SessionItem["kind"], MessageId> = {
  review: "itemReview",
  focus: "itemFocus",
  variation: "itemVariation",
  challenge: "itemChallenge",
};

const ITEM_STATUS_LABEL: Record<SessionItem["status"], MessageId> = {
  pending: "statusPending",
  in_progress: "statusInProgress",
  passed: "statusPassed",
  failed: "statusFailed",
  skipped: "statusSkipped",
};

const REQUIREMENT_LABEL = { met: "reqMet", unmet: "reqUnmet", undetermined: "reqUndetermined" } as const satisfies Record<string, MessageId>;

export function outcomeLabel(o: Outcome, locale: Locale = DEFAULT_LOCALE): string {
  return translator(locale)(OUTCOME_LABEL[o]);
}

/** Resource URI helpers. Exercise ids contain "/" and "@", so they are percent-encoded in URIs. */
export const uris = {
  concepts: (exerciseId: string) => `fp://exercise/${encodeURIComponent(exerciseId)}/concepts`,
  exerciseTheory: (exerciseId: string) => `fp://exercise/${encodeURIComponent(exerciseId)}/theory`,
  theory: (topicId: string) => `fp://theory/${encodeURIComponent(topicId)}`,
};

function fence(code: string, lang = "gleam"): string {
  return "```" + lang + "\n" + code.replace(/\n+$/, "") + "\n```";
}

function pct(p: number): string {
  return `${Math.round(p * 100)}%`;
}

/** Learner-safe projection of an exercise: never includes the content of unrevealed hints. */
export function exerciseStructured(view: ExerciseView) {
  const ex = view.exercise;
  return {
    id: ex.id,
    title: ex.title,
    kind: ex.kind,
    format: ex.format,
    primarySkill: ex.primarySkill,
    difficulty: ex.difficulty,
    estimatedMinutes: ex.estimatedMinutes,
    moduleName: ex.moduleName,
    promptMarkdown: ex.promptMarkdown,
    starterFiles: ex.starterFiles,
    publicTests: ex.publicTests,
    predictCode: ex.predict?.code ?? null,
    hintCount: ex.hints.length,
    revealedHints: view.revealedHints,
    rubric: ex.rubric.map((r) => ({ id: r.id, title: r.title, description: r.description })),
    conceptNotes: view.conceptNotes.map((n) => ({ id: n.id, title: n.title })),
    theoryTopics: view.theoryTopics.map((t) => ({ id: t.id, title: t.title, level: t.level })),
    resources: {
      concepts: uris.concepts(ex.id),
      theory: uris.exerciseTheory(ex.id),
    },
  };
}

export function renderHints(hints: readonly Hint[], locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  return hints.map((h) => `${t("hintLabel", { level: h.level, kind: h.kind })}\n${h.markdown}`).join("\n\n");
}

export interface RenderExerciseOptions {
  /** Include the full markdown of concept notes and theory topics. */
  readonly includeNotes?: boolean;
  readonly locale?: Locale;
}

/** Essential problem content as markdown. Many MCP hosts ignore resources, so this must stand alone. */
export function renderExercise(view: ExerciseView, opts: RenderExerciseOptions = {}): string {
  const locale = opts.locale ?? DEFAULT_LOCALE;
  const t = translator(locale);
  const ex = view.exercise;
  const out: string[] = [];
  out.push(`## ${ex.title}`);
  out.push(
    t("exerciseMeta", {
      id: ex.id,
      kind: t(KIND_LABEL[ex.kind]),
      challenge: ex.format === "challenge" ? t("challengeSuffix") : "",
      skill: ex.primarySkill,
      difficulty: ex.difficulty,
      minutes: ex.estimatedMinutes,
    }),
  );
  out.push(`${t("problemHeading")}\n${ex.promptMarkdown.trim()}`);
  if (ex.predict) {
    out.push(`${t("readCodeHeading")}\n${fence(ex.predict.code)}\n${t("predictHow")}`);
  }
  if (ex.kind !== "predict") {
    const learnerPath = `src/${ex.moduleName}.gleam`;
    if (ex.starterFiles.length === 0) out.push(`${t("starterHeading", { path: learnerPath })}\n${t("starterEmpty")}`);
    for (const f of ex.starterFiles) out.push(`${t("starterHeading", { path: f.path })}\n${fence(f.content)}`);
  }
  if (ex.publicTests.length > 0) {
    out.push(`${t("publicTestsHeading")}\n` + ex.publicTests.map((x) => `#### ${x.name}\n${fence(x.code)}`).join("\n\n"));
  }
  if (ex.rubric.length > 0) {
    out.push(`${t("rubricHeading")}\n` + ex.rubric.map((r) => `- ${r.id} ${r.title}: ${r.description}`).join("\n"));
  }
  out.push(t("hintsSummary", { total: ex.hints.length, revealed: view.revealedHints.length }));
  if (view.revealedHints.length > 0) out.push(renderHints(view.revealedHints, locale));
  if (view.conceptNotes.length > 0 || view.theoryTopics.length > 0) {
    if (opts.includeNotes) {
      for (const n of view.conceptNotes) out.push(`${t("conceptNoteHeading", { title: n.title })}\n${n.markdown.trim()}`);
      for (const x of view.theoryTopics) out.push(`${t("theoryHeading", { title: x.title })}\n${x.markdown.trim()}`);
    } else {
      const lines = [
        ...view.conceptNotes.map((n) => t("conceptNoteItem", { title: n.title })),
        ...view.theoryTopics.map((x) => t("theoryItem", { title: x.title })),
      ];
      out.push(
        `${t("notesHeading")}\n${lines.join("\n")}\n` + t("notesHow", { concepts: uris.concepts(ex.id), theory: uris.exerciseTheory(ex.id) }),
      );
    }
  }
  return out.join("\n\n");
}

export function renderSessionPlan(session: Session, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  const lines = session.items.map((it) => {
    const marker = it.index === session.currentIndex ? "▶" : " ";
    return `${marker} ${it.index + 1}. [${t(ITEM_KIND_LABEL[it.kind])}] ${it.exerciseId} · ${it.reason} · ${t(ITEM_STATUS_LABEL[it.status])}`;
  });
  return `${t("sessionPlan", { id: session.id, minutes: session.targetMinutes, count: session.items.length })}\n${lines.join("\n")}`;
}

export function currentItem(session: Session): SessionItem | null {
  if (session.currentIndex === null) return null;
  return session.items.find((i) => i.index === session.currentIndex) ?? null;
}

function renderDiagnostics(t: Translate, diags: readonly Diagnostic[]): string {
  return diags
    .map((d) => {
      const loc = d.file ? ` (${d.file}${d.line !== undefined ? `:${d.line}` : ""}${d.column !== undefined ? `:${d.column}` : ""})` : "";
      return `- ${t(d.severity === "error" ? "diagError" : "diagWarning")}${loc}: ${d.message}`;
    })
    .join("\n");
}

function renderTests(t: Translate, tests: readonly TestResult[]): string {
  return tests
    .map((r) => {
      const hidden = r.visibility === "hidden" ? t("hiddenTestSuffix") : "";
      let line = `- [${t(TEST_STATUS_LABEL[r.status])}] ${r.name}${hidden}`;
      if (r.status !== "passed") {
        if (r.message) line += `\n${t("testMessage", { message: r.message })}`;
        if (r.code) line += `\n${t("testCode")}\n${fence(r.code)
          .split("\n")
          .map((l) => "  " + l)
          .join("\n")}`;
      }
      return line;
    })
    .join("\n");
}

function renderCommon(
  t: Translate,
  r: {
    readonly outcome: Outcome;
    readonly compileDiagnostics: readonly Diagnostic[];
    readonly tests: readonly TestResult[];
    readonly rejectionReasons?: readonly string[] | undefined;
  },
): string[] {
  const out: string[] = [];
  const passed = r.tests.filter((x) => x.status === "passed").length;
  const count = r.tests.length > 0 ? t("testsPassedCount", { passed, total: r.tests.length }) : "";
  out.push(t("resultLine", { outcome: t(OUTCOME_LABEL[r.outcome]) }) + count);
  if (r.rejectionReasons && r.rejectionReasons.length > 0) {
    out.push(`${t("rejectionReasons")}\n${r.rejectionReasons.map((x) => `- ${x}`).join("\n")}`);
  }
  if (r.compileDiagnostics.length > 0) out.push(`${t("compileDiagnostics")}\n${renderDiagnostics(t, r.compileDiagnostics)}`);
  if (r.tests.length > 0) out.push(`${t("testsHeading")}\n${renderTests(t, r.tests)}`);
  return out;
}

export function renderTrialRun(run: TrialRun, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  const out = [t("trialRunHeading"), ...renderCommon(t, run)];
  if (run.outcome === "passed") out.push(t("trialRunPassed"));
  return out.join("\n\n");
}

export function renderRatingChange(rc: RatingChange | null, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  if (!rc) return t("ratingNone");
  const delta = Math.round(rc.after - rc.before);
  const sign = delta > 0 ? "+" : "";
  return t("ratingChange", {
    skill: rc.skillId,
    before: Math.round(rc.before),
    after: Math.round(rc.after),
    delta: `${sign}${delta}`,
    provisional: rc.provisional ? t("provisionalSuffix") : "",
  });
}

function renderEvaluation(t: Translate, ev: Evaluation): string[] {
  const out = renderCommon(t, ev);
  if (ev.requirements.length > 0) {
    out.push(`${t("requirementsHeading")}\n${ev.requirements.map((r) => `- [${t(REQUIREMENT_LABEL[r.status])}] ${r.id} ${r.description}`).join("\n")}`);
  }
  if (ev.performance && ev.performance.verdict !== "not_measured") {
    const ratio = ev.performance.ratio !== undefined ? t("performanceRatio", { ratio: ev.performance.ratio.toFixed(2) }) : "";
    out.push(t("performanceLine", { verdict: t(ev.performance.verdict === "ok" ? "performanceOk" : "performanceSlow"), ratio }));
  }
  const flagged = ev.rubricChecks.filter((c) => c.status === "flagged");
  if (flagged.length > 0) {
    out.push(`${t("rubricFlagged")}\n${flagged.map((c) => `- ${c.rubricId}${c.message ? `: ${c.message}` : ""}`).join("\n")}`);
  }
  return out;
}

export function renderSubmission(view: SubmissionView, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  const s = view.submission;
  const out = [t("submissionHeading", { id: s.id, attempt: s.attemptNo })];
  if (!s.evaluation) out.push(t("stillGrading"));
  else out.push(...renderEvaluation(t, s.evaluation));
  out.push(renderRatingChange(view.ratingChange, locale));
  out.push(t("feedbackCall", { args: `{"submission_id": "${s.id}"}` }));
  return out.join("\n\n");
}

export function renderFeedback(fb: CoachingFeedback, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  const out = [`${t("feedbackHeading")}${fb.source === "rule_based" ? t("ruleBasedSuffix") : ""}`, fb.summary.trim()];
  if (fb.evidence.length > 0) {
    out.push(
      `${t("evidenceHeading")}\n${fb.evidence
        .map((e) => `- ${e.text}${e.line !== undefined ? t("lineRef", { line: e.line }) : ""}${e.testId ? t("testRef", { id: e.testId }) : ""}`)
        .join("\n")}`,
    );
  }
  if (fb.priorities.length > 0) out.push(`${t("prioritiesHeading")}\n${fb.priorities.map((p, i) => `${i + 1}. ${p}`).join("\n")}`);
  out.push(t("nextAction", { action: fb.nextAction }));
  if (fb.rubricNotes.length > 0) {
    out.push(
      `${t("rubricNotesHeading")}\n${fb.rubricNotes
        .map((n) => `- ${n.rubricId} (${t(n.verdict === "good" ? "verdictGood" : "verdictSuggestion")}): ${n.text}`)
        .join("\n")}`,
    );
  }
  return out.join("\n\n");
}

export function renderExplanation(ex: Explanation, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  return [t("explanationHeading"), t("explanationWarning"), ex.markdown.trim(), `${t("referenceSolution")}\n${fence(ex.solutionCode)}`].join("\n\n");
}

export function renderProgress(p: ProgressView, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  const names = new Map(p.skills.map((s) => [s.id as string, s.name]));
  const prof = p.profile;
  const out = [t("progressHeading")];
  out.push(
    prof.overall
      ? t("overallRating", { rating: Math.round(prof.overall.rating), provisional: prof.overall.provisional ? t("provisionalParen") : "" })
      : t("overallNone"),
  );
  if (prof.estimates.length > 0) {
    const rows = [...prof.estimates]
      .sort((a, b) => b.rating - a.rating)
      .map((e) =>
        t("skillRatingRow", {
          skill: names.get(e.skillId) ?? e.skillId,
          rating: Math.round(e.rating),
          deviation: Math.round(e.deviation),
          count: e.ratedObservations,
          provisional: e.provisional ? t("provisionalComma") : "",
        }),
      );
    out.push(`${t("skillRatingsHeading")}\n${rows.join("\n")}`);
  }
  if (prof.reviews.length > 0) {
    const rows = [...prof.reviews]
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
      .map((r) => `- ${names.get(r.skillId) ?? r.skillId}: ${r.dueAt.slice(0, 10)}`);
    out.push(`${t("reviewsHeading")}\n${rows.join("\n")}`);
  }
  const open = prof.errorTags.filter((x) => !x.lastResolvedAt || x.lastResolvedAt < x.lastSeenAt);
  if (open.length > 0) {
    out.push(
      `${t("mistakesHeading")}\n${[...open]
        .sort((a, b) => b.count - a.count)
        .map((x) => t("mistakeRow", { tag: x.tag, count: x.count }))
        .join("\n")}`,
    );
  }
  return out.join("\n\n");
}

export function renderRecommendation(r: Recommendation, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  return t("recommendation", { id: r.exerciseId, kind: t(ITEM_KIND_LABEL[r.kind]), reason: r.reason, success: pct(r.expectedSuccess) });
}
