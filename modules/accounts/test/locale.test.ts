import { asId, runMigrations, SUPPORTED_LOCALES, type Db, type Locale, type Logger, type UserId } from "@fp/kernel";
import { createFixedClock, createTestDb } from "@fp/kernel/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AccountsService } from "../src/contract/index.ts";
import { createAccountsModule, migrations } from "../src/index.ts";
import { localize, message, MESSAGES, type MessageId } from "../src/messages.ts";
import { normalizeDisplayName, normalizeTokenLabel } from "../src/validation.ts";

const silent: Logger = { info: () => {}, warn: () => {}, error: () => {} };
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("message catalog", () => {
  const ids = Object.keys(MESSAGES) as MessageId[];

  it.each(ids)("%s has en and zh translations that differ from ko and keep the placeholders", (id) => {
    const text = MESSAGES[id];
    for (const locale of ["en", "zh"] as const) {
      expect(text[locale].trim()).not.toBe("");
      expect(text[locale]).not.toBe(text.ko);
      expect(placeholders(text[locale])).toEqual(placeholders(text.ko));
    }
  });

  it("defaults to ko and falls back to ko for a missing translation or unknown locale", () => {
    expect(message("user.notFound")).toBe(MESSAGES["user.notFound"].ko);
    expect(message("user.notFound", "fr" as Locale)).toBe(MESSAGES["user.notFound"].ko);
    expect(localize({ ko: "{n}개" }, "en", { n: 3 })).toBe("3개");
    expect(localize({ ko: "한국어", en: "English" }, "zh")).toBe("한국어");
  });

  it("fills placeholders in every locale", () => {
    expect(message("tokenLabel.length", "ko", { max: 40 })).toContain("40");
    expect(message("tokenLabel.length", "en", { max: 40 })).toBe("Token name must be 1 to 40 characters long.");
    expect(message("tokenLabel.length", "zh", { max: 40 })).toBe("令牌名称须为 1 到 40 个字符。");
  });
});

describe("validation messages", () => {
  it("are Korean by default and localized for en and zh", () => {
    const msg = (locale?: Locale) => {
      const r = normalizeDisplayName("", locale);
      return r.ok ? "" : r.error.message;
    };
    expect(msg()).toBe("표시 이름은 1자 이상 40자 이하여야 합니다.");
    expect(msg("en")).toBe("Display name must be 1 to 40 characters long.");
    expect(msg("zh")).toBe("显示名称须为 1 到 40 个字符。");
    const label = normalizeTokenLabel("a\u0007", "en");
    expect(label.ok ? "" : label.error.message).toBe("Token name contains characters that are not allowed.");
  });
});

let db: Db;
let accounts: AccountsService;

beforeEach(async () => {
  db = await createTestDb();
  await runMigrations(db, "accounts", migrations);
  accounts = createAccountsModule({ db, clock: createFixedClock("2026-09-30T00:00:00.000Z"), logger: silent }).service;
});

afterEach(async () => {
  await db.close();
});

async function login(name: string, locale?: Locale) {
  const r = await accounts.devLogin(name, locale);
  if (!r.ok) throw new Error(`login failed: ${r.error.message}`);
  return r.value;
}

async function errorMessage(p: Promise<{ ok: boolean; error?: { message: string } }>): Promise<string> {
  const r = await p;
  expect(r.ok).toBe(false);
  return r.error?.message ?? "";
}

describe("0002_user_locale migration", () => {
  it("gives users created before it the default locale ko", async () => {
    const before = await createTestDb();
    try {
      await runMigrations(before, "accounts", migrations.slice(0, 1));
      await before.query(
        `insert into accounts.users (id, display_name, name_key, created_at) values ('u1', 'Old', 'old', now())`,
      );
      await runMigrations(before, "accounts", migrations);
      const r = await before.query<{ locale: string }>("select locale from accounts.users where id = 'u1'");
      expect(r.rows[0]?.locale).toBe("ko");
    } finally {
      await before.close();
    }
  });

  it("rejects unsupported locales at the database level", async () => {
    await expect(
      db.query(
        `insert into accounts.users (id, display_name, name_key, locale, created_at) values ('u2', 'X', 'x', 'fr', now())`,
      ),
    ).rejects.toThrow();
  });
});

