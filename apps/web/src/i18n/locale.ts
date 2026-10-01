/**
 * Locale helpers for the browser. Mirrors the kernel's Locale utilities (SUPPORTED_LOCALES, DEFAULT_LOCALE,
 * isLocale, LocalizedText, pickLocale, formatMessage) because the web app must not import `@fp/kernel` values
 * (the kernel pulls in node:crypto). The `Locale` type itself comes from the API contract.
 */
import type { Locale } from "@fp/api-contract";

export type { Locale };

export const SUPPORTED_LOCALES: readonly Locale[] = ["ko", "en", "zh"];

/** Korean is the source language and the fallback for every missing translation. */
export const DEFAULT_LOCALE: Locale = "ko";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** One message per locale; `ko` is required, others fall back to it. */
export type LocalizedText = { readonly ko: string } & Partial<Record<Exclude<Locale, "ko">, string>>;

export type MessageParams = Readonly<Record<string, string | number>>;

export function pickLocale(text: LocalizedText, locale: Locale = DEFAULT_LOCALE): string {
  return text[locale] ?? text.ko;
}

/** Fills `{name}` placeholders; unknown placeholders are left as they are. */
export function formatMessage(template: string, params: MessageParams = {}): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}

/** Native names: the switcher always shows each language in its own script. */
export const LOCALE_NAMES: Readonly<Record<Locale, string>> = { ko: "한국어", en: "English", zh: "中文" };

/** Value for `<html lang>` and `lang` attributes. */
export const HTML_LANG: Readonly<Record<Locale, string>> = { ko: "ko", en: "en", zh: "zh-Hans" };

/** BCP 47 tag used for Intl formatting. */
export const INTL_LOCALE: Readonly<Record<Locale, string>> = { ko: "ko-KR", en: "en-US", zh: "zh-CN" };

export const LOCALE_KEY = "fp.locale";
