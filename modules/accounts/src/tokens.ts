import { createHash, randomBytes } from "node:crypto";

export const TOKEN_PREFIX = "fpt_";
const TOKEN_BYTES = 32;
/** 32 bytes in unpadded base64url is exactly 43 characters. */
const TOKEN_PATTERN = /^fpt_[A-Za-z0-9_-]{43}$/;

/** Returns a fresh plaintext bearer token: "fpt_" + 32 random bytes as base64url. */
export function generateToken(): string {
  return TOKEN_PREFIX + randomBytes(TOKEN_BYTES).toString("base64url");
}

/** Hex sha256 of the plaintext token. This is the only form that is persisted. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Cheap syntactic check so malformed tokens never reach the database. */
export function isWellFormedToken(token: unknown): token is string {
  return typeof token === "string" && TOKEN_PATTERN.test(token);
}
