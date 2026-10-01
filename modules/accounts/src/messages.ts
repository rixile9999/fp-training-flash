/**
 * The module's only message catalog: every user-facing string, in ko (source), en and zh.
 * Keys are stable ids; a missing en/zh entry (or an unknown locale) falls back to ko via `pickLocale`.
 */
import { appError, formatMessage, pickLocale, type AppError, type AppErrorCode, type Locale, type LocalizedText } from "@fp/kernel";

export const MESSAGES = {
  "displayName.length": {
    ko: "표시 이름은 1자 이상 {max}자 이하여야 합니다.",
    en: "Display name must be 1 to {max} characters long.",
    zh: "显示名称须为 1 到 {max} 个字符。",
  },
  "displayName.forbiddenChars": {
    ko: "표시 이름에 사용할 수 없는 문자가 포함되어 있습니다.",
    en: "Display name contains characters that are not allowed.",
    zh: "显示名称包含不允许使用的字符。",
  },
  "tokenLabel.length": {
    ko: "토큰 이름은 1자 이상 {max}자 이하여야 합니다.",
    en: "Token name must be 1 to {max} characters long.",
    zh: "令牌名称须为 1 到 {max} 个字符。",
  },
  "tokenLabel.forbiddenChars": {
    ko: "토큰 이름에 사용할 수 없는 문자가 포함되어 있습니다.",
    en: "Token name contains characters that are not allowed.",
    zh: "令牌名称包含不允许使用的字符。",
  },
  "locale.unsupported": {
    ko: "지원하지 않는 언어입니다. 사용할 수 있는 언어: {locales}",
    en: "This language is not supported. Available languages: {locales}",
    zh: "不支持该语言。可用语言：{locales}",
  },
  "user.notFound": {
    ko: "사용자를 찾을 수 없습니다.",
    en: "User not found.",
    zh: "找不到该用户。",
  },
  "token.notFound": {
    ko: "토큰을 찾을 수 없습니다.",
    en: "Token not found.",
    zh: "找不到该令牌。",
  },
} as const satisfies Record<string, LocalizedText>;

export type MessageId = keyof typeof MESSAGES;
export type MessageParams = Readonly<Record<string, string | number>>;

/** Picks the locale (falling back to ko) and fills `{name}` placeholders. */
export function localize(text: LocalizedText, locale?: Locale, params?: MessageParams): string {
  return formatMessage(pickLocale(text, locale), params);
}

export function message(id: MessageId, locale?: Locale, params?: MessageParams): string {
  return localize(MESSAGES[id], locale, params);
}

export function localizedError(code: AppErrorCode, id: MessageId, locale?: Locale, params?: MessageParams): AppError {
  return appError(code, message(id, locale, params));
}
