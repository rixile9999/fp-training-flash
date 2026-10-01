import { err, isLocale, ok, type AppError, type Locale, type Result } from "@fp/kernel";
import { localizedError } from "./messages.ts";

export const MAX_DISPLAY_NAME_LENGTH = 40;
export const MAX_TOKEN_LABEL_LENGTH = 40;

// Control characters (C0/C1) and line/paragraph separators are never valid in names or labels.
const FORBIDDEN_CHARS = new RegExp("[\\p{Cc}\\u2028\\u2029]", "u");

export interface NormalizedName {
  /** Trimmed, NFC-normalized name as shown to users. */
  readonly displayName: string;
  /** Case-insensitive uniqueness key. */
  readonly key: string;
}

/** Length is counted in Unicode code points so Korean and emoji names are measured as users see them. */
function codePointLength(s: string): number {
  return [...s].length;
}

function clean(raw: unknown): string {
  return typeof raw === "string" ? raw.normalize("NFC").trim() : "";
}

/** `locale` only selects the language of the error message (default ko). */
export function normalizeDisplayName(raw: string, locale?: Locale): Result<NormalizedName, AppError> {
  const displayName = clean(raw);
  const len = codePointLength(displayName);
  if (len < 1 || len > MAX_DISPLAY_NAME_LENGTH) {
    return err(localizedError("invalid_input", "displayName.length", locale, { max: MAX_DISPLAY_NAME_LENGTH }));
  }
  if (FORBIDDEN_CHARS.test(displayName)) {
    return err(localizedError("invalid_input", "displayName.forbiddenChars", locale));
  }
  return ok({ displayName, key: displayName.toLowerCase() });
}

export function normalizeTokenLabel(raw: string, locale?: Locale): Result<string, AppError> {
  const label = clean(raw);
  const len = codePointLength(label);
  if (len < 1 || len > MAX_TOKEN_LABEL_LENGTH) {
    return err(localizedError("invalid_input", "tokenLabel.length", locale, { max: MAX_TOKEN_LABEL_LENGTH }));
  }
  if (FORBIDDEN_CHARS.test(label)) {
    return err(localizedError("invalid_input", "tokenLabel.forbiddenChars", locale));
  }
  return ok(label);
}

/** Runtime guard: callers outside TypeScript (HTTP, MCP, CLI) may pass anything. */
export function isSupportedLocale(value: unknown): value is Locale {
  return typeof value === "string" && isLocale(value);
}
