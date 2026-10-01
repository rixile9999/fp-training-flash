/**
 * Every learner-facing string of @fp/lessons (generic feedback and error messages), keyed by stable ids.
 * `ko` is the source; a missing `en`/`zh` falls back to it (see `pickLocale`). Placeholders use `{name}`.
 * Terms: 단원/unit/单元, 레슨/lesson/课, 체크포인트/checkpoint/单元测验, 배치 고사/placement test/分级测试.
 */
import { DEFAULT_LOCALE, formatMessage, isLocale, pickLocale } from "@fp/kernel";
import type { Locale, LocalizedText } from "@fp/kernel";

export const MESSAGES = {
  // ---------- feedback ----------
  "feedback.correct": {
    ko: "정답이에요!",
    en: "Correct!",
    zh: "回答正确！",
  },
  "feedback.wrong": {
    ko: "아쉽지만 정답이 아니에요. 다시 생각해 보세요.",
    en: "Not quite. Give it another think.",
    zh: "不太对，再想一想。",
  },
  "feedback.skipped": {
    ko: "답하지 않은 문항이에요.",
    en: "You skipped this one.",
    zh: "你跳过了这道题。",
  },
  // ---------- errors ----------
  "error.unknownUnit": {
    ko: "단원을 찾을 수 없어요: {unitId}",
    en: "Unit not found: {unitId}",
    zh: "找不到该单元：{unitId}",
  },
  "error.unknownLesson": {
    ko: "레슨을 찾을 수 없어요: {unitId}/{lessonId}",
    en: "Lesson not found: {unitId}/{lessonId}",
    zh: "找不到这节课：{unitId}/{lessonId}",
  },
  "error.unknownExercise": {
    ko: "문항을 찾을 수 없어요: {exerciseId}",
    en: "Exercise not found: {exerciseId}",
    zh: "找不到这道题：{exerciseId}",
  },
  "error.choiceRequired": {
    ko: "보기 중 하나를 골라 주세요.",
    en: "Pick one of the choices.",
    zh: "请选择一个选项。",
  },
  "error.invalidChoice": {
    ko: "없는 보기예요: {choice}",
    en: "That choice doesn't exist: {choice}",
    zh: "没有这个选项：{choice}",
  },
  "error.quizNotFound": {
    ko: "퀴즈를 찾을 수 없거나 내 퀴즈가 아니에요.",
    en: "Quiz not found, or it isn't yours.",
    zh: "找不到该测验，或它不属于你。",
  },
  "error.quizExpired": {
    ko: "시간이 지나 만료된 퀴즈예요. 새로 시작해 주세요.",
    en: "This quiz has expired. Please start a new one.",
    zh: "该测验已过期，请重新开始。",
  },
  "error.quizContentChanged": {
    ko: "콘텐츠가 바뀌어 이 퀴즈를 채점할 수 없어요. 새로 시작해 주세요.",
    en: "The content has changed, so this quiz can't be graded. Please start a new one.",
    zh: "内容已更新，无法评测该测验，请重新开始。",
  },
  "error.noCheckpointItems": {
    ko: "이 단원에는 체크포인트 문항이 없어요: {unitId}",
    en: "This unit has no checkpoint items: {unitId}",
    zh: "这个单元没有单元测验题目：{unitId}",
  },
  "error.noPlacementItems": {
    ko: "아직 배치 고사 문항이 없어요.",
    en: "There are no placement test items yet.",
    zh: "暂时还没有分级测试题目。",
  },
} as const satisfies Record<string, LocalizedText>;

export type MessageId = keyof typeof MESSAGES;

/** Renders catalog message `id` in `locale` (missing translation -> ko) and fills `{name}` placeholders. */
export function t(locale: Locale, id: MessageId, params: Readonly<Record<string, string | number>> = {}): string {
  return formatMessage(pickLocale(MESSAGES[id], locale), params);
}

/** Normalises an untrusted locale (e.g. from JSON) to a supported one; default "ko". */
export function resolveLocale(locale: string | undefined | null): Locale {
  return locale != null && isLocale(locale) ? locale : DEFAULT_LOCALE;
}
