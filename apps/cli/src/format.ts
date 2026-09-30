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

type Outcome = TrialRun["outcome"];
type TestResult = TrialRun["tests"][number];
type Diagnostic = TrialRun["compileDiagnostics"][number];
type Evaluation = NonNullable<SubmissionView["submission"]["evaluation"]>;

const OUTCOME: Record<Outcome, string> = {
  passed: "통과",
  failed_tests: "테스트 실패",
  too_slow: "성능 기준 미달",
  compile_error: "컴파일 오류",
  timeout: "시간 초과",
  rejected: "정적 검사에서 거부됨",
  system_error: "시스템 오류 (학습 실패로 집계되지 않음)",
};
const TEST_MARK: Record<TestResult["status"], string> = { passed: "✓", failed: "✗", error: "!", timeout: "⏱" };
const ITEM_KIND: Record<Session["items"][number]["kind"], string> = { review: "복습", focus: "집중", variation: "변형", challenge: "도전" };
const ITEM_STATUS: Record<Session["items"][number]["status"], string> = {
  pending: "대기",
  in_progress: "진행 중",
  passed: "통과",
  failed: "실패",
  skipped: "건너뜀",
};

function indent(s: string, pad = "    "): string {
  return s
    .split("\n")
    .map((l) => pad + l)
    .join("\n");
}

function diagnostics(ds: readonly Diagnostic[]): string {
  return ds
    .map((d) => {
      const loc = d.file ? `${d.file}${d.line !== undefined ? `:${d.line}` : ""}${d.column !== undefined ? `:${d.column}` : ""}: ` : "";
      return `  ${d.severity === "error" ? "오류" : "경고"} ${loc}${d.message}`;
    })
    .join("\n");
}

function tests(ts: readonly TestResult[]): string {
  return ts
    .map((t) => {
      let line = `  ${TEST_MARK[t.status]} ${t.name}${t.visibility === "hidden" ? " (숨김)" : ""}`;
      if (t.status !== "passed" && t.message) line += `\n${indent(t.message)}`;
      if (t.status !== "passed" && t.code) line += `\n${indent(t.code)}`;
      return line;
    })
    .join("\n");
}

function common(r: {
  readonly outcome: Outcome;
  readonly compileDiagnostics: readonly Diagnostic[];
  readonly tests: readonly TestResult[];
  readonly rejectionReasons?: readonly string[] | undefined;
}): string[] {
  const passed = r.tests.filter((t) => t.status === "passed").length;
  const out = [`결과: ${OUTCOME[r.outcome]}${r.tests.length > 0 ? ` (${passed}/${r.tests.length} 통과)` : ""}`];
  if (r.rejectionReasons?.length) out.push(`거부 사유:\n${r.rejectionReasons.map((x) => `  - ${x}`).join("\n")}`);
  if (r.compileDiagnostics.length > 0) out.push(`컴파일 진단:\n${diagnostics(r.compileDiagnostics)}`);
  if (r.tests.length > 0) out.push(`테스트:\n${tests(r.tests)}`);
  return out;
}

export function formatTrialRun(run: TrialRun): string {
  const out = ["공개 테스트 실행 (기록되지 않음)", ...common(run)];
  if (run.outcome === "passed") out.push("공개 테스트를 모두 통과했습니다. `fp submit`으로 제출하세요.");
  return out.join("\n");
}

export function formatRatingChange(rc: RatingChange | null): string {
  if (!rc) return "레이팅 변화: 없음 (재제출, 도움 사용, 또는 시스템 오류로 반영되지 않음)";
  const delta = Math.round(rc.after - rc.before);
  return `레이팅 변화: ${rc.skillId} ${Math.round(rc.before)} → ${Math.round(rc.after)} (${delta > 0 ? "+" : ""}${delta})${rc.provisional ? " · 잠정치" : ""}`;
}

function evaluation(ev: Evaluation): string[] {
  const out = common(ev);
  if (ev.requirements.length > 0) {
    const label = { met: "✓", unmet: "✗", undetermined: "?" } as const;
    out.push(`요구사항:\n${ev.requirements.map((r) => `  ${label[r.status]} ${r.id} ${r.description}`).join("\n")}`);
  }
  if (ev.performance && ev.performance.verdict !== "not_measured") {
    const ratio = ev.performance.ratio !== undefined ? ` (기준 대비 ${ev.performance.ratio.toFixed(2)}배)` : "";
    out.push(`성능: ${ev.performance.verdict === "ok" ? "기준 충족" : "기준 미달"}${ratio}`);
  }
  const flagged = ev.rubricChecks.filter((c) => c.status === "flagged");
  if (flagged.length > 0) out.push(`코드 품질 지적:\n${flagged.map((c) => `  - ${c.rubricId}${c.message ? `: ${c.message}` : ""}`).join("\n")}`);
  return out;
}

