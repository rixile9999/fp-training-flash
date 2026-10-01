import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Locale } from "@fp/api-contract";
import { runCli } from "../src/cli.ts";
import type { CliApi, CliEnv } from "../src/cli.ts";
import { formatProgress, formatTrialRun } from "../src/format.ts";
import { MESSAGES, formatMessage, msg, normalizeLocale, pickLocale, resolveLocale, systemLocale } from "../src/messages.ts";
import { promptMarkdown, publicTestModule, writeProject } from "../src/project.ts";
import { exerciseView, failingRun, fakeApi } from "./fixtures.ts";
import type { Call } from "./fixtures.ts";

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("message catalog", () => {
  it("has en and zh for every message, different from ko, with the same placeholders", () => {
    for (const [id, text] of Object.entries(MESSAGES)) {
      const t = text as { ko: string; en?: string; zh?: string };
      for (const loc of ["en", "zh"] as const) {
        expect(t[loc], `${id}.${loc}`).toBeTruthy();
        expect(t[loc], `${id}.${loc}`).not.toBe(t.ko);
        expect(placeholders(t[loc] ?? ""), `${id}.${loc}`).toEqual(placeholders(t.ko));
      }
    }
  });

  it("falls back to Korean when a translation is missing and fills placeholders", () => {
    expect(pickLocale({ ko: "가", en: "a" }, "zh")).toBe("가");
    expect(pickLocale({ ko: "가", en: "a" }, "en")).toBe("a");
    expect(pickLocale({ ko: "가" })).toBe("가");
    expect(formatMessage("{a} and {b}", { a: 1 })).toBe("1 and {b}");
    expect(msg("en", "currentExercise", { title: "T", id: "x" })).toBe("Current exercise: T (x)");
    expect(msg("ko", "currentExercise", { title: "T", id: "x" })).toBe("현재 문제: T (x)");
  });
});

describe("locale resolution", () => {
  it("normalizes LANG-style values and ignores unsupported ones", () => {
    expect(normalizeLocale("en_US.UTF-8")).toBe("en");
    expect(normalizeLocale("zh-CN")).toBe("zh");
    expect(normalizeLocale("KO")).toBe("ko");
    expect(normalizeLocale("C")).toBeUndefined();
    expect(normalizeLocale("fr_FR")).toBeUndefined();
    expect(normalizeLocale(undefined)).toBeUndefined();
    expect(systemLocale({ LANG: "ko_KR.UTF-8", LC_ALL: "zh_CN.UTF-8" })).toBe("zh");
    expect(systemLocale({ LANG: "en_GB.UTF-8" })).toBe("en");
    expect(systemLocale({})).toBeUndefined();
  });

  it("orders sources: --lang > FP_LANG > account > config cache > system LANG > ko", () => {
    const all = { flag: "zh", env: "en", account: "ko", config: "en", system: "zh" } as const;
    expect(resolveLocale(all)).toEqual({ locale: "zh", source: "flag" });
    expect(resolveLocale({ ...all, flag: undefined })).toEqual({ locale: "en", source: "env" });
    expect(resolveLocale({ ...all, flag: undefined, env: "xx" })).toEqual({ locale: "ko", source: "account" });
    expect(resolveLocale({ config: "en", system: "zh" })).toEqual({ locale: "en", source: "config" });
    expect(resolveLocale({ system: "zh" })).toEqual({ locale: "zh", source: "system" });
    expect(resolveLocale({})).toEqual({ locale: "ko", source: "default" });
  });
});

