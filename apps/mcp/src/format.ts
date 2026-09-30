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

// Types that api-contract does not re-export are derived structurally so we depend on nothing else.
type Evaluation = NonNullable<SubmissionView["submission"]["evaluation"]>;
type Outcome = TrialRun["outcome"];
type TestResult = TrialRun["tests"][number];
type Diagnostic = TrialRun["compileDiagnostics"][number];
type SessionItem = Session["items"][number];

const KIND_LABEL: Record<ExerciseView["exercise"]["kind"], string> = {
  implement: "구현",
  fix: "버그 수정",
  refactor: "리팩터링",
  predict: "결과 예측",
};

const OUTCOME_LABEL: Record<Outcome, string> = {
  passed: "통과",
  failed_tests: "테스트 실패",
  too_slow: "성능 기준 미달",
  compile_error: "컴파일 오류",
  timeout: "시간 초과",
  rejected: "정적 검사에서 거부됨",
  system_error: "시스템 오류 (학습 실패로 집계되지 않습니다)",
};

const TEST_STATUS_LABEL: Record<TestResult["status"], string> = {
  passed: "통과",
  failed: "실패",
  error: "오류",
  timeout: "시간 초과",
};

const ITEM_KIND_LABEL: Record<SessionItem["kind"], string> = {
  review: "복습",
  focus: "집중",
  variation: "변형",
  challenge: "도전",
};

const ITEM_STATUS_LABEL: Record<SessionItem["status"], string> = {
  pending: "대기",
  in_progress: "진행 중",
  passed: "통과",
  failed: "실패",
  skipped: "건너뜀",
};

