/** Locale-bound message lookup plus Intl-based date/number formatting. No React here (see I18n.tsx). */
import { DEFAULT_LOCALE, INTL_LOCALE, formatMessage, pickLocale } from "./locale.ts";
import type { Locale, MessageParams } from "./locale.ts";
import { MESSAGES } from "./messages.ts";
import type { Catalog, MessageId } from "./messages.ts";

export interface Translator {
  readonly locale: Locale;
  /** Message `id` in this locale (falling back to ko) with `{name}` placeholders filled. */
  t(id: MessageId, params?: MessageParams): string;
  /** True when the catalog has an entry for `id` (for data-driven keys such as error tags). */
  has(id: string): boolean;
  /** Month and day, e.g. "9월 30일" / "September 30" / "9月30日". */
  date(iso: string): string;
  /** "today", "tomorrow", "in 3 days", "2 days ago" relative to `nowMs`, by local calendar day. */
  relativeDay(iso: string, nowMs: number): string;
  /** 0.62 -> "62%". */
  percent(p: number): string;
  number(n: number, maximumFractionDigits?: number): string;
  /** Joins with the locale's list separator (", " or "、"). */
  list(items: readonly string[]): string;
}

/** Looks `id` up in `catalog`: the locale's text, else ko, else the id itself (a visible bug, never a crash). */
export function translate(catalog: Catalog, locale: Locale, id: string, params?: MessageParams): string {
  const entry = catalog[id];
  return entry ? formatMessage(pickLocale(entry, locale), params) : id;
}

const DAY_MS = 86_400_000;

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function createTranslator(locale: Locale, catalog: Catalog = MESSAGES): Translator {
  const tag = INTL_LOCALE[locale];
  const dateFmt = new Intl.DateTimeFormat(tag, { month: "long", day: "numeric" });
  const pctFmt = new Intl.NumberFormat(tag, { style: "percent", maximumFractionDigits: 0 });
  const tr: Translator = {
    locale,
    t: (id, params) => translate(catalog, locale, id, params),
    has: (id) => id in catalog,
    date: (iso) => dateFmt.format(new Date(iso)),
    relativeDay: (iso, nowMs) => {
      const diff = Math.round((startOfDay(Date.parse(iso)) - startOfDay(nowMs)) / DAY_MS);
      if (diff === 0) return tr.t("day.today");
      if (diff === 1) return tr.t("day.tomorrow");
      if (diff === -1) return tr.t("day.yesterday");
      return diff > 1 ? tr.t("day.inDays", { n: diff }) : tr.t("day.daysAgo", { n: -diff });
    },
    percent: (p) => pctFmt.format(p),
    number: (n, maximumFractionDigits = 0) => new Intl.NumberFormat(tag, { maximumFractionDigits }).format(n),
    list: (items) => items.join(tr.t("common.listSep")),
  };
  return tr;
}

const cache = new Map<Locale, Translator>();

/** Shared translator over the app catalog; stable per locale so it is safe as a context value / hook dep. */
export function translator(locale: Locale = DEFAULT_LOCALE): Translator {
  let tr = cache.get(locale);
  if (!tr) cache.set(locale, (tr = createTranslator(locale)));
  return tr;
}
