/**
 * Every learner-facing string of @fp/recall (generic feedback, diagnostics and errors), keyed by stable ids.
 * `ko` is the source; a missing `en`/`zh` falls back to it. Placeholders use `{name}`.
 * Terms: 암기/recall/记忆, 카드/card/卡片, 복습/review/复习, 세션/session/训练回合, 컴파일 오류/compile error/编译错误.
 */
import { formatMessage, pickLocale } from "@fp/kernel";
import type { Locale, LocalizedText } from "@fp/kernel";

export const MESSAGES = {
  // ---------- recognize ----------
  "recognize.correct": { ko: "정답이에요!", en: "Correct!", zh: "回答正确！" },
  "recognize.wrong": {
    ko: "아쉽지만 정답이 아니에요. 정답: {expected}",
    en: "Not quite. The answer: {expected}",
    zh: "不太对。正确答案：{expected}",
  },
  // ---------- cloze ----------
  "cloze.correct": { ko: "맞아요!", en: "That's right!", zh: "对了！" },
  "cloze.correctByValue": {
    ko: "준비된 답과는 다르지만 같은 값({value})이 나와서 정답으로 인정해요. 대표 답: {answer}",
    en: "Not the fill we expected, but it gives the same value {value}, so it counts. Usual answer: {answer}",
    zh: "和预设答案不同，但得到相同的值 {value}，算你答对。常见答案：{answer}",
  },
  "cloze.empty": {
    ko: "빈칸이 비어 있어요. 빈칸 정답: {answer}",
    en: "The blank is empty. The answer: {answer}",
    zh: "空格没有填写。正确答案：{answer}",
  },
  "cloze.wrongValue": {
    ko: "채운 코드의 값이 달라요. 기대한 값: {expectedValue}, 내 결과: {actual}. 빈칸 정답: {answer}",
    en: "Your fill gives a different value. Expected: {expectedValue}, yours: {actual}. The answer: {answer}",
    zh: "填入后的值不一致。期望：{expectedValue}，你的结果：{actual}。正确答案：{answer}",
  },
  "cloze.notCompiling": {
    ko: "채운 코드가 실행되지 않아요. 빈칸 정답: {answer}",
    en: "The code with your fill doesn't run. The answer: {answer}",
    zh: "填入后的代码无法运行。正确答案：{answer}",
  },
  // ---------- predict ----------
  "predict.correct": { ko: "맞아요! 값: {expected}", en: "Right! The value: {expected}", zh: "对了！值：{expected}" },
  "predict.wrong": {
    ko: "아쉬워요. 이 식의 값: {expected}",
    en: "Not quite. This expression evaluates to: {expected}",
    zh: "不太对。这个表达式的值：{expected}",
  },
  // ---------- produce ----------
  "produce.correct": {
    ko: "모든 검사를 통과했어요!",
    en: "All checks passed!",
    zh: "全部检查都通过了！",
  },
  "produce.empty": {
    ko: "함수 본문이 비어 있어요. 참고 답안을 보고 다음에 다시 써 보세요.",
    en: "The function body is empty. Look at the reference solution and try writing it next time.",
    zh: "函数体是空的。看看参考答案，下次再试着写一写。",
  },
  "produce.wrongValue": {
    ko: "검사 결과가 달라요. 기대한 값: {expected}, 내 결과: {actual}",
    en: "The checks gave a different result. Expected: {expected}, yours: {actual}",
    zh: "检查结果不一致。期望：{expected}，你的结果：{actual}",
  },
  "produce.missing": {
    ko: "결과는 맞지만 이 카드는 {tokens}을(를) 쓰는 연습이에요. 직접 써서 다시 풀어 보세요.",
    en: "The result is right, but this card practices {tokens}. Try again using it.",
    zh: "结果正确，但这张卡片练习的是 {tokens}。请用它再写一遍。",
  },
  "produce.compileError": {
    ko: "컴파일 오류가 있어요. 아래 메시지를 확인해 보세요.",
    en: "There's a compile error. Check the messages below.",
    zh: "有编译错误。请查看下面的信息。",
  },
  "produce.runtimeError": {
    ko: "실행 중에 오류가 났어요.",
    en: "Your code crashed while running.",
    zh: "代码运行时出错了。",
  },
  "produce.timeout": {
    ko: "시간 제한을 넘겼어요. 끝나지 않는 재귀가 있는지 확인해 보세요.",
    en: "It ran out of time. Check for recursion that never ends.",
    zh: "运行超时了。检查一下是否有不会结束的递归。",
  },
  "produce.rejected": {
    ko: "허용되지 않는 코드가 있어 실행하지 않았어요.",
    en: "The code contains something that isn't allowed, so it wasn't run.",
    zh: "代码中有不允许的内容，因此没有运行。",
  },
  // ---------- diagnostics ----------
  "diag.line": { ko: "{line}행: {message}", en: "Line {line}: {message}", zh: "第 {line} 行：{message}" },
  "diag.outsideBody": { ko: "(본문 밖) {message}", en: "(outside the body) {message}", zh: "（函数体之外）{message}" },
  "diag.runtime": { ko: "실행 오류: {message}", en: "Runtime error: {message}", zh: "运行错误：{message}" },
  "diag.timeout": { ko: "시간 초과", en: "Timed out", zh: "运行超时" },
  "diag.rejected": { ko: "허용되지 않는 코드: {reason}", en: "Not allowed: {reason}", zh: "不允许的代码：{reason}" },
  // ---------- errors ----------
  "error.sessionNotFound": {
    ko: "암기 세션을 찾을 수 없거나 내 세션이 아니에요.",
    en: "Recall session not found, or it isn't yours.",
    zh: "找不到该记忆训练回合，或它不属于你。",
  },
  "error.itemNotFound": {
    ko: "이 세션에 없는 문항이에요: {itemId}",
    en: "This session has no item {itemId}.",
    zh: "本训练回合中没有该题目：{itemId}",
  },
  "error.sessionFinished": {
    ko: "이미 끝난 세션이에요. 새 세션을 시작해 주세요.",
    en: "This session has already finished. Please start a new one.",
    zh: "这个训练回合已经结束，请开始新的回合。",
  },
  "error.deckNotFound": {
    ko: "덱을 찾을 수 없어요: {deckId}",
    en: "Deck not found: {deckId}",
    zh: "找不到卡组：{deckId}",
  },
  "error.invalidMinutes": {
    ko: "세션 길이(분)는 1 이상의 숫자여야 해요.",
    en: "Session length (minutes) must be a number of at least 1.",
    zh: "训练时长（分钟）必须是不小于 1 的数字。",
  },
  "error.invalidDeckIds": {
    ko: "덱 목록이 올바르지 않아요.",
    en: "The list of decks is invalid.",
    zh: "卡组列表无效。",
  },
  "error.invalidElapsed": {
    ko: "풀이 시간(elapsedMs)은 0 이상의 숫자여야 해요.",
    en: "Answer time (elapsedMs) must be a number of at least 0.",
    zh: "作答时间（elapsedMs）必须是不小于 0 的数字。",
  },
  "error.wrongResponseKind": {
    ko: "이 문항에는 다른 형식의 답이 필요해요: {expected}",
    en: "This item needs a different kind of answer: {expected}",
    zh: "这道题需要另一种作答形式：{expected}",
  },
  "error.invalidChoice": {
    ko: "없는 보기예요: {choice}",
    en: "That choice doesn't exist: {choice}",
    zh: "没有这个选项：{choice}",
  },
  "error.answerTooLong": {
    ko: "답이 너무 길어요(최대 {max}자).",
    en: "The answer is too long (at most {max} characters).",
    zh: "答案太长了（最多 {max} 个字符）。",
  },
  "error.cardMissing": {
    ko: "콘텐츠가 바뀌어 이 카드를 채점할 수 없어요. 새 세션을 시작해 주세요.",
    en: "The content has changed, so this card can't be graded. Please start a new session.",
    zh: "内容已更新，无法评测这张卡片。请开始新的训练回合。",
  },
  "error.sandboxUnavailable": {
    ko: "지금은 코드를 실행할 수 없어요. 잠시 후 다시 답해 주세요.",
    en: "Code can't be run right now. Please answer again in a moment.",
    zh: "暂时无法运行代码，请稍后再作答。",
  },
} as const satisfies Record<string, LocalizedText>;

export type MessageId = keyof typeof MESSAGES;

/** Renders catalog message `id` in `locale` (missing translation -> ko) and fills `{name}` placeholders. */
export function t(locale: Locale, id: MessageId, params: Readonly<Record<string, string | number>> = {}): string {
  return formatMessage(pickLocale(MESSAGES[id], locale), params);
}