export function formatSubmission(view: SubmissionView): string {
  const s = view.submission;
  const out = [`제출 ${s.id} (${s.attemptNo}번째 시도)`];
  if (s.evaluation) out.push(...evaluation(s.evaluation));
  else out.push("아직 채점 중입니다.");
  out.push(formatRatingChange(view.ratingChange));
  out.push("코치 피드백: `fp feedback`");
  return out.join("\n");
}

export function formatFeedback(fb: CoachingFeedback): string {
  const out = [`코치 피드백${fb.source === "rule_based" ? " (규칙 기반)" : ""}`, fb.summary.trim()];
  if (fb.evidence.length > 0) {
    out.push(
      `근거:\n${fb.evidence.map((e) => `  - ${e.text}${e.line !== undefined ? ` (${e.line}행)` : ""}${e.testId ? ` [${e.testId}]` : ""}`).join("\n")}`,
    );
  }
  if (fb.priorities.length > 0) out.push(`우선순위:\n${fb.priorities.map((p, i) => `  ${i + 1}. ${p}`).join("\n")}`);
  out.push(`다음 행동: ${fb.nextAction}`);
  if (fb.rubricNotes.length > 0) {
    out.push(`코드 품질 메모:\n${fb.rubricNotes.map((n) => `  - ${n.rubricId} (${n.verdict === "good" ? "좋음" : "제안"}): ${n.text}`).join("\n")}`);
  }
  return out.join("\n");
}

export function formatHints(hints: readonly Hint[]): string {
  if (hints.length === 0) return "공개된 힌트가 없습니다.";
  return hints.map((h) => `[힌트 ${h.level}] ${h.markdown}`).join("\n\n");
}

export function formatExplanation(ex: Explanation): string {
  return ["해설 (이 문제는 레이팅에 반영되지 않으며, 숙달 여부는 새 문제에서 다시 확인됩니다)", "", ex.markdown.trim(), "", "참고 풀이:", indent(ex.solutionCode.trimEnd(), "  ")].join(
    "\n",
  );
}

export function formatSession(session: Session): string {
  const lines = session.items.map(
    (it) =>
      `${it.index === session.currentIndex ? "▶" : " "} ${it.index + 1}. [${ITEM_KIND[it.kind]}] ${it.exerciseId} · ${it.reason} · ${ITEM_STATUS[it.status]}`,
  );
  return `세션 ${session.id} (${session.targetMinutes}분 목표)\n${lines.join("\n")}`;
}

export function formatProgress(p: ProgressView): string {
  const names = new Map(p.skills.map((s) => [s.id as string, s.name]));
  const prof = p.profile;
  const out = [
    prof.overall
      ? `종합 레이팅: ${Math.round(prof.overall.rating)}${prof.overall.provisional ? " (잠정치)" : ""}`
      : "종합 레이팅: 아직 없음",
  ];
  if (prof.estimates.length > 0) {
    out.push(
      "기술별 레이팅:\n" +
        [...prof.estimates]
          .sort((a, b) => b.rating - a.rating)
          .map((e) => `  ${names.get(e.skillId) ?? e.skillId}: ${Math.round(e.rating)} ±${Math.round(e.deviation)} (채점 ${e.ratedObservations}회${e.provisional ? ", 잠정치" : ""})`)
          .join("\n"),
    );
  }
  if (prof.reviews.length > 0) {
    out.push(
      "복습 예정:\n" +
        [...prof.reviews]
          .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
          .map((r) => `  ${names.get(r.skillId) ?? r.skillId}: ${r.dueAt.slice(0, 10)}`)
          .join("\n"),
    );
  }
  const open = prof.errorTags.filter((t) => !t.lastResolvedAt || t.lastResolvedAt < t.lastSeenAt);
  if (open.length > 0) out.push("반복되는 실수:\n" + [...open].sort((a, b) => b.count - a.count).map((t) => `  ${t.tag} (${t.count}회)`).join("\n"));
  return out.join("\n");
}
