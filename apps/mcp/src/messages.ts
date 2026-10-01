/**
 * The MCP server's message catalog (ko source, en, zh) for learner-facing tool and resource output.
 * Tool descriptions, input schema descriptions and the server instructions are for the host model and stay
 * English (src/instructions.ts, src/server.ts).
 *
 * `LocalizedText`, `pickLocale` and `formatMessage` mirror @fp/kernel's: this thin client depends only on
 * @fp/api-contract, which re-exports the `Locale` type but not the kernel's runtime helpers.
 */
import type { Locale } from "@fp/api-contract";

export type { Locale };

export const SUPPORTED_LOCALES: readonly Locale[] = ["ko", "en", "zh"];
export const DEFAULT_LOCALE: Locale = "ko";

/** One message per locale; `ko` is required, others fall back to it. */
export type LocalizedText = { readonly ko: string } & Partial<Record<Exclude<Locale, "ko">, string>>;

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function pickLocale(text: LocalizedText, locale: Locale = DEFAULT_LOCALE): string {
  return text[locale] ?? text.ko;
}

/** Fills `{name}` placeholders; unknown placeholders are left as they are. */
export function formatMessage(template: string, params: Readonly<Record<string, string | number>> = {}): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}

/** "en", "en-US", "zh_CN.UTF-8", "KO" -> a supported locale; anything else -> undefined. */
export function normalizeLocale(value: string | undefined): Locale | undefined {
  if (!value) return undefined;
  const prefix = value.trim().toLowerCase().split(/[-_.@]/)[0] ?? "";
  return isLocale(prefix) ? prefix : undefined;
}

/** English names, for notes addressed to the host model. */
export const LOCALE_ENGLISH_NAME: Record<Locale, string> = { ko: "Korean", en: "English", zh: "Simplified Chinese" };

