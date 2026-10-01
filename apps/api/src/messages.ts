/**
 * The API's own user-facing messages (auth, validation, rate limit, not found) in ko/en/zh, plus
 * Accept-Language negotiation. Learner-facing content comes from the modules, which receive the locale.
 * Missing en/zh text falls back to ko (pickLocale).
 */
import { DEFAULT_LOCALE, formatMessage, isLocale, pickLocale } from "@fp/kernel";
import type { Locale, LocalizedText } from "@fp/kernel";

export const API_MESSAGES = {
  internal: {
    ko: "서버 내부 오류가 발생했습니다.",
    en: "Something went wrong on the server.",
    zh: "服务器内部出错了。",
  },
  routeNotFound: {
    ko: "요청한 경로를 찾을 수 없습니다.",
    en: "The requested path was not found.",
    zh: "找不到请求的路径。",
  },
  bodyTooLarge: {
    ko: "요청 본문이 너무 큽니다.",
    en: "The request body is too large.",
    zh: "请求体过大。",
  },
  loginRequired: {
    ko: "로그인이 필요합니다.",
    en: "You need to log in.",
    zh: "请先登录。",
  },
  invalidToken: {
    ko: "인증 토큰이 유효하지 않거나 만료되었습니다.",
    en: "Your access token is invalid or has expired.",
    zh: "访问令牌无效或已过期。",
  },
  rateLimited: {
    ko: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
    en: "Too many requests. Please try again in a moment.",
    zh: "请求过于频繁，请稍后再试。",
  },
  invalidInput: {
    ko: "요청 값이 올바르지 않습니다.",
    en: "Some request values are invalid.",
    zh: "请求参数无效。",
  },
  invalidJson: {
    ko: "요청 본문이 올바른 JSON이 아닙니다.",
    en: "The request body is not valid JSON.",
    zh: "请求体不是有效的 JSON。",
  },
  unsupportedLanguage: {
    ko: "지원하지 않는 언어입니다.",
    en: "This programming language is not supported.",
    zh: "不支持该编程语言。",
  },
  unsupportedLocale: {
    ko: "지원하지 않는 표시 언어입니다. 사용 가능: {supported}",
    en: "This display language is not supported. Available: {supported}",
    zh: "不支持该显示语言。可选：{supported}",
  },
  exerciseNotFound: {
    ko: "문제를 찾을 수 없습니다.",
    en: "We couldn't find that exercise.",
    zh: "找不到该题目。",
  },
  submissionNotFound: {
    ko: "제출을 찾을 수 없습니다.",
    en: "We couldn't find that submission.",
    zh: "找不到该提交记录。",
  },
  sessionNotFound: {
    ko: "세션을 찾을 수 없습니다.",
    en: "We couldn't find that session.",
    zh: "找不到该训练回合。",
  },
} as const satisfies Record<string, LocalizedText>;

export type ApiMessageId = keyof typeof API_MESSAGES;

export function isApiMessageId(value: unknown): value is ApiMessageId {
  return typeof value === "string" && Object.hasOwn(API_MESSAGES, value);
}

/** Message `id` in `locale` (falls back to ko) with `{name}` placeholders filled. */
export function apiMessage(
  id: ApiMessageId,
  locale: Locale = DEFAULT_LOCALE,
  params: Readonly<Record<string, string | number>> = {},
): string {
  const text: LocalizedText = API_MESSAGES[id];
  return formatMessage(pickLocale(text, locale), params);
}

/**
 * Best supported locale from an Accept-Language header ("en-US,en;q=0.9,ko;q=0.8"). Only the primary
 * subtag counts (zh-CN, zh-Hans, zh-TW -> zh). Entries with q=0 are ignored. Default "ko".
 */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  let best: { locale: Locale; q: number } | null = null;
  for (const part of header.split(",")) {
    const [tag = "", ...attrs] = part.trim().split(";");
    const primary = tag.trim().split("-")[0]?.toLowerCase() ?? "";
    if (!isLocale(primary)) continue;
    let q = 1;
    for (const a of attrs) {
      const m = /^\s*q\s*=\s*([0-9.]+)\s*$/i.exec(a);
      if (m) q = Number(m[1]);
    }
    if (!Number.isFinite(q) || q <= 0) continue;
    if (best === null || q > best.q) best = { locale: primary, q };
  }
  return best?.locale ?? DEFAULT_LOCALE;
}