describe("rendering per locale", () => {
  it("renders results in en and zh differently from ko", () => {
    const ko = formatTrialRun(failingRun);
    const en = formatTrialRun(failingRun, "en");
    const zh = formatTrialRun(failingRun, "zh");
    expect(ko).toContain("결과: 테스트 실패 (1/2 통과)");
    expect(en).toContain("Result: tests failed (1/2 passed)");
    expect(zh).toContain("结果：测试未通过（1/2 通过）");
    expect(new Set([ko, en, zh]).size).toBe(3);
    // Server-provided text (test names, messages) is passed through untouched.
    for (const s of [en, zh]) expect(s).toContain("Expected [] got [1]");
  });

  it("writes PROMPT.md headings in the display locale around the server-localized content", () => {
    const view = exerciseView();
    const en = promptMarkdown(view, "en");
    const zh = promptMarkdown(view, "zh");
    expect(promptMarkdown(view)).toContain("## 문제");
    expect(en).toContain("## Problem");
    expect(en).toContain("## Public tests");
    expect(en).toContain("**Level 1**: 어떤 주문이 바뀌어야 하나요?");
    expect(zh).toContain("## 题目");
    expect(zh).toContain("## 理论笔记：펑터");
    for (const md of [en, zh]) {
      expect(md).toContain(view.exercise.promptMarkdown);
      expect(md).not.toContain("SECRET-HINT");
    }
    expect(publicTestModule(view, "en")).toContain("// Only the public tests are here.");
    expect(publicTestModule(view, "zh")).toContain("// 这里只包含公开测试。");
  });
});

