/** React binding of the translator: <I18nProvider locale> at the root, useI18n() in components. */
import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { DEFAULT_LOCALE } from "./locale.ts";
import type { Locale } from "./locale.ts";
import { translator } from "./translator.ts";
import type { Translator } from "./translator.ts";

/** Without a provider (isolated component tests) the UI renders in Korean, the default locale. */
const I18nContext = createContext<Translator>(translator(DEFAULT_LOCALE));

export function I18nProvider({ locale, children }: { readonly locale: Locale; readonly children: ReactNode }) {
  return <I18nContext.Provider value={translator(locale)}>{children}</I18nContext.Provider>;
}

export function useI18n(): Translator {
  return useContext(I18nContext);
}
