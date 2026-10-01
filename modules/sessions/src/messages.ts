/**
 * Every learner-facing string of @fp/sessions (item reasons and error messages), keyed by stable ids.
 * `ko` is the source; a missing `en`/`zh` falls back to it (see `pickLocale`). Placeholders use `{name}`.
 */
import { DEFAULT_LOCALE, formatMessage, isLocale, pickLocale } from "@fp/kernel";
import type { Locale, LocalizedText } from "@fp/kernel";

export const MESSAGES = {
  // ---------- item reasons ----------
  "reason.focus.forced": {
    ko: "선택한 기술 집중 연습: {skill} (예상 성공률 {pct})",
    en: "Focused practice on your chosen skill: {skill} (expected success {pct})",
    zh: "所选能力专项训练：{skill}（预计成功率 {pct}）",
  },
  "reason.focus.start": {
    ko: "학습 시작: {skill} (입문 난이도)",
    en: "Getting started: {skill} (entry level)",
    zh: "开始学习：{skill}（入门难度）",
  },
  "reason.focus.weakest": {
    ko: "집중 연습: {skill} — 지금 가장 약한 기술 (예상 성공률 {pct})",
    en: "Focused practice: {skill} — your weakest skill right now (expected success {pct})",
    zh: "专项训练：{skill}——你目前最薄弱的能力（预计成功率 {pct}）",
  },
  "reason.review": {
    ko: "복습 예정: {skill}",
    en: "Review due: {skill}",
    zh: "待复习：{skill}",
  },
  "reason.variation.sameFamily": {
    ko: "변형 연습: 같은 문제의 다른 변형 — {title}",
    en: "Variation: another variant of the same exercise — {title}",
    zh: "变式练习：同一道题的另一种变式——{title}",
  },
  "reason.variation.otherContext": {
    ko: "변형 연습: 다른 맥락에서 {skill} 다시 적용",
    en: "Variation: apply {skill} again in a different context",
    zh: "变式练习：{skill}，换个情境再运用一次",
  },
  "reason.challenge": {
    ko: "도전 과제 (선택): {skill}",
    en: "Challenge (optional): {skill}",
    zh: "挑战题（可选）：{skill}",
  },
  // ---------- errors ----------
  "error.noExercises": {
    ko: "아직 풀 수 있는 연습 문제가 없습니다.",
    en: "There are no exercises you can solve yet.",
    zh: "暂时还没有可以做的练习题。",
  },
  "error.noExercisesForSkill": {
    ko: "선택한 기술({skill})에 맞는 연습 문제가 없습니다.",
    en: "There are no exercises for the skill you chose ({skill}).",
    zh: "你选择的能力（{skill}）暂无对应的练习题。",
  },
  "error.noRecommendation": {
    ko: "지금 추천할 수 있는 연습 문제가 없습니다.",
    en: "There's no exercise to recommend right now.",
    zh: "目前没有可以推荐的练习题。",
  },
  "error.invalidTargetMinutes": {
    ko: "목표 시간은 1분에서 {max}분 사이여야 합니다.",
    en: "Target time must be between 1 and {max} minutes.",
    zh: "目标时长必须在 1 到 {max} 分钟之间。",
  },
  "error.sessionNotFound": {
    ko: "세션을 찾을 수 없습니다.",
    en: "Session not found.",
    zh: "找不到该训练回合。",
  },
  "error.sessionNotActive": {
    ko: "진행 중인 세션이 아닙니다.",
    en: "This session isn't in progress.",
    zh: "该训练回合未在进行中。",
  },
  "error.nothingToSkip": {
    ko: "건너뛸 문제가 없습니다.",
    en: "There's no exercise to skip.",
    zh: "没有可以跳过的题目。",
  },
  "error.sessionAbandoned": {
    ko: "중단된 세션은 완료할 수 없습니다.",
    en: "A session that was stopped can't be completed.",
    zh: "已中断的训练回合无法完成。",
  },
} as const satisfies Record<string, LocalizedText>;

export type MessageId = keyof typeof MESSAGES;

/** Renders one LocalizedText in `locale` (missing translation -> ko) and fills `{name}` placeholders. */
export function render(text: LocalizedText, locale: Locale, params: Readonly<Record<string, string | number>> = {}): string {
  return formatMessage(pickLocale(text, locale), params);
}

/** Renders catalog message `id` in `locale`. */
export function t(locale: Locale, id: MessageId, params: Readonly<Record<string, string | number>> = {}): string {
  return render(MESSAGES[id], locale, params);
}

/** Normalises an untrusted locale (e.g. from JSON) to a supported one; default "ko". */
export function resolveLocale(locale: string | undefined | null): Locale {
  return locale != null && isLocale(locale) ? locale : DEFAULT_LOCALE;
}