describe("devLogin locale", () => {
  it("defaults a new user to ko", async () => {
    const { user } = await login("Alice");
    expect(user.locale).toBe("ko");
    expect((await accounts.getUser(user.id))?.locale).toBe("ko");
  });

  it.each(SUPPORTED_LOCALES)("sets %s for a new user", async (locale) => {
    const { user, token } = await login("Alice", locale);
    expect(user.locale).toBe(locale);
    expect((await accounts.authenticate(token.token))?.locale).toBe(locale);
  });

  it("updates an existing user's locale only when one is given", async () => {
    const first = await login("Alice", "zh");
    const unchanged = await login("alice");
    expect(unchanged.user.locale).toBe("zh");
    const changed = await login("ALICE", "en");
    expect(changed.user).toEqual({ ...first.user, locale: "en" });
    expect((await accounts.getUser(first.user.id))?.locale).toBe("en");
  });

  it("returns validation errors in the requested locale", async () => {
    const ko = await errorMessage(accounts.devLogin(""));
    const en = await errorMessage(accounts.devLogin("", "en"));
    const zh = await errorMessage(accounts.devLogin("", "zh"));
    expect(ko).toBe("표시 이름은 1자 이상 40자 이하여야 합니다.");
    expect(en).toBe("Display name must be 1 to 40 characters long.");
    expect(zh).toBe("显示名称须为 1 到 40 个字符。");
    expect(await errorMessage(accounts.devLogin("a b", "en"))).toBe(
      "Display name contains characters that are not allowed.",
    );
  });

  it("rejects an unsupported locale (in ko) without creating a user", async () => {
    const r = await accounts.devLogin("Alice", "fr" as Locale);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("invalid_input");
      expect(r.error.message).toBe("지원하지 않는 언어입니다. 사용할 수 있는 언어: ko, en, zh");
    }
    const n = await db.query<{ n: number }>("select count(*)::int as n from accounts.users");
    expect(n.rows[0]?.n).toBe(0);
  });
});

describe("setLocale", () => {
  it("validates and persists the locale", async () => {
    const { user, token } = await login("Alice");
    const r = await accounts.setLocale(user.id, "zh");
    expect(r).toEqual({ ok: true, value: { ...user, locale: "zh" } });
    expect(await accounts.getUser(user.id)).toEqual({ ...user, locale: "zh" });
    expect((await accounts.authenticate(token.token))?.locale).toBe("zh");
  });

  it("rejects an unsupported locale in the user's current language and keeps it", async () => {
    const { user } = await login("Alice", "en");
    const r = await accounts.setLocale(user.id, "de" as Locale);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("invalid_input");
      expect(r.error.message).toBe("This language is not supported. Available languages: ko, en, zh");
    }
    expect((await accounts.getUser(user.id))?.locale).toBe("en");
  });

  it("returns not_found for an unknown user, in the requested language", async () => {
    const r = await accounts.setLocale(asId<UserId>("nobody"), "zh");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("not_found");
      expect(r.error.message).toBe("找不到该用户。");
    }
  });
});

describe("errors for a known user use their locale", () => {
  it("issueToken label errors and revokeToken not_found follow the user's preference", async () => {
    const ko = await login("Kim");
    const en = await login("Emma", "en");
    const zh = await login("Wang", "zh");
    const label = (id: UserId) => errorMessage(accounts.issueToken(id, ""));
    expect(await label(ko.user.id)).toBe("토큰 이름은 1자 이상 40자 이하여야 합니다.");
    expect(await label(en.user.id)).toBe("Token name must be 1 to 40 characters long.");
    expect(await label(zh.user.id)).toBe("令牌名称须为 1 到 40 个字符。");
    expect(await errorMessage(accounts.revokeToken(en.user.id, "missing"))).toBe("Token not found.");
    expect(await errorMessage(accounts.revokeToken(zh.user.id, "missing"))).toBe("找不到该令牌。");
    expect(await errorMessage(accounts.revokeToken(ko.user.id, "missing"))).toBe("토큰을 찾을 수 없습니다.");
  });

  it("falls back to ko when the user is unknown", async () => {
    expect(await errorMessage(accounts.issueToken(asId<UserId>("nobody"), "cli"))).toBe("사용자를 찾을 수 없습니다.");
    expect(await errorMessage(accounts.issueToken(asId<UserId>("nobody"), ""))).toBe(
      "토큰 이름은 1자 이상 40자 이하여야 합니다.",
    );
  });
});
