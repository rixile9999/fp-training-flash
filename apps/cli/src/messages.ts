/**
 * The CLI's message catalog (ko source, en, zh) and locale helpers.
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

export const MESSAGES = {
  // ---------- usage ----------
  usage: {
    ko: `사용법: fp <명령> [옵션]

  login <이름>              개발용 로그인 (토큰을 설정 파일에 저장)
  whoami                    현재 사용자
  lang [ko|en|zh]           표시 언어 확인 또는 변경 (계정에도 저장)
  start [--minutes 15] [--focus <기술>]
                            세션 시작 후 첫 문제를 ./fp-work/ 에 생성
  next | current [--force]  현재 문제를 ./fp-work/<family>-<variant>/ 에 생성
  run [dir]                 공개 테스트 실행 (기록되지 않음)
  submit [dir]              제출 (숨김 테스트 포함 채점, 레이팅 변화 표시)
  feedback [제출ID|last]    코치 피드백
  hint [단계] [--dir d]     힌트 공개 (생략 시 다음 단계)
  explain [--yes] [--dir d] 해설 공개 (레이팅 미반영, --yes 필요)
  progress                  기술별 레이팅과 복습 일정
  skip                      현재 문제 건너뛰기 후 다음 문제 생성
  token issue <라벨>        MCP 등에 쓸 토큰 발급

Gleam 기초 코스:
  course                    단원별 진행 상황과 다음 단계
  lesson [<단원>/<레슨>|next]
                            레슨 보기 (설명과 번호 붙은 연습)
  answer <단원>/<레슨> <연습 ID|번호> <선택 번호|show>
                            연습에 답하기 (show: 정답 보기, 벌점 없음)
  lesson-done <단원>/<레슨> 레슨 완료 표시
  checkpoint <단원>         단원 체크포인트 (터미널에서는 한 문항씩 대화형)
  placement                 배치 테스트 (아는 단원 건너뛰기)
    --json                  문항을 JSON으로 출력 (대화형 대신)
    --answers <itemId>=<index>,... [--quiz <quizId>]
                            답 제출 (index는 0부터, 비우면 건너뜀)

공통 옵션: --json (기계용 JSON 출력), --lang ko|en|zh (이번 실행의 표시 언어), --help
환경 변수: FP_API_URL, FP_TOKEN, FP_LANG, FP_CONFIG_DIR (기본 ~/.config/fp)`,
    en: `Usage: fp <command> [options]

  login <name>              dev login (saves the token in the config file)
  whoami                    current user
  lang [ko|en|zh]           show or change the display language (also saved to your account)
  start [--minutes 15] [--focus <skill>]
                            start a session and write the first exercise to ./fp-work/
  next | current [--force]  write the current exercise to ./fp-work/<family>-<variant>/
  run [dir]                 run the public tests (not recorded)
  submit [dir]              submit (graded with hidden tests, shows the rating change)
  feedback [submissionId|last]
                            coach feedback
  hint [level] [--dir d]    reveal a hint (next level if omitted)
  explain [--yes] [--dir d] reveal the explanation (unrated, needs --yes)
  progress                  ratings per skill and review schedule
  skip                      skip the current exercise and write the next one
  token issue <label>       issue a token for MCP and other clients

Gleam basics course:
  course                    units with your progress and the next step
  lesson [<unit>/<lesson>|next]
                            show a lesson (text and numbered exercises)
  answer <unit>/<lesson> <exercise id|number> <choice number|show>
                            answer an exercise (show: see the answer, no penalty)
  lesson-done <unit>/<lesson>
                            mark a lesson as done
  checkpoint <unit>         unit checkpoint (one item at a time in a terminal)
  placement                 placement test (skip the units you know)
    --json                  print the items as JSON (instead of asking)
    --answers <itemId>=<index>,... [--quiz <quizId>]
                            submit answers (indexes start at 0, empty = skip)

Common options: --json (machine-readable JSON), --lang ko|en|zh (display language for this run), --help
Environment: FP_API_URL, FP_TOKEN, FP_LANG, FP_CONFIG_DIR (default ~/.config/fp)`,
    zh: `用法：fp <命令> [选项]

  login <名字>              开发用登录（令牌保存到配置文件）
  whoami                    当前用户
  lang [ko|en|zh]           查看或更改显示语言（同时保存到账户）
  start [--minutes 15] [--focus <能力>]
                            开始训练回合，并把第一道题写入 ./fp-work/
  next | current [--force]  把当前题目写入 ./fp-work/<family>-<variant>/
  run [dir]                 运行公开测试（不记录）
  submit [dir]              提交（包含隐藏测试的评测，显示评分变化）
  feedback [提交ID|last]    教练反馈
  hint [级别] [--dir d]     查看提示（省略时为下一级）
  explain [--yes] [--dir d] 查看讲解（不计入评分，需要 --yes）
  progress                  各能力的评分与复习计划
  skip                      跳过当前题目并写入下一道题
  token issue <标签>        签发供 MCP 等使用的令牌

Gleam 基础课程：
  course                    各单元的进度与下一步
  lesson [<单元>/<课>|next] 查看一课（讲解与带序号的练习）
  answer <单元>/<课> <练习 ID|序号> <选项序号|show>
                            回答练习（show：查看答案，不扣分）
  lesson-done <单元>/<课>   标记这一课已完成
  checkpoint <单元>         单元测验（在终端中逐题作答）
  placement                 分级测试（跳过已掌握的单元）
    --json                  以 JSON 输出题目（不逐题提问）
    --answers <itemId>=<index>,... [--quiz <quizId>]
                            提交答案（index 从 0 开始，留空表示跳过）

通用选项：--json（机器可读的 JSON 输出）、--lang ko|en|zh（本次运行的显示语言）、--help
环境变量：FP_API_URL、FP_TOKEN、FP_LANG、FP_CONFIG_DIR（默认 ~/.config/fp）`,
  },
  unknownCommand: { ko: "알 수 없는 명령: {command}", en: "Unknown command: {command}", zh: "未知命令：{command}" },
  invalidLangFlag: {
    ko: "--lang은 ko, en, zh 중 하나여야 합니다: {value}",
    en: "--lang must be one of ko, en, zh: {value}",
    zh: "--lang 必须是 ko、en、zh 之一：{value}",
  },

  // ---------- errors ----------
  errUnauthorized: {
    ko: "인증에 실패했습니다. `fp login <이름>`으로 다시 로그인하세요.",
    en: "Authentication failed. Log in again with `fp login <name>`.",
    zh: "认证失败。请用 `fp login <名字>` 重新登录。",
  },
  errNotFound: { ko: "찾을 수 없습니다: {message}", en: "Not found: {message}", zh: "找不到：{message}" },
  errInvalidInput: { ko: "입력이 올바르지 않습니다: {message}", en: "Invalid input: {message}", zh: "输入无效：{message}" },
  errConflict: { ko: "현재 상태와 충돌합니다: {message}", en: "Conflicts with the current state: {message}", zh: "与当前状态冲突：{message}" },
  errRateLimited: {
    ko: "요청이 너무 많습니다. 잠시 후 다시 시도하세요.",
    en: "Too many requests. Try again in a moment.",
    zh: "请求过多，请稍后再试。",
  },
  errServer: {
    ko: "서버 오류 (HTTP {status}, {code}): {message}",
    en: "Server error (HTTP {status}, {code}): {message}",
    zh: "服务器错误（HTTP {status}，{code}）：{message}",
  },
  errConnect: {
    ko: "API 서버에 연결할 수 없습니다 ({message}). 서버 실행 여부와 FP_API_URL을 확인하세요.",
    en: "Cannot reach the API server ({message}). Check that it is running and that FP_API_URL is correct.",
    zh: "无法连接 API 服务器（{message}）。请确认服务器正在运行，且 FP_API_URL 正确。",
  },
  errConfigJson: {
    ko: "설정 파일을 읽을 수 없습니다 (JSON 오류): {path}",
    en: "Cannot read the config file (invalid JSON): {path}",
    zh: "无法读取配置文件（JSON 错误）：{path}",
  },
  errInvalidPath: { ko: "잘못된 파일 경로입니다: {path}", en: "Invalid file path: {path}", zh: "无效的文件路径：{path}" },
  errCorruptMeta: {
    ko: "문제 메타데이터가 손상되었습니다: {path}. `fp next --force`로 다시 생성하세요.",
    en: "Exercise metadata is corrupted: {path}. Recreate it with `fp next --force`.",
    zh: "题目元数据已损坏：{path}。请用 `fp next --force` 重新生成。",
  },
  errLearnerFileMissing: { ko: "학습자 파일이 없습니다: {path}", en: "Your solution file is missing: {path}", zh: "缺少你的作答文件：{path}" },
  loginRequired: {
    ko: "로그인이 필요합니다. `fp login <이름>`을 먼저 실행하세요.",
    en: "You need to log in. Run `fp login <name>` first.",
    zh: "需要先登录。请先运行 `fp login <名字>`。",
  },
  projectNotFound: {
    ko: "문제 디렉터리를 찾을 수 없습니다 ({where}에 {meta} 없음). `fp next`로 문제를 먼저 받으세요.",
    en: "No exercise directory found (no {meta} in {where}). Get an exercise first with `fp next`.",
    zh: "找不到题目目录（{where} 中没有 {meta}）。请先用 `fp next` 获取题目。",
  },
  noActiveSession: {
    ko: "진행 중인 세션이 없습니다. `fp start`로 시작하세요.",
    en: "No active session. Start one with `fp start`.",
    zh: "没有进行中的训练回合。请用 `fp start` 开始。",
  },

  // ---------- commands ----------
  loginUsage: { ko: "사용법: fp login <이름>", en: "Usage: fp login <name>", zh: "用法：fp login <名字>" },
  loggedIn: {
    ko: "{name}(으)로 로그인했습니다. 설정: {path}",
    en: "Logged in as {name}. Config: {path}",
    zh: "已以 {name} 身份登录。配置：{path}",
  },
  minutesInvalid: { ko: "--minutes는 양의 정수여야 합니다.", en: "--minutes must be a positive integer.", zh: "--minutes 必须是正整数。" },
  sessionStarted: { ko: "새 세션을 시작했습니다.", en: "Started a new session.", zh: "已开始新的训练回合。" },
  sessionActive: { ko: "진행 중인 세션입니다.", en: "Your active session:", zh: "进行中的训练回合：" },
  itemSkipped: { ko: "현재 문제를 건너뛰었습니다.", en: "Skipped the current exercise.", zh: "已跳过当前题目。" },
  sessionDone: {
    ko: "세션의 모든 문제를 마쳤습니다. `fp progress`로 결과를 확인하세요.",
    en: "You finished every exercise in this session. See your results with `fp progress`.",
    zh: "本训练回合的题目已全部完成。用 `fp progress` 查看结果。",
  },
  currentExercise: { ko: "현재 문제: {title} ({id})", en: "Current exercise: {title} ({id})", zh: "当前题目：{title}（{id}）" },
  itemReason: { ko: "  이유: {reason}", en: "  Why: {reason}", zh: "  原因：{reason}" },
  itemDir: { ko: "  디렉터리: {path}", en: "  Directory: {path}", zh: "  目录：{path}" },
  itemPrompt: { ko: "  문제 설명: {path}", en: "  Problem: {path}", zh: "  题目说明：{path}" },
  itemLearnerFile: { ko: "  작성할 파일: {path}", en: "  Edit this file: {path}", zh: "  需要编写的文件：{path}" },
  itemKept: {
    ko: "  유지됨: {path} (수정된 파일이라 덮어쓰지 않았습니다. 시작 코드로 되돌리려면 --force)",
    en: "  Kept: {path} (you edited it, so it was not overwritten; use --force to reset to the starter code)",
    zh: "  已保留：{path}（文件已被修改，未覆盖；要恢复初始代码请加 --force）",
  },
  itemNextSteps: {
    ko: "코드를 작성한 뒤 `fp run`으로 확인하고 `fp submit`으로 제출하세요.",
    en: "Write your code, check it with `fp run`, then submit with `fp submit`.",
    zh: "写好代码后，用 `fp run` 检查，再用 `fp submit` 提交。",
  },
  nextExercise: { ko: "다음 문제: `fp next`", en: "Next exercise: `fp next`", zh: "下一题：`fp next`" },
  noRecentSubmission: {
    ko: "최근 제출이 없습니다. 제출 ID를 지정하세요: fp feedback <제출ID>",
    en: "No recent submission. Pass a submission id: fp feedback <submissionId>",
    zh: "没有最近的提交。请指定提交 ID：fp feedback <提交ID>",
  },
  hintLevelInvalid: { ko: "힌트 단계는 1-5 사이의 정수입니다.", en: "The hint level must be an integer from 1 to 5.", zh: "提示级别必须是 1–5 之间的整数。" },
  allHintsRevealed: { ko: "모든 힌트를 이미 공개했습니다.", en: "You have already revealed every hint.", zh: "所有提示都已查看过。" },
  hintUnratedWarning: {
    ko: "참고: 힌트 3단계 이상을 사용해 이 문제의 제출은 레이팅에 반영되지 않습니다.",
    en: "Note: you used a level 3+ hint, so submissions for this exercise will not be rated.",
    zh: "注意：你使用了第 3 级及以上的提示，本题的提交将不计入评分。",
  },
  explainConfirm: {
    ko: "해설을 보면 이 문제는 레이팅에 반영되지 않고, 숙달 여부는 새 문제에서 다시 확인됩니다.\n먼저 `fp hint`를 권합니다. 그래도 보려면 `fp explain --yes`를 실행하세요.",
    en: "If you view the explanation, this exercise will not be rated, and your mastery will be checked again on a new exercise.\nTry `fp hint` first. To view it anyway, run `fp explain --yes`.",
    zh: "查看讲解后，本题将不计入评分，掌握程度会在新题中重新确认。\n建议先用 `fp hint`。如仍要查看，请运行 `fp explain --yes`。",
  },
  tokenUsage: { ko: "사용법: fp token issue <라벨>", en: "Usage: fp token issue <label>", zh: "用法：fp token issue <标签>" },
  tokenIssued: {
    ko: "토큰 발급됨 ({label}, {id}). 이 값은 다시 표시되지 않습니다:\n\n{token}\n\nMCP 설정 예:\n{config}",
    en: "Token issued ({label}, {id}). It will not be shown again:\n\n{token}\n\nExample MCP config:\n{config}",
    zh: "令牌已签发（{label}，{id}）。此值不会再次显示：\n\n{token}\n\nMCP 配置示例：\n{config}",
  },

  // ---------- lang ----------
  langUsage: { ko: "사용법: fp lang [ko|en|zh]", en: "Usage: fp lang [ko|en|zh]", zh: "用法：fp lang [ko|en|zh]" },
  langInvalid: {
    ko: "지원하지 않는 언어입니다: {value} (ko, en, zh 중 하나)",
    en: "Unsupported language: {value} (use ko, en or zh)",
    zh: "不支持的语言：{value}（可选 ko、en、zh）",
  },
  langCurrent: { ko: "표시 언어: {name} ({locale}) · 출처: {source}", en: "Display language: {name} ({locale}) · from: {source}", zh: "显示语言：{name}（{locale}）· 来源：{source}" },
  langSet: {
    ko: "표시 언어를 {name}({locale})(으)로 바꿨습니다. 문제, 힌트, 피드백도 이 언어로 받습니다 (번역이 없으면 한국어).",
    en: "Display language set to {name} ({locale}). Exercises, hints and feedback will also come in this language (Korean when no translation exists).",
    zh: "显示语言已设为{name}（{locale}）。题目、提示和反馈也将使用该语言（没有译文时显示韩语）。",
  },
  langSavedLocally: {
    ko: "표시 언어를 {name}({locale})(으)로 이 컴퓨터에 저장했습니다. 다음 `fp login` 때 계정에도 적용됩니다.",
    en: "Saved {name} ({locale}) as the display language on this computer. It will be applied to your account at the next `fp login`.",
    zh: "已在本机将显示语言保存为{name}（{locale}）。下次 `fp login` 时会同步到账户。",
  },
  langOverridden: {
    ko: "참고: FP_LANG={value} 환경 변수가 이 설정보다 우선합니다.",
    en: "Note: the FP_LANG={value} environment variable takes precedence over this setting.",
    zh: "注意：环境变量 FP_LANG={value} 优先于此设置。",
  },
  sourceFlag: { ko: "--lang 옵션", en: "--lang option", zh: "--lang 选项" },
  sourceEnv: { ko: "FP_LANG 환경 변수", en: "FP_LANG environment variable", zh: "FP_LANG 环境变量" },
  sourceAccount: { ko: "계정 설정", en: "account setting", zh: "账户设置" },
  sourceConfig: { ko: "설정 파일", en: "config file", zh: "配置文件" },
  sourceSystem: { ko: "시스템 LANG", en: "system LANG", zh: "系统 LANG" },
  sourceDefault: { ko: "기본값", en: "default", zh: "默认值" },

  // ---------- format: results ----------
  outcomePassed: { ko: "통과", en: "passed", zh: "通过" },
  outcomeFailedTests: { ko: "테스트 실패", en: "tests failed", zh: "测试未通过" },
  outcomeTooSlow: { ko: "성능 기준 미달", en: "too slow", zh: "未达到性能要求" },
  outcomeCompileError: { ko: "컴파일 오류", en: "compile error", zh: "编译错误" },
  outcomeTimeout: { ko: "시간 초과", en: "timed out", zh: "超时" },
  outcomeRejected: { ko: "정적 검사에서 거부됨", en: "rejected by static checks", zh: "未通过静态检查" },
  outcomeSystemError: {
    ko: "시스템 오류 (학습 실패로 집계되지 않음)",
    en: "system error (not counted against you)",
    zh: "系统错误（不计为学习失败）",
  },
  kindReview: { ko: "복습", en: "review", zh: "复习" },
  kindFocus: { ko: "집중", en: "focus", zh: "专项" },
  kindVariation: { ko: "변형", en: "variation", zh: "变式" },
  kindChallenge: { ko: "도전", en: "challenge", zh: "挑战" },
  statusPending: { ko: "대기", en: "pending", zh: "待做" },
  statusInProgress: { ko: "진행 중", en: "in progress", zh: "进行中" },
  statusPassed: { ko: "통과", en: "passed", zh: "通过" },
  statusFailed: { ko: "실패", en: "failed", zh: "未通过" },
  statusSkipped: { ko: "건너뜀", en: "skipped", zh: "已跳过" },
  diagError: { ko: "오류", en: "error", zh: "错误" },
  diagWarning: { ko: "경고", en: "warning", zh: "警告" },
  hiddenSuffix: { ko: " (숨김)", en: " (hidden)", zh: "（隐藏）" },
  resultLine: { ko: "결과: {outcome}", en: "Result: {outcome}", zh: "结果：{outcome}" },
  passedCount: { ko: " ({passed}/{total} 통과)", en: " ({passed}/{total} passed)", zh: "（{passed}/{total} 通过）" },
  rejectionReasons: { ko: "거부 사유:", en: "Rejected because:", zh: "未通过原因：" },
  compileDiagnostics: { ko: "컴파일 진단:", en: "Compiler diagnostics:", zh: "编译诊断：" },
  testsHeading: { ko: "테스트:", en: "Tests:", zh: "测试：" },
  trialRunHeading: { ko: "공개 테스트 실행 (기록되지 않음)", en: "Public test run (not recorded)", zh: "运行公开测试（不记录）" },
  trialRunPassed: {
    ko: "공개 테스트를 모두 통과했습니다. `fp submit`으로 제출하세요.",
    en: "All public tests passed. Submit with `fp submit`.",
    zh: "公开测试全部通过。请用 `fp submit` 提交。",
  },
  ratingNone: {
    ko: "레이팅 변화: 없음 (재제출, 도움 사용, 또는 시스템 오류로 반영되지 않음)",
    en: "Rating change: none (not rated because of a resubmission, help used, or a system error)",
    zh: "评分变化：无（因重新提交、使用了帮助或系统错误而未计入）",
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
  rubricFlagged: { ko: "코드 품질 지적:", en: "Code quality issues:", zh: "代码质量问题：" },
  submissionHeading: { ko: "제출 {id} ({attempt}번째 시도)", en: "Submission {id} (attempt #{attempt})", zh: "提交 {id}（第 {attempt} 次尝试）" },
  stillGrading: { ko: "아직 채점 중입니다.", en: "Still grading.", zh: "仍在评测中。" },
  coachFeedbackCommand: { ko: "코치 피드백: `fp feedback`", en: "Coach feedback: `fp feedback`", zh: "教练反馈：`fp feedback`" },

  // ---------- format: feedback, hints, explanation ----------
  feedbackHeading: { ko: "코치 피드백", en: "Coach feedback", zh: "教练反馈" },
  ruleBasedSuffix: { ko: " (규칙 기반)", en: " (rule-based)", zh: "（基于规则）" },
  evidenceHeading: { ko: "근거:", en: "Evidence:", zh: "依据：" },
  lineRef: { ko: " ({line}행)", en: " (line {line})", zh: "（第 {line} 行）" },
  prioritiesHeading: { ko: "우선순위:", en: "Priorities:", zh: "优先事项：" },
  nextAction: { ko: "다음 행동: {action}", en: "Next step: {action}", zh: "下一步：{action}" },
  rubricNotesHeading: { ko: "코드 품질 메모:", en: "Code quality notes:", zh: "代码质量备注：" },
  verdictGood: { ko: "좋음", en: "good", zh: "很好" },
  verdictSuggestion: { ko: "제안", en: "suggestion", zh: "建议" },
  noHints: { ko: "공개된 힌트가 없습니다.", en: "No hints revealed.", zh: "还没有查看过的提示。" },
  hintLabel: { ko: "[힌트 {level}]", en: "[Hint {level}]", zh: "[提示 {level}]" },
  explanationHeading: {
    ko: "해설 (이 문제는 레이팅에 반영되지 않으며, 숙달 여부는 새 문제에서 다시 확인됩니다)",
    en: "Explanation (this exercise is not rated; your mastery will be checked again on a new exercise)",
    zh: "讲解（本题不计入评分，掌握程度会在新题中重新确认）",
  },
  referenceSolution: { ko: "참고 풀이:", en: "Reference solution:", zh: "参考解法：" },

  // ---------- format: session, progress ----------
  sessionHeading: { ko: "세션 {id} ({minutes}분 목표)", en: "Session {id} ({minutes}-minute goal)", zh: "训练回合 {id}（目标 {minutes} 分钟）" },
  overallRating: { ko: "종합 레이팅: {rating}{provisional}", en: "Overall rating: {rating}{provisional}", zh: "综合评分：{rating}{provisional}" },
  overallNone: { ko: "종합 레이팅: 아직 없음", en: "Overall rating: none yet", zh: "综合评分：暂无" },
  provisionalParen: { ko: " (잠정치)", en: " (provisional)", zh: "（暂定）" },
  skillRatingsHeading: { ko: "기술별 레이팅:", en: "Ratings by skill:", zh: "各能力评分：" },
  skillRatingRow: {
    ko: "  {skill}: {rating} ±{deviation} (채점 {count}회{provisional})",
    en: "  {skill}: {rating} ±{deviation} ({count} rated{provisional})",
    zh: "  {skill}：{rating} ±{deviation}（已评测 {count} 次{provisional}）",
  },
  provisionalComma: { ko: ", 잠정치", en: ", provisional", zh: "，暂定" },
  reviewsHeading: { ko: "복습 예정:", en: "Reviews due:", zh: "待复习：" },
  mistakesHeading: { ko: "반복되는 실수:", en: "Recurring mistakes:", zh: "反复出现的错误：" },
  mistakeRow: { ko: "  {tag} ({count}회)", en: "  {tag} ({count}×)", zh: "  {tag}（{count} 次）" },

  // ---------- generated project files ----------
  testFileHeader: {
    ko: "// 공개 테스트만 포함되어 있습니다. 제출 시에는 숨김 테스트도 함께 채점됩니다.",
    en: "// Only the public tests are here. Submissions are also graded with hidden tests.",
    zh: "// 这里只包含公开测试。提交时还会用隐藏测试一起评测。",
  },
  promptMeta: {
    ko: "- 문제 ID: `{id}`\n- 기술: {skill} · 난이도: {difficulty} · 예상 {minutes}분",
    en: "- Exercise ID: `{id}`\n- Skill: {skill} · Difficulty: {difficulty} · About {minutes} min",
    zh: "- 题目 ID：`{id}`\n- 能力：{skill} · 难度：{difficulty} · 预计 {minutes} 分钟",
  },
  promptProblem: { ko: "## 문제", en: "## Problem", zh: "## 题目" },
  promptReadCode: { ko: "## 읽을 코드", en: "## Code to read", zh: "## 阅读代码" },
  promptAnswerHow: {
    ko: "답을 `{file}`에 적고 `fp submit`으로 제출하세요.",
    en: "Write your answer in `{file}` and submit with `fp submit`.",
    zh: "把答案写在 `{file}` 中，然后用 `fp submit` 提交。",
  },
  promptPublicTests: { ko: "## 공개 테스트", en: "## Public tests", zh: "## 公开测试" },
  promptRubric: { ko: "## 코드 품질 기준", en: "## Code quality criteria", zh: "## 代码质量标准" },
  promptRevealedHints: { ko: "## 공개된 힌트", en: "## Revealed hints", zh: "## 已查看的提示" },
  promptHintLevel: { ko: "**{level}단계**", en: "**Level {level}**", zh: "**第 {level} 级**" },
  promptConceptNote: { ko: "## 개념 노트: {title}", en: "## Coding concept note: {title}", zh: "## 编程概念笔记：{title}" },
  promptTheory: { ko: "## 이론: {title}", en: "## Theory note: {title}", zh: "## 理论笔记：{title}" },
  promptUsage: {
    ko: "## 사용법\n\n- `{file}`을(를) 수정하세요.\n- `gleam test`: 로컬에서 공개 테스트 실행 (Gleam 설치 필요)\n- `fp run`: 서버에서 공개 테스트 실행 (기록되지 않음)\n- `fp submit`: 제출 (숨김 테스트 포함 채점, 레이팅 반영)\n- `fp hint`: 다음 힌트 (총 {hints}단계, 3단계부터는 레이팅 미반영)",
    en: "## How to work\n\n- Edit `{file}`.\n- `gleam test`: run the public tests locally (needs Gleam installed)\n- `fp run`: run the public tests on the server (not recorded)\n- `fp submit`: submit (graded with hidden tests, counts toward your rating)\n- `fp hint`: next hint ({hints} levels in total; level 3 and up makes the attempt unrated)",
    zh: "## 使用方法\n\n- 修改 `{file}`。\n- `gleam test`：在本地运行公开测试（需要安装 Gleam）\n- `fp run`：在服务器上运行公开测试（不记录）\n- `fp submit`：提交（包含隐藏测试的评测，计入评分）\n- `fp hint`：下一级提示（共 {hints} 级，第 3 级起不计入评分）",
  },

  // ---------- course: commands ----------
  lessonUsage: {
    ko: "사용법: fp lesson [<단원>/<레슨>|<단원>|next]",
    en: "Usage: fp lesson [<unit>/<lesson>|<unit>|next]",
    zh: "用法：fp lesson [<单元>/<课>|<单元>|next]",
  },
  answerUsage: {
    ko: "사용법: fp answer <단원>/<레슨> <연습 ID|번호> <선택 번호|show>",
    en: "Usage: fp answer <unit>/<lesson> <exercise id|number> <choice number|show>",
    zh: "用法：fp answer <单元>/<课> <练习 ID|序号> <选项序号|show>",
  },
  lessonDoneUsage: { ko: "사용법: fp lesson-done <단원>/<레슨>", en: "Usage: fp lesson-done <unit>/<lesson>", zh: "用法：fp lesson-done <单元>/<课>" },
  checkpointUsage: {
    ko: "사용법: fp checkpoint <단원> [--json] [--answers <itemId>=<index>,...] [--quiz <quizId>]",
    en: "Usage: fp checkpoint <unit> [--json] [--answers <itemId>=<index>,...] [--quiz <quizId>]",
    zh: "用法：fp checkpoint <单元> [--json] [--answers <itemId>=<index>,...] [--quiz <quizId>]",
  },
  placementUsage: {
    ko: "사용법: fp placement [--json] [--answers <itemId>=<index>,...] [--quiz <quizId>]",
    en: "Usage: fp placement [--json] [--answers <itemId>=<index>,...] [--quiz <quizId>]",
    zh: "用法：fp placement [--json] [--answers <itemId>=<index>,...] [--quiz <quizId>]",
  },
  answerChoiceInvalid: {
    ko: "선택 번호는 1 이상의 정수이거나 show여야 합니다: {value}",
    en: "The choice must be a number from 1, or show: {value}",
    zh: "选项必须是从 1 开始的整数，或 show：{value}",
  },
  exerciseNumberInvalid: {
    ko: "이 레슨에는 연습 {n}이(가) 없습니다 (연습 {total}개).",
    en: "This lesson has no exercise {n} (it has {total}).",
    zh: "这一课没有练习 {n}（共 {total} 个练习）。",
  },
  unitNotFound: {
    ko: "단원을 찾을 수 없습니다: {unit}. `fp course`로 단원 ID를 확인하세요.",
    en: "Unit not found: {unit}. See the unit ids with `fp course`.",
    zh: "找不到单元：{unit}。请用 `fp course` 查看单元 ID。",
  },
  answersInvalid: {
    ko: "--answers 형식이 올바르지 않습니다: {value} (예: item-1=0,item-2=2; 번호는 0부터, 비우면 건너뜀)",
    en: "Invalid --answers: {value} (e.g. item-1=0,item-2=2; indexes start at 0, leave empty to skip)",
    zh: "--answers 格式无效：{value}（例如 item-1=0,item-2=2；序号从 0 开始，留空表示跳过）",
  },
  quizIdMissing: {
    ko: "제출할 퀴즈를 모릅니다. `{command}`로 먼저 문항을 받거나 --quiz <quizId>를 지정하세요.",
    en: "No quiz to submit. Get the items first with `{command}`, or pass --quiz <quizId>.",
    zh: "不知道要提交哪个测验。请先用 `{command}` 获取题目，或指定 --quiz <quizId>。",
  },
  quizAsk: {
    ko: "답 (1-{max}, 건너뛰려면 Enter): ",
    en: "Your answer (1-{max}, Enter to skip): ",
    zh: "你的答案（1-{max}，按回车跳过）：",
  },
  quizInvalidChoice: {
    ko: "1부터 {max} 사이의 번호를 입력하세요 (건너뛰려면 Enter).",
    en: "Enter a number from 1 to {max} (or Enter to skip).",
    zh: "请输入 1 到 {max} 之间的序号（按回车跳过）。",
  },
  quizAborted: {
    ko: "답을 제출하지 않고 중단했습니다. 다시 시작하면 새 문항을 받습니다.",
    en: "Stopped without submitting. Starting again gives you a new set of items.",
    zh: "已中止，未提交答案。重新开始时会拿到一组新的题目。",
  },
  quizSubmitting: { ko: "답을 제출합니다...", en: "Submitting your answers...", zh: "正在提交答案……" },

  // ---------- course: rendering ----------
  courseHeading: { ko: "Gleam 기초 코스", en: "Gleam basics course", zh: "Gleam 基础课程" },
  unitLessons: { ko: "레슨 {done}/{total}", en: "lessons {done}/{total}", zh: "课 {done}/{total}" },
  unitLocked: { ko: "선행 단원 미완료", en: "prerequisites not passed yet", zh: "先修单元未完成" },
  checkpointPassed: { ko: "체크포인트 통과", en: "checkpoint passed", zh: "单元测验已通过" },
  checkpointPassedByPlacement: {
    ko: "체크포인트 통과 (배치 테스트)",
    en: "checkpoint passed (placement test)",
    zh: "单元测验已通过（分级测试）",
  },
  checkpointBest: { ko: "체크포인트 최고 {score}", en: "checkpoint best {score}", zh: "单元测验最好成绩 {score}" },
  checkpointNotTaken: { ko: "체크포인트 미응시", en: "checkpoint not taken", zh: "单元测验未参加" },
  placementSummary: {
    ko: "배치 테스트: {score}/{total} · {band}",
    en: "Placement test: {score}/{total} · {band}",
    zh: "分级测试：{score}/{total} · {band}",
  },
  placementSuggest: {
    ko: "Gleam을 이미 안다면 `fp placement`(약 5분)로 아는 단원을 건너뛸 수 있어요.",
    en: "If you already know Gleam, take `fp placement` (about 5 minutes) to skip the units you know.",
    zh: "如果你已经会 Gleam，可以用 `fp placement`（约 5 分钟）跳过已掌握的单元。",
  },
  bandBeginner: { ko: "입문", en: "beginner", zh: "入门" },
  bandIntermediate: { ko: "중급", en: "intermediate", zh: "中级" },
  bandAdvanced: { ko: "고급", en: "advanced", zh: "高级" },
  nextLesson: { ko: "다음: `fp lesson {ref}`", en: "Next: `fp lesson {ref}`", zh: "下一步：`fp lesson {ref}`" },
  nextCheckpoint: {
    ko: "다음: 단원 체크포인트 `fp checkpoint {unit}`",
    en: "Next: the unit checkpoint `fp checkpoint {unit}`",
    zh: "下一步：单元测验 `fp checkpoint {unit}`",
  },
  courseDone: {
    ko: "기초 코스를 모두 마쳤어요! `fp start`로 훈련을 시작하세요.",
    en: "You finished the basics course! Start training with `fp start`.",
    zh: "基础课程已全部完成！用 `fp start` 开始训练吧。",
  },
  lessonCompleted: { ko: "완료", en: "completed", zh: "已完成" },
  exerciseLabel: { ko: "[연습 {n}]", en: "[Exercise {n}]", zh: "[练习 {n}]" },
  exerciseSolved: { ko: "풀었음", en: "solved", zh: "已答对" },
  lessonTypeChoice: { ko: "객관식", en: "multiple choice", zh: "选择题" },
  lessonTypePredict: { ko: "결과 예측", en: "predict the result", zh: "预测结果" },
  lessonSolvedCount: { ko: "연습 {solved}/{total} 풀었음", en: "{solved}/{total} exercises solved", zh: "已答对 {solved}/{total} 个练习" },
  lessonAnswerHow: {
    ko: "답하기: `fp answer {ref} <연습 ID|번호> <선택 번호>` (모르겠으면 선택 번호 대신 show)",
    en: "To answer: `fp answer {ref} <exercise id|number> <choice number>` (stuck? use show instead of a number)",
    zh: "作答：`fp answer {ref} <练习 ID|序号> <选项序号>`（不会的话用 show 代替序号）",
  },
  lessonDoneHow: {
    ko: "다 읽었으면: `fp lesson-done {ref}`",
    en: "When you are done: `fp lesson-done {ref}`",
    zh: "学完后：`fp lesson-done {ref}`",
  },
  lessonNextHow: { ko: "다음 레슨: `fp lesson next`", en: "Next lesson: `fp lesson next`", zh: "下一课：`fp lesson next`" },
  answerCorrect: { ko: "정답이에요!", en: "Correct!", zh: "答对了！" },
  answerWrong: { ko: "아직 아니에요.", en: "Not quite.", zh: "还不对。" },
  answerRevealed: { ko: "정답을 공개합니다.", en: "Here is the answer.", zh: "公布答案。" },
  answerCorrectChoice: { ko: "정답: {n}번", en: "Answer: choice {n}", zh: "答案：选项 {n}" },
  answerRetry: {
    ko: "벌점은 없어요. 다른 번호로 다시 답해 보세요 (모르겠으면 show).",
    en: "There is no penalty. Try another choice (or show to see the answer).",
    zh: "答错不扣分。换一个选项再试试（不会的话用 show）。",
  },
  lessonMarkedDone: {
    ko: "레슨 {ref}을(를) 완료했어요. 이 단원에서 완료한 레슨: {count}개",
    en: "Marked {ref} as done. Lessons completed in this unit: {count}",
    zh: "已完成 {ref}。本单元已完成的课：{count} 个",
  },
  checkpointHeader: {
    ko: "단원 체크포인트: {unit} · {count}문항 · 통과 기준 {threshold} (레이팅에 반영)",
    en: "Unit checkpoint: {unit} · {count} items · pass mark {threshold} (counts toward your rating)",
    zh: "单元测验：{unit} · {count} 题 · 及格线 {threshold}（计入评分）",
  },
  placementHeader: {
    ko: "배치 테스트: {count}문항 · 약 5분 (결과로 아는 단원을 건너뜁니다)",
    en: "Placement test: {count} items · about 5 minutes (the result skips units you already know)",
    zh: "分级测试：{count} 题 · 约 5 分钟（根据结果跳过已掌握的单元）",
  },
  quizIdLine: { ko: "퀴즈 ID: {id}", en: "Quiz id: {id}", zh: "测验 ID：{id}" },
  quizItemHeading: { ko: "문항 {position}/{total}", en: "Item {position}/{total}", zh: "第 {position}/{total} 题" },
  quizItemShort: { ko: "문항 {position}", en: "Item {position}", zh: "第 {position} 题" },
  quizAnswersHow: {
    ko: "답 제출: `{command} --quiz {id} --answers {example}` (index는 0부터: 1번 선택지 = 0, 비우면 건너뜀)",
    en: "Submit: `{command} --quiz {id} --answers {example}` (indexes start at 0: choice 1 = 0; leave empty to skip)",
    zh: "提交：`{command} --quiz {id} --answers {example}`（index 从 0 开始：选项 1 = 0；留空表示跳过）",
  },
  quizSkipped: { ko: "건너뜀", en: "skipped", zh: "跳过" },
  quizChosen: { ko: "선택 {chosen} · 정답 {correct}", en: "chosen {chosen} · answer {correct}", zh: "所选 {chosen} · 答案 {correct}" },
  quizRevisit: { ko: "다시 보기: `fp lesson {ref}` ({exercise})", en: "Review: `fp lesson {ref}` ({exercise})", zh: "复习：`fp lesson {ref}`（{exercise}）" },
  checkpointResult: {
    ko: "체크포인트 결과 ({unit}): {score}/{total}",
    en: "Checkpoint result ({unit}): {score}/{total}",
    zh: "单元测验结果（{unit}）：{score}/{total}",
  },
  checkpointPassedMessage: {
    ko: "통과했어요! `fp course`로 다음 단계를 확인하세요.",
    en: "Passed! See what comes next with `fp course`.",
    zh: "通过了！用 `fp course` 查看下一步。",
  },
  checkpointFailedMessage: {
    ko: "아직 통과하지 못했어요. 틀린 문항의 레슨을 복습한 뒤 `fp checkpoint {unit}`로 다시 도전하세요.",
    en: "Not passed yet. Review the lessons of the items you missed, then try again with `fp checkpoint {unit}`.",
    zh: "还没有通过。复习答错题目对应的课后，再用 `fp checkpoint {unit}` 重新挑战。",
  },
  ratingChangesHeading: { ko: "레이팅 변화:", en: "Rating changes:", zh: "评分变化：" },
  placementResult: {
    ko: "배치 테스트 결과: {score}/{total} · {band}",
    en: "Placement test result: {score}/{total} · {band}",
    zh: "分级测试结果：{score}/{total} · {band}",
  },
  placementUnitsPassed: {
    ko: "통과로 처리된 단원: {units}",
    en: "Units marked as passed: {units}",
    zh: "视为已通过的单元：{units}",
  },
  placementNoUnitsPassed: {
    ko: "건너뛸 단원은 없어요. 처음부터 차근차근 시작해요.",
    en: "No units were skipped. Let's start from the beginning.",
    zh: "没有可跳过的单元。我们从头开始吧。",
  },
  placementGoTraining: {
    ko: "기초는 충분해요. `fp start`로 핵심 트랙 훈련을 시작하세요.",
    en: "Your basics are solid. Start core-track training with `fp start`.",
    zh: "你的基础已经很扎实。用 `fp start` 开始核心路线的训练吧。",
  },
  placementGoCourse: {
    ko: "`fp course`로 이어서 학습하세요.",
    en: "Continue with `fp course`.",
    zh: "用 `fp course` 继续学习。",
  },

  // ---------- locale names ----------
  localeName_ko: { ko: "한국어", en: "Korean", zh: "韩语" },
  localeName_en: { ko: "영어", en: "English", zh: "英语" },
  localeName_zh: { ko: "중국어(간체)", en: "Simplified Chinese", zh: "简体中文" },
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

/**
 * Expected failure whose text is a catalog message. `message` is Korean (the default locale) so it reads
 * sensibly anywhere; the CLI re-renders it in the active locale.
 */
