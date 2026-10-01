import { useId } from "react";
import { useI18n } from "../i18n/I18n.tsx";
import { HTML_LANG, LOCALE_NAMES, SUPPORTED_LOCALES, isLocale } from "../i18n/locale.ts";
import type { Locale } from "../i18n/locale.ts";
import { Icon } from "./Icon.tsx";

/**
 * 한국어 / English / 中文. Each language is always shown in its own script (and `lang`), never translated.
 * `segmented` (login screen) shows three toggle buttons; `select` (header) is a compact native select.
 */
export function LanguageSwitcher(props: {
  readonly locale: Locale;
  readonly onChange: (locale: Locale) => void;
  readonly variant?: "segmented" | "select";
}) {
  const { t } = useI18n();
  const id = useId();
  if (props.variant === "select") {
    return (
      <span className="lang-select">
        <label htmlFor={id} className="lang-select-label">
          <Icon name="globe" size={16} />
          <span className="sr-only">{t("common.language")}</span>
        </label>
        <select
          id={id}
          className="lang-select-input"
          value={props.locale}
          onChange={(e) => {
            if (isLocale(e.target.value)) props.onChange(e.target.value);
          }}
        >
          {SUPPORTED_LOCALES.map((l) => (
            <option key={l} value={l} lang={HTML_LANG[l]}>
              {LOCALE_NAMES[l]}
            </option>
          ))}
        </select>
      </span>
    );
  }
  return (
    <div className="lang-switch" role="group" aria-label={t("common.language")}>
      <Icon name="globe" size={16} />
      {SUPPORTED_LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          lang={HTML_LANG[l]}
          className={`lang-option${l === props.locale ? " is-active" : ""}`}
          aria-pressed={l === props.locale}
          onClick={() => props.onChange(l)}
        >
          {LOCALE_NAMES[l]}
        </button>
      ))}
    </div>
  );
}