describe("fp with locales", () => {
  let root: string;
  let cwd: string;
  let env: CliEnv;
  let api: CliApi;
  let calls: Call[];
  let out: string[];
  let err: string[];

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "fp-cli-locale-"));
    cwd = join(root, "work");
    env = { FP_CONFIG_DIR: join(root, "config") };
    ({ api, calls } = fakeApi());
    await mkdir(cwd, { recursive: true });
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  async function fp(...argv: string[]): Promise<number> {
    out = [];
    err = [];
    return runCli(argv, { env, cwd, stdout: (t) => out.push(t), stderr: (t) => err.push(t), createClient: () => api, newKey: () => "key-1" });
  }
  const stdout = () => out.join("\n");
  const stderr = () => err.join("\n");
  const called = (m: string) => calls.filter((c) => c.method === m);
  const config = async () => JSON.parse(await readFile(join(root, "config", "config.json"), "utf8")) as Record<string, unknown>;
  const withAccount = (locale: Locale) => ({ api, calls } = fakeApi({}, locale));

  it("prints usage in Korean by default and in en/zh via --lang, FP_LANG or the system LANG", async () => {
    await fp("--help");
    const ko = stdout();
    expect(ko).toContain("사용법: fp");
    await fp("--help", "--lang", "en");
    expect(stdout()).toContain("Usage: fp <command>");
    env = { ...env, FP_LANG: "zh" };
    await fp("--help");
    expect(stdout()).toContain("用法：fp <命令>");
    env = { FP_CONFIG_DIR: env.FP_CONFIG_DIR, LANG: "en_US.UTF-8" };
    await fp("--help");
    expect(stdout()).toContain("Usage: fp <command>");
    env = { FP_CONFIG_DIR: env.FP_CONFIG_DIR, LANG: "fr_FR.UTF-8" };
    await fp("--help");
    expect(stdout()).toBe(ko);
  });

  it("rejects an unsupported --lang as a usage error", async () => {
    expect(await fp("progress", "--lang", "fr")).toBe(2);
    expect(stderr()).toContain("--lang");
    expect(calls).toEqual([]);
  });

  it("translates CLI errors (en, zh) and keeps Korean as the fallback", async () => {
    expect(await fp("whoami", "--lang", "en")).toBe(1);
    expect(stderr()).toContain("You need to log in. Run `fp login <name>` first.");
    expect(await fp("whoami", "--lang", "zh")).toBe(1);
    expect(stderr()).toContain("需要先登录");
    expect(await fp("whoami")).toBe(1);
    expect(stderr()).toContain("로그인이 필요합니다");
    expect(await fp("frobnicate", "--lang", "en")).toBe(2);
    expect(stderr()).toContain("Unknown command: frobnicate");
  });

  it("uses the account locale from login and caches it in the config", async () => {
    withAccount("en");
    expect(await fp("login", "Alex")).toBe(0);
    expect(stdout()).toContain("Logged in as Alex.");
    expect(called("devLogin")[0]?.args[0]).toEqual({ displayName: "Alex" });
    expect((await config()).locale).toBe("en");
    expect(await fp("progress")).toBe(0);
    expect(stdout()).toContain("Overall rating: 1216 (provisional)");
    expect(stdout()).toContain("Ratings by skill:");
  });

  it("reads the account locale from /v1/me when only FP_TOKEN is set; --lang and FP_LANG win over it", async () => {
    withAccount("zh");
    env = { ...env, FP_TOKEN: "env-token" };
    expect(await fp("progress")).toBe(0);
    expect(called("me")).toHaveLength(1);
    expect(stdout()).toContain("综合评分：1216（暂定）");

    calls.length = 0;
    expect(await fp("progress", "--lang", "en")).toBe(0);
    expect(called("me")).toEqual([]);
    expect(stdout()).toContain("Overall rating:");

    env = { ...env, FP_LANG: "ko" };
    expect(await fp("progress")).toBe(0);
    expect(called("me")).toEqual([]);
    expect(stdout()).toContain("종합 레이팅:");
  });

  it("falls back to the cached locale when /v1/me fails", async () => {
    await fp("login", "민수");
    await writeFile(join(root, "config", "config.json"), JSON.stringify({ ...(await config()), locale: "en" }));
    ({ api, calls } = fakeApi({ me: async () => Promise.reject(new TypeError("fetch failed")) }));
    expect(await fp("progress")).toBe(0);
    expect(stdout()).toContain("Overall rating:");
  });

  it("fp lang <locale> updates the account, stores the choice and switches the output", async () => {
    await fp("login", "민수");
    expect(await fp("lang", "en")).toBe(0);
    expect(called("updateMe")[0]?.args[0]).toEqual({ locale: "en" });
    expect(stdout()).toContain("Display language set to English (en).");
    expect((await config()).locale).toBe("en");

    expect(await fp("lang")).toBe(0);
    expect(stdout()).toBe("Display language: English (en) · from: account setting");
    expect(await fp("progress")).toBe(0);
    expect(stdout()).toContain("Overall rating:");

    expect(await fp("lang", "zh")).toBe(0);
    expect(stdout()).toContain("显示语言已设为简体中文（zh）");
    expect(await fp("lang", "ko", "--json")).toBe(0);
    expect(JSON.parse(stdout())).toMatchObject({ locale: "ko", synced: true, user: { locale: "ko" } });

    expect(await fp("lang", "fr")).toBe(2);
    expect(stderr()).toContain("지원하지 않는 언어입니다: fr");
  });

  it("fp lang while logged out saves locally and applies it at the next login", async () => {
    expect(await fp("lang", "zh")).toBe(0);
    expect(called("updateMe")).toEqual([]);
    expect(stdout()).toContain("下次 `fp login` 时会同步到账户");
    expect(await fp("login", "小明")).toBe(0);
    expect(called("devLogin")[0]?.args[0]).toEqual({ displayName: "小明", locale: "zh" });
    expect(stdout()).toContain("已以 小明 身份登录");
  });

  it("fp lang warns when FP_LANG overrides the stored choice", async () => {
    await fp("login", "민수");
    env = { ...env, FP_LANG: "ko" };
    expect(await fp("lang", "en")).toBe(0);
    expect(stdout()).toContain("FP_LANG=ko");
  });

  it("writes the exercise and PROMPT.md in the account's language", async () => {
    withAccount("en");
    await fp("login", "Alex");
    expect(await fp("next")).toBe(0);
    expect(stdout()).toContain("Current exercise:");
    expect(stdout()).toContain("Write your code, check it with `fp run`");
    const md = await readFile(join(cwd, "fp-work", "orders-apply-coupon-base", "PROMPT.md"), "utf8");
    expect(md).toContain("## Problem");
    expect(md).toContain("## How to work");
  });

  it("writeProject defaults to Korean headings", async () => {
    const { dir } = await writeProject(cwd, exerciseView());
    expect(await readFile(join(dir, "PROMPT.md"), "utf8")).toContain("## 사용법");
  });

  it("renders the other formatters in zh", () => {
    const p = formatProgress(
      {
        profile: {
          userId: "u" as never,
          language: "gleam",
          estimates: [],
          overall: null,
          reviews: [],
          errorTags: [{ tag: "off_by_one", count: 2, lastSeenAt: "2026-09-29T00:00:00.000Z" }],
          policyVersion: "elo-v1",
        },
        skills: [],
      },
      "zh",
    );
    expect(p).toBe("综合评分：暂无\n反复出现的错误：\n  off_by_one（2 次）");
  });
});
