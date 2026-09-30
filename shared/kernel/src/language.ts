/** Teaching languages. MVP supports only "gleam"; add a member when a new language adapter ships. */
export type Language = "gleam";

export const SUPPORTED_LANGUAGES: readonly Language[] = ["gleam"];

export function isLanguage(value: string): value is Language {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}
