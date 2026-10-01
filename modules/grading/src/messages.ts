/**
 * Every learner-facing text produced by grading, in ko (source) / en / zh. Keyed by stable ids; `{name}`
 * placeholders are filled by formatMessage. A missing en/zh entry falls back to ko (pickLocale).
 * Texts that come from content (test names, requirement descriptions, rubric messages) are localized by the
 * catalog (ContentCatalog.getGradingSpec(id, locale)), not here. Runner system_error messages are English
 * operator diagnostics; learners see `eval.systemError` in their locale followed by that diagnostic.
 * Terminology and tone: docs/i18n-glossary.md.
 */
import { DEFAULT_LOCALE, formatMessage, pickLocale } from "@fp/kernel";
import type { Locale, LocalizedText } from "@fp/kernel";

export const MESSAGES = {
  // ---------- static checks (src/grading/static-checks.ts) ----------
  "static.fileReason": { ko: "{file}: {reason}", en: "{file}: {reason}", zh: "{file}：{reason}" },
  "static.noCode": { ko: "제출된 코드가 없습니다.", en: "No code was submitted.", zh: "没有提交任何代码。" },
  "static.notGleam": {
    ko: "Gleam 소스 파일(.gleam)만 제출할 수 있습니다.",
    en: "You can only submit Gleam source files (.gleam).",
    zh: "只能提交 Gleam 源文件（.gleam）。",
  },
  "static.tooLarge": {
    ko: "코드가 너무 깁니다 (최대 {maxKb}KB).",
    en: "The code is too long (max {maxKb} KB).",
    zh: "代码太长（最多 {maxKb} KB）。",
  },
  "static.nul": { ko: "코드에 NUL 문자가 있습니다.", en: "The code contains a NUL character.", zh: "代码中包含 NUL 字符。" },
  "static.external": {
    ko: "@external(외부 함수 연결)은 사용할 수 없습니다. Gleam 표준 라이브러리만 사용하세요.",
    en: "@external (foreign function binding) is not allowed. Use only the Gleam standard library.",
    zh: "不能使用 @external（外部函数绑定）。请只使用 Gleam 标准库。",
  },
  "static.forbiddenImport": {
    ko: "{module} 모듈({why})은 import할 수 없습니다.",
    en: "You can't import the {module} module ({why}).",
    zh: "不能 import {module} 模块（{why}）。",
  },
  "static.why.graderInternal": { ko: "채점기 내부 모듈", en: "grader-internal module", zh: "评测器内部模块" },
  "static.why.testRunner": { ko: "테스트 실행기 모듈", en: "test runner module", zh: "测试运行器模块" },
  "static.why.testModule": { ko: "테스트 모듈", en: "test module", zh: "测试模块" },

  // ---------- rubric checks (src/grading/rubric.ts) ----------
  "rubric.functionsTooLong": {
    ko: "함수가 {max}줄을 넘습니다: {functions}",
    en: "Functions longer than {max} lines: {functions}",
    zh: "以下函数超过 {max} 行：{functions}",
  },
  "rubric.functionLines": { ko: "{name}({lines}줄)", en: "{name} ({lines} lines)", zh: "{name}（{lines} 行）" },
  "rubric.listSeparator": { ko: ", ", en: ", ", zh: "、" },
  "rubric.invalidPattern": {
    ko: "잘못된 검사 패턴: {pattern}",
    en: "Invalid check pattern: {pattern}",
    zh: "无效的检查模式：{pattern}",
  },

  // ---------- predict exercises (src/grading/interpret.ts) ----------
  "predict.testName": { ko: "예측한 결과", en: "Your predicted result", zh: "你预测的结果" },
  "predict.wrong": {
    ko: "예상한 값이 실제 결과와 다릅니다.",
    en: "Your predicted value differs from the actual result.",
    zh: "你预测的值与实际结果不同。",
  },

  // ---------- evaluation-level messages ----------
  "eval.systemError": {
    ko: "채점 환경 오류로 결과를 얻지 못했습니다. 이 제출은 시도 횟수에 포함되지 않아요. 잠시 후 다시 제출해 주세요.",
    en: "A problem with the grading environment prevented a result. This submission does not count as an attempt. Please submit again in a moment.",
    zh: "评测环境出错，未能得到结果。这次提交不计入尝试次数。请稍后重新提交。",
  },
  "eval.interrupted": {
    ko: "채점 중 서버가 중단되어 결과를 얻지 못했습니다. 다시 제출해 주세요.",
    en: "The server stopped during grading, so there is no result. Please submit again.",
    zh: "评测过程中服务器中断，未能得到结果。请重新提交。",
  },

  // ---------- test failure descriptions (rendered from structured harness output, src/grading/failure.ts) ----------
  "failure.budgetExhausted": {
    ko: "전체 실행 시간 제한({limitMs} ms)을 이미 다 써서 실행하지 않았습니다.",
    en: "Not run: the total time limit ({limitMs} ms) was already used up.",
    zh: "未运行：总运行时间限制（{limitMs} ms）已经用完。",
  },
  "failure.timeout": {
    ko: "시간 제한({limitMs} ms)을 넘었습니다. 무한 루프나 너무 느린 계산이 있는지 확인하세요.",
    en: "Exceeded the time limit ({limitMs} ms). Check for an infinite loop or a computation that is too slow.",
    zh: "超出时间限制（{limitMs} ms）。请检查是否有无限循环或过慢的计算。",
  },
  "failure.memory": {
    ko: "메모리 한도({limitMb} MB)를 넘어 실행이 중단되었습니다.",
    en: "Stopped: the memory limit ({limitMb} MB) was exceeded.",
    zh: "超出内存限制（{limitMb} MB），运行已中止。",
  },
  "failure.crashed": {
    ko: "테스트 프로세스가 비정상 종료되었습니다: {reason}",
    en: "The test process exited abnormally: {reason}",
    zh: "测试进程异常退出：{reason}",
  },
  "failure.testNotFound": {
    ko: "테스트 함수 {name}를 찾을 수 없습니다.",
    en: "Test function {name} was not found.",
    zh: "找不到测试函数 {name}。",
  },
  "failure.moduleNotFound": {
    ko: "테스트 모듈 {module}를 찾을 수 없습니다.",
    en: "Test module {module} was not found.",
    zh: "找不到测试模块 {module}。",
  },
  "failure.badTestName": { ko: "잘못된 테스트 이름: {name}", en: "Invalid test name: {name}", zh: "无效的测试名称：{name}" },
  "failure.assert": { ko: "assert 실패: {detail}{where}", en: "assert failed: {detail}{where}", zh: "assert 失败：{detail}{where}" },
  "failure.assert.binaryOperator": {
    ko: "`{operator}` 비교가 거짓입니다.\n  왼쪽 값: {left}\n  오른쪽 값: {right}",
    en: "The `{operator}` comparison is false.\n  left: {left}\n  right: {right}",
    zh: "`{operator}` 比较的结果为假。\n  左边的值：{left}\n  右边的值：{right}",
  },
  "failure.assert.functionCall": {
    ko: "함수 호출 결과가 False입니다. 인자: {arguments}",
    en: "The function call returned False. Arguments: {arguments}",
    zh: "函数调用的结果为 False。参数：{arguments}",
  },
  "failure.assert.expression": { ko: "식의 값이 False입니다.", en: "The expression is False.", zh: "表达式的值为 False。" },
  "failure.unevaluated": { ko: "(평가되지 않음)", en: "(not evaluated)", zh: "（未求值）" },
  "failure.shouldEqual": {
    ko: "값이 기대와 다릅니다.\n  기대값: {expected}\n  실제값: {actual}{where}",
    en: "The value is not what was expected.\n  expected: {expected}\n  actual: {actual}{where}",
    zh: "值与预期不符。\n  预期值：{expected}\n  实际值：{actual}{where}",
  },
  "failure.shouldNotEqual": {
    ko: "두 값이 달라야 하는데 같습니다: {actual}{where}",
    en: "The two values should differ, but they are equal: {actual}{where}",
    zh: "两个值应当不同，但实际相同：{actual}{where}",
  },
  "failure.todo": {
    ko: "아직 구현되지 않은 코드(todo)에 도달했습니다: {message}{where}",
    en: "Reached code that is not implemented yet (todo): {message}{where}",
    zh: "执行到了尚未实现的代码（todo）：{message}{where}",
  },
  "failure.letAssert": {
    ko: "let assert 패턴이 값과 맞지 않습니다. 값: {value}{where}",
    en: "The let assert pattern does not match the value. Value: {value}{where}",
    zh: "let assert 模式与值不匹配。值：{value}{where}",
  },
  "failure.exception": {
    ko: "실행 중 오류가 발생했습니다 ({errorClass}): {reason}{frame}",
    en: "An error occurred while running ({errorClass}): {reason}{frame}",
    zh: "运行时发生错误（{errorClass}）：{reason}{frame}",
  },
  "failure.frameLine": {
    ko: " ({module}:{function}/{arity}, {line}행)",
    en: " ({module}:{function}/{arity}, line {line})",
    zh: "（{module}:{function}/{arity}，第 {line} 行）",
  },
  "failure.notReported": {
    ko: "테스트 결과가 보고되지 않았습니다.",
    en: "No result was reported for this test.",
    zh: "没有报告该测试的结果。",
  },
  "failure.aborted": {
    ko: "테스트 실행이 비정상적으로 중단되었습니다. 메모리를 지나치게 많이 쓰거나 VM을 종료시키는 코드가 있는지 확인하세요.",
    en: "The test run stopped abnormally. Check for code that uses far too much memory or shuts down the VM.",
    zh: "测试运行异常中止。请检查是否有占用过多内存或使虚拟机退出的代码。",
  },
  "failure.withOutput": {
    ko: "{message}\n\n출력:\n{output}",
    en: "{message}\n\nOutput:\n{output}",
    zh: "{message}\n\n输出：\n{output}",
  },
  "failure.outputOnly": { ko: "출력:\n{output}", en: "Output:\n{output}", zh: "输出：\n{output}" },
  "failure.outputTruncated": { ko: "\n...(출력 생략)", en: "\n...(output truncated)", zh: "\n...（输出已截断）" },

  // ---------- service errors (AppError messages) ----------
  "service.notFound": { ko: "문제를 찾을 수 없습니다.", en: "Exercise not found.", zh: "找不到该题目。" },
  "service.conflict": {
    ko: "제출을 처리하지 못했습니다. 다시 시도하세요.",
    en: "Couldn't process the submission. Please try again.",
    zh: "无法处理这次提交。请重试。",
  },
  "service.badKey": { ko: "idempotencyKey가 올바르지 않습니다.", en: "The idempotencyKey is invalid.", zh: "idempotencyKey 无效。" },
  "service.badLocale": { ko: "지원하지 않는 언어입니다: {locale}", en: "Unsupported locale: {locale}", zh: "不支持的语言：{locale}" },
  "service.codeTooLong": { ko: "코드가 너무 깁니다.", en: "The code is too long.", zh: "代码太长。" },
  "service.predictNotRunnable": {
    ko: "예측 문제는 실행할 수 없습니다. 답을 제출하세요.",
    en: "Predict exercises can't be run. Submit your answer instead.",
    zh: "预测题无法运行。请直接提交答案。",
  },
  "service.noRunner": {
    ko: "{language} 실행기가 없습니다.",
    en: "No runner is available for {language}.",
    zh: "没有可用的 {language} 运行器。",
  },
  "service.trialUnavailable": {
    ko: "채점 환경 오류로 실행하지 못했습니다. 잠시 후 다시 시도하세요.",
    en: "A problem with the grading environment prevented the run. Please try again in a moment.",
    zh: "评测环境出错，无法运行。请稍后再试。",
  },

  // ---------- snippets (src/grading/snippet.ts; SnippetRequest has no locale yet, so these render in ko) ----------
  "snippet.emptyExpression": {
    ko: "평가할 식이 비어 있습니다.",
    en: "The expression to evaluate is empty.",
    zh: "要求值的表达式为空。",
  },
  "snippet.tooLong": {
    ko: "식과 정의는 각각 최대 {max}자입니다.",
    en: "The expression and the definitions can each be at most {max} characters.",
    zh: "表达式和定义各自最多 {max} 个字符。",
  },
  "snippet.tooManyImports": { ko: "import는 최대 {max}개입니다.", en: "At most {max} imports are allowed.", zh: "最多只能有 {max} 个 import。" },
  "snippet.badImport": {
    ko: "잘못된 import: {import} (예: gleam/list 또는 gleam/list.{map, fold})",
    en: "Invalid import: {import} (e.g. gleam/list or gleam/list.{map, fold})",
    zh: "无效的 import：{import}（例如 gleam/list 或 gleam/list.{map, fold}）",
  },
  "snippet.unavailable": {
    ko: "실행 환경 오류로 코드를 평가하지 못했습니다. 잠시 후 다시 시도하세요.",
    en: "A problem with the run environment prevented evaluating the code. Please try again in a moment.",
    zh: "运行环境出错，无法对代码求值。请稍后再试。",
  },
  "snippet.runtimeError": { ko: "실행 중 오류가 발생했습니다.", en: "An error occurred while running the code.", zh: "运行时发生错误。" },
} as const satisfies Record<string, LocalizedText>;

export type MessageId = keyof typeof MESSAGES;

export type MessageParams = Readonly<Record<string, string | number>>;

/** Picks `text` in `locale` (falling back to ko) and fills its placeholders. */
export function localize(text: LocalizedText, locale: Locale = DEFAULT_LOCALE, params?: MessageParams): string {
  return formatMessage(pickLocale(text, locale), params);
}

/** The catalog message `id` in `locale` (ko when omitted or missing). */
export function msg(id: MessageId, locale: Locale = DEFAULT_LOCALE, params?: MessageParams): string {
  return localize(MESSAGES[id], locale, params);
}
