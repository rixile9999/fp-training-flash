/** Teaching languages. MVP supports only "gleam"; add a member when a new language adapter ships. */
export type Language = "gleam";

export const SUPPORTED_LANGUAGES: readonly Language[] = ["gleam"];

export function isLanguage(value: string): value is Language {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

/** Learner-facing UI and content language (not the programming language). */
export type Locale = "ko" | "en" | "zh";

export const SUPPORTED_LOCALES: readonly Locale[] = ["ko", "en", "zh"];

/** Authoring language of all content; every other locale falls back to it. */
export const DEFAULT_LOCALE: Locale = "ko";

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** One message per locale; `ko` is required, others fall back to it. */
export type LocalizedText = { readonly ko: string } & Partial<Record<Exclude<Locale, "ko">, string>>;

export function pickLocale(text: LocalizedText, locale: Locale = DEFAULT_LOCALE): string {
  return text[locale] ?? text.ko;
}

/** Fills `{name}` placeholders. */
export function formatMessage(template: string, params: Readonly<Record<string, string | number>> = {}): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}