export function outcomeLabel(o: Outcome): string {
  return OUTCOME_LABEL[o];
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

export function renderHints(hints: readonly Hint[]): string {
  return hints.map((h) => `**힌트 ${h.level}** (${h.kind})\n${h.markdown}`).join("\n\n");
}

export interface RenderExerciseOptions {
  /** Include the full markdown of concept notes and theory topics. */
  readonly includeNotes?: boolean;
}

/** Essential problem content as markdown. Many MCP hosts ignore resources, so this must stand alone. */
export function renderExercise(view: ExerciseView, opts: RenderExerciseOptions = {}): string {
  const ex = view.exercise;
  const out: string[] = [];
  out.push(`## ${ex.title}`);
  out.push(
    `- 문제 ID: \`${ex.id}\`\n- 유형: ${KIND_LABEL[ex.kind]}${ex.format === "challenge" ? " (도전 과제)" : ""}` +
      ` · 기술: ${ex.primarySkill} · 난이도: ${ex.difficulty} · 예상 ${ex.estimatedMinutes}분`,
  );
  out.push(`### 문제\n${ex.promptMarkdown.trim()}`);
  if (ex.predict) {
    out.push(`### 읽을 코드\n${fence(ex.predict.code)}\n답은 submit_solution의 code에 결과 값만 적어 제출합니다.`);
  }
  if (ex.kind !== "predict") {
    const learnerPath = `src/${ex.moduleName}.gleam`;
    if (ex.starterFiles.length === 0) out.push(`### 시작 코드 (${learnerPath})\n(비어 있음)`);
    for (const f of ex.starterFiles) out.push(`### 시작 코드 (${f.path})\n${fence(f.content)}`);
  }
  if (ex.publicTests.length > 0) {
    out.push(`### 공개 테스트\n` + ex.publicTests.map((t) => `#### ${t.name}\n${fence(t.code)}`).join("\n\n"));
  }
  if (ex.rubric.length > 0) {
    out.push(`### 코드 품질 기준\n` + ex.rubric.map((r) => `- ${r.id} ${r.title}: ${r.description}`).join("\n"));
  }
  out.push(`### 힌트\n총 ${ex.hints.length}단계 중 ${view.revealedHints.length}단계 공개됨.`);
  if (view.revealedHints.length > 0) out.push(renderHints(view.revealedHints));
  if (view.conceptNotes.length > 0 || view.theoryTopics.length > 0) {
    if (opts.includeNotes) {
      for (const n of view.conceptNotes) out.push(`### 개념 노트: ${n.title}\n${n.markdown.trim()}`);
      for (const t of view.theoryTopics) out.push(`### 이론: ${t.title}\n${t.markdown.trim()}`);
    } else {
      const lines = [
        ...view.conceptNotes.map((n) => `- 개념: ${n.title}`),
        ...view.theoryTopics.map((t) => `- 이론: ${t.title}`),
      ];
      out.push(
        `### 참고 노트\n${lines.join("\n")}\n` +
          `(전문: get_exercise에 include_notes=true, 또는 리소스 ${uris.concepts(ex.id)} / ${uris.exerciseTheory(ex.id)})`,
      );
    }
  }
  return out.join("\n\n");
}

export function renderSessionPlan(session: Session): string {
  const lines = session.items.map((it) => {
    const marker = it.index === session.currentIndex ? "▶" : " ";
    return `${marker} ${it.index + 1}. [${ITEM_KIND_LABEL[it.kind]}] ${it.exerciseId} · ${it.reason} · ${ITEM_STATUS_LABEL[it.status]}`;
  });
  return `세션 \`${session.id}\` (${session.targetMinutes}분 목표, ${session.items.length}문제)\n${lines.join("\n")}`;
}

export function currentItem(session: Session): SessionItem | null {
  if (session.currentIndex === null) return null;
  return session.items.find((i) => i.index === session.currentIndex) ?? null;
}

function renderDiagnostics(diags: readonly Diagnostic[]): string {
  return diags
    .map((d) => {
      const loc = d.file ? ` (${d.file}${d.line !== undefined ? `:${d.line}` : ""}${d.column !== undefined ? `:${d.column}` : ""})` : "";
      return `- ${d.severity === "error" ? "오류" : "경고"}${loc}: ${d.message}`;
    })
    .join("\n");
}

function renderTests(tests: readonly TestResult[]): string {
  return tests
    .map((t) => {
      const hidden = t.visibility === "hidden" ? " (숨김 테스트)" : "";
      let line = `- [${TEST_STATUS_LABEL[t.status]}] ${t.name}${hidden}`;
      if (t.status !== "passed") {
        if (t.message) line += `\n  메시지: ${t.message}`;
        if (t.code) line += `\n  테스트 코드:\n${fence(t.code)
          .split("\n")
          .map((l) => "  " + l)
          .join("\n")}`;
      }
      return line;
    })
    .join("\n");
}

function renderCommon(r: {
  readonly outcome: Outcome;
  readonly compileDiagnostics: readonly Diagnostic[];
  readonly tests: readonly TestResult[];
  readonly rejectionReasons?: readonly string[] | undefined;
}): string[] {
  const out: string[] = [];
  const passed = r.tests.filter((t) => t.status === "passed").length;
  out.push(`결과: ${OUTCOME_LABEL[r.outcome]}${r.tests.length > 0 ? ` (테스트 ${passed}/${r.tests.length} 통과)` : ""}`);
  if (r.rejectionReasons && r.rejectionReasons.length > 0) {
    out.push(`거부 사유:\n${r.rejectionReasons.map((x) => `- ${x}`).join("\n")}`);
  }
  if (r.compileDiagnostics.length > 0) out.push(`컴파일 진단:\n${renderDiagnostics(r.compileDiagnostics)}`);
  if (r.tests.length > 0) out.push(`테스트:\n${renderTests(r.tests)}`);
  return out;
}

export function renderTrialRun(run: TrialRun): string {
  const out = ["## 실행 결과 (공개 테스트만, 기록되지 않음)", ...renderCommon(run)];
  if (run.outcome === "passed") out.push("공개 테스트를 모두 통과했습니다. 준비되면 submit_solution으로 제출하세요 (숨김 테스트 포함 채점).");
  return out.join("\n\n");
}

export function renderRatingChange(rc: RatingChange | null): string {
  if (!rc) return "레이팅 변화: 없음 (재제출, 많은 도움 사용, 또는 시스템 오류로 레이팅에 반영되지 않았습니다)";
  const delta = Math.round(rc.after - rc.before);
  const sign = delta > 0 ? "+" : "";
  return `레이팅 변화: ${rc.skillId} ${Math.round(rc.before)} → ${Math.round(rc.after)} (${sign}${delta})${rc.provisional ? " · 잠정치" : ""}`;
}

function renderEvaluation(ev: Evaluation): string[] {
  const out = renderCommon(ev);
  if (ev.requirements.length > 0) {
    const label = { met: "충족", unmet: "미충족", undetermined: "판단 불가" } as const;
    out.push(`요구사항:\n${ev.requirements.map((r) => `- [${label[r.status]}] ${r.id} ${r.description}`).join("\n")}`);
  }
  if (ev.performance && ev.performance.verdict !== "not_measured") {
    const ratio = ev.performance.ratio !== undefined ? ` (기준 대비 ${ev.performance.ratio.toFixed(2)}배)` : "";
    out.push(`성능: ${ev.performance.verdict === "ok" ? "기준 충족" : "기준 미달"}${ratio}`);
  }
  const flagged = ev.rubricChecks.filter((c) => c.status === "flagged");
  if (flagged.length > 0) {
    out.push(`코드 품질 지적 (정답 여부와 무관):\n${flagged.map((c) => `- ${c.rubricId}${c.message ? `: ${c.message}` : ""}`).join("\n")}`);
  }
  return out;
}

export function renderSubmission(view: SubmissionView): string {
  const s = view.submission;
  const out = [`## 제출 결과 (\`${s.id}\`, ${s.attemptNo}번째 시도)`];
  if (!s.evaluation) out.push("아직 채점 중입니다. 잠시 후 get_feedback으로 확인하세요.");
  else out.push(...renderEvaluation(s.evaluation));
  out.push(renderRatingChange(view.ratingChange));
  out.push(`코치 피드백: get_feedback {"submission_id": "${s.id}"}`);
  return out.join("\n\n");
}

export function renderFeedback(fb: CoachingFeedback): string {
  const out = [`## 코치 피드백${fb.source === "rule_based" ? " (규칙 기반)" : ""}`, fb.summary.trim()];
  if (fb.evidence.length > 0) {
    out.push(
      `근거:\n${fb.evidence
        .map((e) => `- ${e.text}${e.line !== undefined ? ` (${e.line}행)` : ""}${e.testId ? ` [테스트 ${e.testId}]` : ""}`)
        .join("\n")}`,
    );
  }
  if (fb.priorities.length > 0) out.push(`우선순위:\n${fb.priorities.map((p, i) => `${i + 1}. ${p}`).join("\n")}`);
  out.push(`다음 행동: ${fb.nextAction}`);
  if (fb.rubricNotes.length > 0) {
    out.push(`코드 품질 메모:\n${fb.rubricNotes.map((n) => `- ${n.rubricId} (${n.verdict === "good" ? "좋음" : "제안"}): ${n.text}`).join("\n")}`);
  }
  return out.join("\n\n");
}

export function renderExplanation(ex: Explanation): string {
  return [
    "## 해설 (공개됨)",
    "주의: 해설을 본 문제는 레이팅에 반영되지 않으며, 숙달 여부는 이후 새로운 문제에서 다시 확인됩니다.",
    ex.markdown.trim(),
    `### 참고 풀이\n${fence(ex.solutionCode)}`,
  ].join("\n\n");
}

export function renderProgress(p: ProgressView): string {
  const names = new Map(p.skills.map((s) => [s.id as string, s.name]));
  const prof = p.profile;
  const out = ["## 학습 현황"];
  out.push(
    prof.overall
      ? `종합 레이팅: ${Math.round(prof.overall.rating)}${prof.overall.provisional ? " (잠정치)" : ""}`
      : "종합 레이팅: 아직 없음 (채점된 첫 시도가 쌓이면 계산됩니다)",
  );
  if (prof.estimates.length > 0) {
    const rows = [...prof.estimates]
      .sort((a, b) => b.rating - a.rating)
      .map(
        (e) =>
          `- ${names.get(e.skillId) ?? e.skillId}: ${Math.round(e.rating)} ±${Math.round(e.deviation)}` +
          ` (채점 ${e.ratedObservations}회${e.provisional ? ", 잠정치" : ""})`,
      );
    out.push(`기술별 레이팅:\n${rows.join("\n")}`);
  }
  if (prof.reviews.length > 0) {
    const rows = [...prof.reviews]
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
      .map((r) => `- ${names.get(r.skillId) ?? r.skillId}: ${r.dueAt.slice(0, 10)}`);
    out.push(`복습 예정:\n${rows.join("\n")}`);
  }
  const open = prof.errorTags.filter((t) => !t.lastResolvedAt || t.lastResolvedAt < t.lastSeenAt);
  if (open.length > 0) {
    out.push(`반복되는 실수:\n${[...open].sort((a, b) => b.count - a.count).map((t) => `- ${t.tag} (${t.count}회)`).join("\n")}`);
  }
  return out.join("\n\n");
}

export function renderRecommendation(r: Recommendation): string {
  return `추천 문제: \`${r.exerciseId}\` [${ITEM_KIND_LABEL[r.kind]}] · ${r.reason} · 예상 성공률 ${pct(r.expectedSuccess)}`;
}
