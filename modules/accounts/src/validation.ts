import { appError, err, ok, type AppError, type Result } from "@fp/kernel";

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

export function normalizeDisplayName(raw: string): Result<NormalizedName, AppError> {
  const displayName = clean(raw);
  const len = codePointLength(displayName);
  if (len < 1 || len > MAX_DISPLAY_NAME_LENGTH) {
    return err(appError("invalid_input", `표시 이름은 1자 이상 ${MAX_DISPLAY_NAME_LENGTH}자 이하여야 합니다.`));
  }
  if (FORBIDDEN_CHARS.test(displayName)) {
    return err(appError("invalid_input", "표시 이름에 사용할 수 없는 문자가 포함되어 있습니다."));
  }
  return ok({ displayName, key: displayName.toLowerCase() });
}

export function normalizeTokenLabel(raw: string): Result<string, AppError> {
  const label = clean(raw);
  const len = codePointLength(label);
  if (len < 1 || len > MAX_TOKEN_LABEL_LENGTH) {
    return err(appError("invalid_input", `토큰 이름은 1자 이상 ${MAX_TOKEN_LABEL_LENGTH}자 이하여야 합니다.`));
  }
  if (FORBIDDEN_CHARS.test(label)) {
    return err(appError("invalid_input", "토큰 이름에 사용할 수 없는 문자가 포함되어 있습니다."));
  }
  return ok(label);
}