export class LocalizedError extends Error {
  readonly id: MessageId;
  readonly params: MessageParams;
  readonly exitCode: number;
  constructor(id: MessageId, params: MessageParams = {}, exitCode = 1) {
    super(msg(DEFAULT_LOCALE, id, params));
    this.name = "LocalizedError";
    this.id = id;
    this.params = params;
    this.exitCode = exitCode;
  }
  render(locale: Locale): string {
    return msg(locale, this.id, this.params);
  }
}

/** "en", "en-US", "zh_CN.UTF-8", "KO" -> a supported locale; anything else -> undefined. */
export function normalizeLocale(value: string | undefined): Locale | undefined {
  if (!value) return undefined;
  const prefix = value.trim().toLowerCase().split(/[-_.@]/)[0] ?? "";
  return isLocale(prefix) ? prefix : undefined;
}

export type LocaleSource = "flag" | "env" | "account" | "config" | "system" | "default";

export interface LocaleInputs {
  /** --lang (already validated). */
  readonly flag?: Locale | undefined;
  /** FP_LANG. */
  readonly env?: string | undefined;
  /** user.locale from /v1/me (or the login/updateMe response). */
  readonly account?: Locale | undefined;
  /** Last known account locale / `fp lang` choice cached in the config file. */
  readonly config?: Locale | undefined;
  /** LC_ALL > LC_MESSAGES > LANG. */
  readonly system?: Locale | undefined;
}

