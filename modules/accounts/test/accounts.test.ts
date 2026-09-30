import { asId, runMigrations, type Db, type Logger, type UserId } from "@fp/kernel";
import { createFixedClock, createTestDb, type MutableClock } from "@fp/kernel/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AccountsService } from "../src/contract/index.ts";
import { createAccountsModule, migrations } from "../src/index.ts";
import { hashToken } from "../src/tokens.ts";

interface LogLine {
  level: string;
  message: string;
  fields?: Record<string, unknown>;
}

function recordingLogger(lines: LogLine[]): Logger {
  return {
    info: (message, fields) => lines.push({ level: "info", message, fields }),
    warn: (message, fields) => lines.push({ level: "warn", message, fields }),
    error: (message, fields) => lines.push({ level: "error", message, fields }),
  };
}

let db: Db;
let clock: MutableClock;
let logs: LogLine[];
let accounts: AccountsService;

beforeEach(async () => {
  db = await createTestDb();
  await runMigrations(db, "accounts", migrations);
  clock = createFixedClock("2026-09-30T00:00:00.000Z");
  logs = [];
  accounts = createAccountsModule({ db, clock, logger: recordingLogger(logs) }).service;
});

afterEach(async () => {
  await db.close();
});

async function login(name: string) {
  const r = await accounts.devLogin(name);
  if (!r.ok) throw new Error(`login failed: ${r.error.message}`);
  return r.value;
}

async function lastUsedInDb(tokenId: string): Promise<Date | null> {
  const r = await db.query<{ last_used_at: Date | null }>("select last_used_at from accounts.tokens where id = $1", [
    tokenId,
  ]);
  return r.rows[0]?.last_used_at ?? null;
}

describe("migrations", () => {
  it("are idempotent", async () => {
    await runMigrations(db, "accounts", migrations);
    const r = await db.query<{ n: number }>("select count(*)::int as n from public.fp_migrations where module = 'accounts'");
    expect(r.rows[0]?.n).toBe(migrations.length);
  });
});

describe("devLogin", () => {
  it("creates a new user with a trimmed name and issues a 'web' token", async () => {
    const { user, token } = await login("  민수  ");
    expect(user.displayName).toBe("민수");
    expect(user.createdAt).toBe("2026-09-30T00:00:00.000Z");
    expect(token.label).toBe("web");
    expect(token.token).toMatch(/^fpt_[A-Za-z0-9_-]{43}$/);
    expect(token.createdAt).toBe("2026-09-30T00:00:00.000Z");
    expect(await accounts.getUser(user.id)).toEqual(user);
  });

  it("returns the existing user for the same name, case-insensitively, with a fresh token", async () => {
    const first = await login("Alice");
    clock.advance(5_000);
    const second = await login("  aLICE ");
    expect(second.user).toEqual(first.user);
    expect(second.user.displayName).toBe("Alice");
    expect(second.token.tokenId).not.toBe(first.token.tokenId);
    expect(second.token.token).not.toBe(first.token.token);
    const r = await db.query<{ n: number }>("select count(*)::int as n from accounts.users");
    expect(r.rows[0]?.n).toBe(1);
    expect(await accounts.listTokens(first.user.id)).toHaveLength(2);
  });

  it("keeps different names as different users", async () => {
    const a = await login("Alice");
    const b = await login("Bob");
    expect(a.user.id).not.toBe(b.user.id);
  });

  it("handles concurrent logins with the same name without duplicating users", async () => {
    const results = await Promise.all([accounts.devLogin("Carol"), accounts.devLogin("carol"), accounts.devLogin("CAROL")]);
    const ids = new Set(results.map((r) => (r.ok ? r.value.user.id : "error")));
    expect(ids.size).toBe(1);
    expect(ids.has("error")).toBe(false);
  });

  it.each([
    ["empty", ""],
    ["whitespace only", "    "],
    ["41 characters", "a".repeat(41)],
    ["control character", "a\u0007b"],
  ])("rejects an invalid name (%s) without creating anything", async (_label, name) => {
    const r = await accounts.devLogin(name);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("invalid_input");
    const users = await db.query<{ n: number }>("select count(*)::int as n from accounts.users");
    expect(users.rows[0]?.n).toBe(0);
  });

  it("accepts a 40-character name after trimming", async () => {
    const r = await accounts.devLogin(`  ${"가".repeat(40)}  `);
    expect(r.ok).toBe(true);
  });
});

describe("token storage", () => {
  it("stores only the sha256 hash, never the plaintext", async () => {
    const { token } = await login("Alice");
    const r = await db.query<Record<string, unknown>>("select * from accounts.tokens where id = $1", [token.tokenId]);
    const row = r.rows[0];
    expect(row?.["token_hash"]).toBe(hashToken(token.token));
    expect(JSON.stringify(row)).not.toContain(token.token);
    expect(JSON.stringify(row)).not.toContain(token.token.slice(4));
  });

  it("never logs a plaintext token", async () => {
    const { user, token } = await login("Alice");
    const issued = await accounts.issueToken(user.id, "cli");
    await accounts.authenticate(token.token);
    await accounts.authenticate("fpt_" + "x".repeat(43));
    const dump = JSON.stringify(logs);
    expect(dump).not.toContain(token.token.slice(4));
    if (issued.ok) expect(dump).not.toContain(issued.value.token.slice(4));
    expect(logs.length).toBeGreaterThan(0);
  });
});

