import { describe, expect, it } from "vitest";
import { generateToken, hashToken, isWellFormedToken } from "../src/tokens.ts";
import { normalizeDisplayName, normalizeTokenLabel } from "../src/validation.ts";

describe("tokens", () => {
  it("generates fpt_ + 43 base64url chars (32 bytes) and unique values", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).toMatch(/^fpt_[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(a.slice(4), "base64url")).toHaveLength(32);
    expect(a).not.toBe(b);
    expect(isWellFormedToken(a)).toBe(true);
  });

  it("hashes to hex sha256 that does not contain the token", () => {
    const t = generateToken();
    const h = hashToken(t);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(t)).toBe(h);
    expect(h).not.toContain(t.slice(4));
  });

  it("rejects malformed tokens", () => {
    for (const bad of ["", "fpt_", "fpt_short", "abc_" + "a".repeat(43), "fpt_" + "a".repeat(44), "fpt_" + "+".repeat(43)]) {
      expect(isWellFormedToken(bad)).toBe(false);
    }
    expect(isWellFormedToken(undefined)).toBe(false);
  });
});

describe("normalizeDisplayName", () => {
  it("trims and derives a case-insensitive key", () => {
    const r = normalizeDisplayName("  Alice Kim ");
    expect(r).toEqual({ ok: true, value: { displayName: "Alice Kim", key: "alice kim" } });
  });

  it("accepts exactly 40 code points including Korean and emoji", () => {
    expect(normalizeDisplayName("가".repeat(40)).ok).toBe(true);
    expect(normalizeDisplayName("😀".repeat(40)).ok).toBe(true);
    expect(normalizeDisplayName("😀".repeat(41)).ok).toBe(false);
  });

  it("rejects empty, whitespace-only, too long and control characters", () => {
    for (const bad of ["", "   ", "\t\n", "a".repeat(41), "bad\u0000name", "line\nbreak", "sep arator"]) {
      const r = normalizeDisplayName(bad);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe("invalid_input");
    }
  });

  it("rejects non-string input without throwing", () => {
    expect(normalizeDisplayName(undefined as unknown as string).ok).toBe(false);
  });
});

describe("normalizeTokenLabel", () => {
  it("trims and bounds labels", () => {
    expect(normalizeTokenLabel(" cli ")).toEqual({ ok: true, value: "cli" });
    expect(normalizeTokenLabel("").ok).toBe(false);
    expect(normalizeTokenLabel("x".repeat(41)).ok).toBe(false);
  });
});