/** --lang > FP_LANG > account locale (live, else cached in config) > system LANG > ko. */
export function resolveLocale(i: LocaleInputs): { readonly locale: Locale; readonly source: LocaleSource } {
  if (i.flag) return { locale: i.flag, source: "flag" };
  const env = normalizeLocale(i.env);
  if (env) return { locale: env, source: "env" };
  if (i.account) return { locale: i.account, source: "account" };
  if (i.config) return { locale: i.config, source: "config" };
  if (i.system) return { locale: i.system, source: "system" };
  return { locale: DEFAULT_LOCALE, source: "default" };
}

export interface SystemLocaleEnv {
  readonly LC_ALL?: string | undefined;
  readonly LC_MESSAGES?: string | undefined;
  readonly LANG?: string | undefined;
}

/** POSIX precedence: the first non-empty of LC_ALL, LC_MESSAGES, LANG decides ("C"/"POSIX" -> none). */
export function systemLocale(env: SystemLocaleEnv): Locale | undefined {
  const raw = env.LC_ALL || env.LC_MESSAGES || env.LANG;
  return normalizeLocale(raw);
}

const SOURCE_MESSAGE: Record<LocaleSource, MessageId> = {
  flag: "sourceFlag",
  env: "sourceEnv",
  account: "sourceAccount",
  config: "sourceConfig",
  system: "sourceSystem",
  default: "sourceDefault",
};

export function sourceLabel(locale: Locale, source: LocaleSource): string {
  return msg(locale, SOURCE_MESSAGE[source]);
}

export function localeName(display: Locale, of: Locale): string {
  return msg(display, `localeName_${of}`);
}