export const MESSAGES = {
  // ---------- errors (api.ts) ----------
  errUnauthorized: {
    ko: "인증에 실패했습니다. `fp token issue mcp`로 토큰을 발급해 MCP 설정의 FP_TOKEN에 넣어 주세요.",
    en: "Authentication failed. Issue a token with `fp token issue mcp` and put it in FP_TOKEN in your MCP config.",
    zh: "认证失败。请用 `fp token issue mcp` 签发令牌，并填入 MCP 配置中的 FP_TOKEN。",
  },
  errNotFound: { ko: "찾을 수 없습니다: {message}", en: "Not found: {message}", zh: "找不到：{message}" },
  errInvalidInput: { ko: "입력이 올바르지 않습니다: {message}", en: "Invalid input: {message}", zh: "输入无效：{message}" },
  errForbidden: { ko: "권한이 없습니다: {message}", en: "Not allowed: {message}", zh: "没有权限：{message}" },
  errConflict: {
    ko: "요청이 현재 상태와 충돌합니다: {message}",
    en: "The request conflicts with the current state: {message}",
    zh: "请求与当前状态冲突：{message}",
  },
  errRateLimited: {
    ko: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
    en: "Too many requests. Please try again in a moment.",
    zh: "请求过多，请稍后再试。",
  },
  errUnavailable: {
    ko: "서버의 일부 기능을 지금 사용할 수 없습니다: {message}",
    en: "Part of the server is unavailable right now: {message}",
    zh: "服务器的部分功能暂时不可用：{message}",
  },
  errServer: { ko: "서버 오류 (HTTP {status}): {message}", en: "Server error (HTTP {status}): {message}", zh: "服务器错误（HTTP {status}）：{message}" },
  errConnect: {
    ko: "API 서버에 연결할 수 없습니다 ({message}). 서버가 실행 중인지, FP_API_URL이 맞는지 확인해 주세요.",
    en: "Cannot reach the API server ({message}). Check that it is running and that FP_API_URL is correct.",
    zh: "无法连接 API 服务器（{message}）。请确认服务器正在运行，且 FP_API_URL 正确。",
  },
  errGeneric: { ko: "오류: {message}", en: "Error: {message}", zh: "错误：{message}" },
  tokenMissing: {
    ko: "[fp-mcp] FP_TOKEN이 설정되지 않았습니다. `fp token issue mcp`로 발급한 토큰을 설정하세요.",
    en: "[fp-mcp] FP_TOKEN is not set. Set it to a token issued with `fp token issue mcp`.",
    zh: "[fp-mcp] 未设置 FP_TOKEN。请设置用 `fp token issue mcp` 签发的令牌。",
  },

  // ---------- tool results (server.ts) ----------
  noSession: {
    ko: "진행 중인 세션이 없습니다. start_session으로 새 세션을 시작하거나 recommend_exercise로 문제를 추천받으세요.",
    en: "No active session. Start one with start_session, or get a suggested exercise with recommend_exercise.",
    zh: "没有进行中的训练回合。可以用 start_session 开始新回合，或用 recommend_exercise 获取推荐题目。",
  },
  sessionStarted: { ko: "새 세션을 시작했습니다.", en: "Started a new session.", zh: "已开始新的训练回合。" },
  sessionActive: { ko: "진행 중인 세션입니다.", en: "This is your active session.", zh: "这是进行中的训练回合。" },
  itemSkipped: { ko: "현재 문제를 건너뛰었습니다.", en: "Skipped the current exercise.", zh: "已跳过当前题目。" },
  sessionDone: {
    ko: "이 세션의 모든 문제를 마쳤습니다. get_progress로 결과를 확인하거나 start_session으로 새 세션을 시작하세요.",
    en: "You finished every exercise in this session. See the results with get_progress, or start a new session with start_session.",
    zh: "本训练回合的题目已全部完成。可用 get_progress 查看结果，或用 start_session 开始新回合。",
  },
  currentItem: {
    ko: "현재 문제 ({position}/{total}) · {reason}",
    en: "Current exercise ({position}/{total}) · {reason}",
    zh: "当前题目（{position}/{total}）· {reason}",
  },
  hintsHeading: { ko: "## 힌트 ({level}단계까지)", en: "## Hints (up to level {level})", zh: "## 提示（至第 {level} 级）" },
  noHintsToReveal: { ko: "공개할 힌트가 없습니다.", en: "There are no hints to reveal.", zh: "没有可查看的提示。" },
  hintUnratedNotice: {
    ko: "참고: 힌트 3단계 이상을 사용했으므로 이 문제의 제출은 레이팅에 반영되지 않습니다.",
    en: "Note: a level 3+ hint was used, so submissions for this exercise will not be rated.",
    zh: "注意：已使用第 3 级及以上的提示，本题的提交将不计入评分。",
  },
  coachNote: {
    ko: "코치 메모: 학습자가 직접 코드를 작성하게 하세요.",
    en: "Coach note: let the learner write the code.",
    zh: "教练备注：请让学习者自己写代码。",
  },

  // ---------- resources ----------
  noConceptNotes: {
    ko: "이 문제에 연결된 개념 노트가 없습니다.",
    en: "This exercise has no linked coding concept notes.",
    zh: "这道题没有关联的编程概念笔记。",
  },
  noTheoryNotes: { ko: "이 문제에 연결된 이론 노트가 없습니다.", en: "This exercise has no linked theory notes.", zh: "这道题没有关联的理论笔记。" },
  theoryNotFound: { ko: "이론 노트를 찾을 수 없습니다: {id}", en: "Theory note not found: {id}", zh: "找不到理论笔记：{id}" },
  furtherReading: { ko: "## 더 읽을거리", en: "## Further reading", zh: "## 延伸阅读" },

  // ---------- format: labels ----------
  kindImplement: { ko: "구현", en: "implement", zh: "实现" },
  kindFix: { ko: "버그 수정", en: "bug fix", zh: "修复 bug" },
  kindRefactor: { ko: "리팩터링", en: "refactor", zh: "重构" },
  kindPredict: { ko: "결과 예측", en: "predict the result", zh: "预测结果" },
  outcomePassed: { ko: "통과", en: "passed", zh: "通过" },
  outcomeFailedTests: { ko: "테스트 실패", en: "tests failed", zh: "测试未通过" },
  outcomeTooSlow: { ko: "성능 기준 미달", en: "too slow", zh: "未达到性能要求" },
  outcomeCompileError: { ko: "컴파일 오류", en: "compile error", zh: "编译错误" },
  outcomeTimeout: { ko: "시간 초과", en: "timed out", zh: "超时" },
  outcomeRejected: { ko: "정적 검사에서 거부됨", en: "rejected by static checks", zh: "未通过静态检查" },
  outcomeSystemError: {
    ko: "시스템 오류 (학습 실패로 집계되지 않습니다)",
    en: "system error (not counted against the learner)",
    zh: "系统错误（不计为学习失败）",
  },
  testPassed: { ko: "통과", en: "passed", zh: "通过" },
  testFailed: { ko: "실패", en: "failed", zh: "未通过" },
  testError: { ko: "오류", en: "error", zh: "错误" },
  testTimeout: { ko: "시간 초과", en: "timed out", zh: "超时" },
  itemReview: { ko: "복습", en: "review", zh: "复习" },
  itemFocus: { ko: "집중", en: "focus", zh: "专项" },
  itemVariation: { ko: "변형", en: "variation", zh: "变式" },
  itemChallenge: { ko: "도전", en: "challenge", zh: "挑战" },
  statusPending: { ko: "대기", en: "pending", zh: "待做" },
  statusInProgress: { ko: "진행 중", en: "in progress", zh: "进行中" },
  statusPassed: { ko: "통과", en: "passed", zh: "通过" },
  statusFailed: { ko: "실패", en: "failed", zh: "未通过" },
  statusSkipped: { ko: "건너뜀", en: "skipped", zh: "已跳过" },
  reqMet: { ko: "충족", en: "met", zh: "满足" },
  reqUnmet: { ko: "미충족", en: "not met", zh: "未满足" },
  reqUndetermined: { ko: "판단 불가", en: "undetermined", zh: "无法判断" },
  diagError: { ko: "오류", en: "error", zh: "错误" },
  diagWarning: { ko: "경고", en: "warning", zh: "警告" },
  verdictGood: { ko: "좋음", en: "good", zh: "很好" },
  verdictSuggestion: { ko: "제안", en: "suggestion", zh: "建议" },

  // ---------- format: exercise ----------
  hintLabel: { ko: "**힌트 {level}** ({kind})", en: "**Hint {level}** ({kind})", zh: "**提示 {level}**（{kind}）" },
  exerciseMeta: {
    ko: "- 문제 ID: `{id}`\n- 유형: {kind}{challenge} · 기술: {skill} · 난이도: {difficulty} · 예상 {minutes}분",
    en: "- Exercise ID: `{id}`\n- Type: {kind}{challenge} · Skill: {skill} · Difficulty: {difficulty} · About {minutes} min",
    zh: "- 题目 ID：`{id}`\n- 类型：{kind}{challenge} · 能力：{skill} · 难度：{difficulty} · 预计 {minutes} 分钟",
  },
  challengeSuffix: { ko: " (도전 과제)", en: " (challenge)", zh: "（挑战题）" },
  problemHeading: { ko: "### 문제", en: "### Problem", zh: "### 题目" },
  readCodeHeading: { ko: "### 읽을 코드", en: "### Code to read", zh: "### 阅读代码" },
  predictHow: {
    ko: "답은 submit_solution의 code에 결과 값만 적어 제출합니다.",
    en: "To answer, submit only the resulting value as `code` in submit_solution.",
    zh: "作答时，只需把结果值作为 submit_solution 的 code 提交。",
  },
  starterHeading: { ko: "### 시작 코드 ({path})", en: "### Starter code ({path})", zh: "### 初始代码（{path}）" },
  starterEmpty: { ko: "(비어 있음)", en: "(empty)", zh: "（空）" },
  publicTestsHeading: { ko: "### 공개 테스트", en: "### Public tests", zh: "### 公开测试" },
  rubricHeading: { ko: "### 코드 품질 기준", en: "### Code quality criteria", zh: "### 代码质量标准" },
  hintsSummary: {
    ko: "### 힌트\n총 {total}단계 중 {revealed}단계 공개됨.",
    en: "### Hints\n{revealed} of {total} levels revealed.",
    zh: "### 提示\n共 {total} 级，已查看 {revealed} 级。",
  },
  conceptNoteHeading: { ko: "### 개념 노트: {title}", en: "### Coding concept note: {title}", zh: "### 编程概念笔记：{title}" },
  theoryHeading: { ko: "### 이론: {title}", en: "### Theory note: {title}", zh: "### 理论笔记：{title}" },
  conceptNoteItem: { ko: "- 개념: {title}", en: "- Concept: {title}", zh: "- 概念：{title}" },
  theoryItem: { ko: "- 이론: {title}", en: "- Theory: {title}", zh: "- 理论：{title}" },
  notesHeading: { ko: "### 참고 노트", en: "### Notes", zh: "### 参考笔记" },
  notesHow: {
    ko: "(전문: get_exercise에 include_notes=true, 또는 리소스 {concepts} / {theory})",
    en: "(Full text: get_exercise with include_notes=true, or the resources {concepts} / {theory})",
    zh: "（全文：get_exercise 加 include_notes=true，或资源 {concepts} / {theory}）",
  },
  sessionPlan: {
    ko: "세션 `{id}` ({minutes}분 목표, {count}문제)",
    en: "Session `{id}` ({minutes}-minute goal, {count} exercises)",
    zh: "训练回合 `{id}`（目标 {minutes} 分钟，{count} 道题）",
  },

  // ---------- format: results ----------
  hiddenTestSuffix: { ko: " (숨김 테스트)", en: " (hidden test)", zh: "（隐藏测试）" },
  testMessage: { ko: "  메시지: {message}", en: "  Message: {message}", zh: "  信息：{message}" },
  testCode: { ko: "  테스트 코드:", en: "  Test code:", zh: "  测试代码：" },
  resultLine: { ko: "결과: {outcome}", en: "Result: {outcome}", zh: "结果：{outcome}" },
  testsPassedCount: { ko: " (테스트 {passed}/{total} 통과)", en: " ({passed}/{total} tests passed)", zh: "（测试 {passed}/{total} 通过）" },
  rejectionReasons: { ko: "거부 사유:", en: "Rejected because:", zh: "未通过原因：" },
  compileDiagnostics: { ko: "컴파일 진단:", en: "Compiler diagnostics:", zh: "编译诊断：" },
  testsHeading: { ko: "테스트:", en: "Tests:", zh: "测试：" },
  trialRunHeading: {
    ko: "## 실행 결과 (공개 테스트만, 기록되지 않음)",
    en: "## Run result (public tests only, not recorded)",
    zh: "## 运行结果（仅公开测试，不记录）",
  },
  trialRunPassed: {
    ko: "공개 테스트를 모두 통과했습니다. 준비되면 submit_solution으로 제출하세요 (숨김 테스트 포함 채점).",
    en: "All public tests passed. When ready, submit with submit_solution (graded with hidden tests too).",
    zh: "公开测试全部通过。准备好后用 submit_solution 提交（评测包含隐藏测试）。",
  },
  ratingNone: {
    ko: "레이팅 변화: 없음 (재제출, 많은 도움 사용, 또는 시스템 오류로 레이팅에 반영되지 않았습니다)",
    en: "Rating change: none (not rated because of a resubmission, heavy help, or a system error)",
    zh: "评分变化：无（因重新提交、使用较多帮助或系统错误而未计入评分）",
  },
  ratingChange: {
    ko: "레이팅 변화: {skill} {before} → {after} ({delta}){provisional}",
    en: "Rating change: {skill} {before} → {after} ({delta}){provisional}",
    zh: "评分变化：{skill} {before} → {after}（{delta}）{provisional}",
  },
  provisionalSuffix: { ko: " · 잠정치", en: " · provisional", zh: " · 暂定" },
  requirementsHeading: { ko: "요구사항:", en: "Requirements:", zh: "需求：" },
  performanceLine: { ko: "성능: {verdict}{ratio}", en: "Performance: {verdict}{ratio}", zh: "性能：{verdict}{ratio}" },
  performanceOk: { ko: "기준 충족", en: "meets the target", zh: "达到要求" },
  performanceSlow: { ko: "기준 미달", en: "below the target", zh: "未达要求" },
  performanceRatio: { ko: " (기준 대비 {ratio}배)", en: " ({ratio}× the baseline)", zh: "（基准的 {ratio} 倍）" },
  rubricFlagged: {
    ko: "코드 품질 지적 (정답 여부와 무관):",
    en: "Code quality issues (independent of correctness):",
    zh: "代码质量问题（与是否正确无关）：",
  },
  submissionHeading: {
    ko: "## 제출 결과 (`{id}`, {attempt}번째 시도)",
    en: "## Submission result (`{id}`, attempt #{attempt})",
    zh: "## 提交结果（`{id}`，第 {attempt} 次尝试）",
  },
  stillGrading: {
    ko: "아직 채점 중입니다. 잠시 후 get_feedback으로 확인하세요.",
    en: "Still grading. Check again shortly with get_feedback.",
    zh: "仍在评测中。请稍后用 get_feedback 查看。",
  },
  feedbackCall: { ko: "코치 피드백: get_feedback {args}", en: "Coach feedback: get_feedback {args}", zh: "教练反馈：get_feedback {args}" },

  // ---------- format: feedback, explanation, progress ----------
  feedbackHeading: { ko: "## 코치 피드백", en: "## Coach feedback", zh: "## 教练反馈" },
  ruleBasedSuffix: { ko: " (규칙 기반)", en: " (rule-based)", zh: "（基于规则）" },
  evidenceHeading: { ko: "근거:", en: "Evidence:", zh: "依据：" },
  lineRef: { ko: " ({line}행)", en: " (line {line})", zh: "（第 {line} 行）" },
  testRef: { ko: " [테스트 {id}]", en: " [test {id}]", zh: " [测试 {id}]" },
  prioritiesHeading: { ko: "우선순위:", en: "Priorities:", zh: "优先事项：" },
  nextAction: { ko: "다음 행동: {action}", en: "Next step: {action}", zh: "下一步：{action}" },
  rubricNotesHeading: { ko: "코드 품질 메모:", en: "Code quality notes:", zh: "代码质量备注：" },
  explanationHeading: { ko: "## 해설 (공개됨)", en: "## Explanation (revealed)", zh: "## 讲解（已公开）" },
  explanationWarning: {
    ko: "주의: 해설을 본 문제는 레이팅에 반영되지 않으며, 숙달 여부는 이후 새로운 문제에서 다시 확인됩니다.",
    en: "Note: an exercise whose explanation was viewed is not rated; mastery will be checked again on a new exercise.",
    zh: "注意：查看过讲解的题目不计入评分，掌握程度会在之后的新题中重新确认。",
  },
  referenceSolution: { ko: "### 참고 풀이", en: "### Reference solution", zh: "### 参考解法" },
  progressHeading: { ko: "## 학습 현황", en: "## Progress", zh: "## 学习进度" },
  overallRating: { ko: "종합 레이팅: {rating}{provisional}", en: "Overall rating: {rating}{provisional}", zh: "综合评分：{rating}{provisional}" },
  overallNone: {
    ko: "종합 레이팅: 아직 없음 (채점된 첫 시도가 쌓이면 계산됩니다)",
    en: "Overall rating: none yet (calculated once rated first attempts add up)",
    zh: "综合评分：暂无（积累已评测的首次尝试后计算）",
  },
  provisionalParen: { ko: " (잠정치)", en: " (provisional)", zh: "（暂定）" },
  skillRatingsHeading: { ko: "기술별 레이팅:", en: "Ratings by skill:", zh: "各能力评分：" },
  skillRatingRow: {
    ko: "- {skill}: {rating} ±{deviation} (채점 {count}회{provisional})",
    en: "- {skill}: {rating} ±{deviation} ({count} rated{provisional})",
    zh: "- {skill}：{rating} ±{deviation}（已评测 {count} 次{provisional}）",
  },
  provisionalComma: { ko: ", 잠정치", en: ", provisional", zh: "，暂定" },
  reviewsHeading: { ko: "복습 예정:", en: "Reviews due:", zh: "待复习：" },
  mistakesHeading: { ko: "반복되는 실수:", en: "Recurring mistakes:", zh: "反复出现的错误：" },
  mistakeRow: { ko: "- {tag} ({count}회)", en: "- {tag} ({count}×)", zh: "- {tag}（{count} 次）" },
  recommendation: {
    ko: "추천 문제: `{id}` [{kind}] · {reason} · 예상 성공률 {success}",
    en: "Recommended exercise: `{id}` [{kind}] · {reason} · expected success {success}",
    zh: "推荐题目：`{id}` [{kind}] · {reason} · 预计成功率 {success}",
  },
} as const satisfies Record<string, LocalizedText>;

export type MessageId = keyof typeof MESSAGES;
export type MessageParams = Readonly<Record<string, string | number>>;

/** Renders a catalog message in `locale`, falling back to Korean. */
export function msg(locale: Locale, id: MessageId, params?: MessageParams): string {
  return formatMessage(pickLocale(MESSAGES[id], locale), params);
}

/** A translator bound to one locale. */
export type Translate = (id: MessageId, params?: MessageParams) => string;

export function translator(locale: Locale): Translate {
  return (id, params) => msg(locale, id, params);
}