describe("issueToken / listTokens", () => {
  it("issues a labelled token that authenticates and shows up in the list", async () => {
    const { user } = await login("Alice");
    clock.advance(1_000);
    const r = await accounts.issueToken(user.id, "  mcp  ");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.label).toBe("mcp");
    expect(await accounts.authenticate(r.value.token)).toEqual(user);
    const list = await accounts.listTokens(user.id);
    expect(list.map((t) => t.label)).toEqual(["web", "mcp"]);
    expect(list[1]).toMatchObject({ tokenId: r.value.tokenId, createdAt: "2026-09-30T00:00:01.000Z" });
    // listTokens never exposes secrets.
    expect(JSON.stringify(list)).not.toContain("fpt_");
  });

  it("rejects invalid labels", async () => {
    const { user } = await login("Alice");
    for (const label of ["", "   ", "x".repeat(41)]) {
      const r = await accounts.issueToken(user.id, label);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe("invalid_input");
    }
  });

  it("returns not_found for an unknown user", async () => {
    const r = await accounts.issueToken(asId<UserId>("no-such-user"), "cli");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("not_found");
  });

  it("lists only the caller's own tokens", async () => {
    const alice = await login("Alice");
    const bob = await login("Bob");
    const aliceTokens = await accounts.listTokens(alice.user.id);
    expect(aliceTokens.map((t) => t.tokenId)).toEqual([alice.token.tokenId]);
    expect(await accounts.listTokens(bob.user.id)).toHaveLength(1);
    expect(await accounts.listTokens(asId<UserId>("nobody"))).toEqual([]);
  });

  it("getUser returns null for an unknown id", async () => {
    expect(await accounts.getUser(asId<UserId>("nobody"))).toBeNull();
  });
});

describe("revokeToken", () => {
  it("revokes an own token: it no longer authenticates and leaves the list", async () => {
    const { user, token } = await login("Alice");
    const other = await accounts.issueToken(user.id, "cli");
    if (!other.ok) throw new Error("issue failed");
    const r = await accounts.revokeToken(user.id, token.tokenId);
    expect(r).toEqual({ ok: true, value: undefined });
    expect(await accounts.authenticate(token.token)).toBeNull();
    expect((await accounts.listTokens(user.id)).map((t) => t.tokenId)).toEqual([other.value.tokenId]);
    // Other tokens keep working.
    expect(await accounts.authenticate(other.value.token)).toEqual(user);
  });

  it("is idempotent for an already revoked own token", async () => {
    const { user, token } = await login("Alice");
    expect((await accounts.revokeToken(user.id, token.tokenId)).ok).toBe(true);
    clock.advance(10_000);
    expect((await accounts.revokeToken(user.id, token.tokenId)).ok).toBe(true);
    const r = await db.query<{ revoked_at: Date }>("select revoked_at from accounts.tokens where id = $1", [
      token.tokenId,
    ]);
    expect(r.rows[0]?.revoked_at.toISOString()).toBe("2026-09-30T00:00:00.000Z");
  });

  it("cannot revoke another user's token", async () => {
    const alice = await login("Alice");
    const bob = await login("Bob");
    const r = await accounts.revokeToken(bob.user.id, alice.token.tokenId);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("not_found");
    expect(await accounts.authenticate(alice.token.token)).toEqual(alice.user);
  });

  it("returns not_found for an unknown token id", async () => {
    const { user } = await login("Alice");
    const r = await accounts.revokeToken(user.id, "does-not-exist");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("not_found");
  });
});

describe("authenticate", () => {
  it("returns the user for a valid token", async () => {
    const { user, token } = await login("Alice");
    expect(await accounts.authenticate(token.token)).toEqual(user);
  });

  it("returns null for unknown, malformed or tampered tokens", async () => {
    const { token } = await login("Alice");
    const last = token.token.at(-1) === "A" ? "B" : "A";
    for (const bad of ["", "garbage", "fpt_" + "A".repeat(43), token.token.slice(0, -1) + last, ` ${token.token}`, token.token.slice(4)]) {
      expect(await accounts.authenticate(bad)).toBeNull();
    }
  });

  it("sets lastUsedAt on first use and refreshes it at most once per minute", async () => {
    const { user, token } = await login("Alice");
    expect(await lastUsedInDb(token.tokenId)).toBeNull();
    expect((await accounts.listTokens(user.id))[0]?.lastUsedAt).toBeUndefined();

    clock.advance(1_000); // 00:00:01
    await accounts.authenticate(token.token);
    expect((await lastUsedInDb(token.tokenId))?.toISOString()).toBe("2026-09-30T00:00:01.000Z");

    clock.advance(30_000); // 00:00:31, within the minute: no write
    await accounts.authenticate(token.token);
    expect((await lastUsedInDb(token.tokenId))?.toISOString()).toBe("2026-09-30T00:00:01.000Z");

    clock.advance(29_999); // 00:01:00.999, still < 60s
    await accounts.authenticate(token.token);
    expect((await lastUsedInDb(token.tokenId))?.toISOString()).toBe("2026-09-30T00:00:01.000Z");

    clock.advance(1); // exactly 60s later: written
    await accounts.authenticate(token.token);
    expect((await lastUsedInDb(token.tokenId))?.toISOString()).toBe("2026-09-30T00:01:01.000Z");
    expect((await accounts.listTokens(user.id))[0]?.lastUsedAt).toBe("2026-09-30T00:01:01.000Z");
  });

  it("does not update lastUsedAt for revoked tokens", async () => {
    const { user, token } = await login("Alice");
    await accounts.revokeToken(user.id, token.tokenId);
    clock.advance(120_000);
    expect(await accounts.authenticate(token.token)).toBeNull();
    expect(await lastUsedInDb(token.tokenId)).toBeNull();
  });
});
