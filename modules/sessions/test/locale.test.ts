import { afterEach, describe, expect, it } from "vitest";
import type { AppError, Locale, Result } from "@fp/kernel";
import { MESSAGES, render, resolveLocale, t } from "../src/messages.ts";
import { estimate, exercise, review, setup, skill, USER, type Harness } from "./fakes.ts";

function must<T>(r: Result<T, AppError>): T {
  if (!r.ok) throw new Error(`expected ok, got ${r.error.code}: ${r.error.message}`);
  return r.value;
}

const errorMessage = <T>(r: Result<T, AppError>): string | null => (r.ok ? null : r.error.message);

let h: Harness | undefined;
afterEach(async () => {
  expect(h?.handlerErrors ?? []).toEqual([]);
  await h?.db.close();
  h = undefined;
});

const placeholders = (s: string): string[] => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? "").sort();

describe("message catalog", () => {
  it("has en and zh for every message, with the same placeholders as ko and different text", () => {
    for (const [id, text] of Object.entries(MESSAGES)) {
      for (const locale of ["en", "zh"] as const) {
        const translated = text[locale];
        expect(translated, `${id}.${locale}`).toBeTruthy();
        expect(translated, `${id}.${locale}`).not.toBe(text.ko);
        expect(placeholders(translated), `${id}.${locale}`).toEqual(placeholders(text.ko));
      }
    }
  });

  it("falls back to ko when a translation is missing and fills placeholders", () => {
    expect(render({ ko: "복습 {n}개" }, "en", { n: 2 })).toBe("복습 2개");
    expect(render({ ko: "복습 {n}개", zh: "复习 {n} 个" }, "zh", { n: 2 })).toBe("复习 2 个");
    expect(t("ko", "reason.review", { skill: "데이터 변환" })).toBe("복습 예정: 데이터 변환");
    expect(t("en", "reason.review", { skill: "data transformation" })).toBe("Review due: data transformation");
  });

  it("normalises unknown or missing locales to ko", () => {
    expect(resolveLocale(undefined)).toBe("ko");
    expect(resolveLocale(null)).toBe("ko");
    expect(resolveLocale("fr")).toBe("ko");
    expect(resolveLocale("zh")).toBe("zh");
  });
});

describe("localized session reasons", () => {
  const skills = [skill("a", 1), skill("r", 2)];
  const exs = [
    exercise("a1", "base", "a"),
    exercise("a1", "alt", "a", { title: "쿠폰 적용 변형", difficulty: 1250 }),
    exercise("r1", "base", "r"),
    exercise("c1", "base", "a", { format: "challenge" }),
  ];
  const learner = { reviews: [review("r", "2026-09-29T00:00:00.000Z")] };

  const reasons = async (x: Harness, locale?: Locale): Promise<string[]> => {
    const req = { userId: USER, language: "gleam" as const, targetMinutes: 30, includeChallenge: true };
    const s = must(await x.service.start(locale === undefined ? req : { ...req, locale }));
    return s.items.map((i) => i.reason);
  };

  it("writes reasons in ko by default and in en/zh with localized skill names and titles", async () => {
    h = await setup(skills, exs, learner);
    const ko = await reasons(h);
    expect(ko).toEqual([
      "복습 예정: 기술-r",
      "학습 시작: 기술-a (입문 난이도)",
      "변형 연습: 같은 문제의 다른 변형 — 쿠폰 적용 변형",
      "도전 과제 (선택): 기술-a",
    ]);
    expect(await reasons(h, "ko")).toEqual(ko);

    const en = await reasons(h, "en");
    expect(en).toEqual([
      "Review due: Skill-r",
      "Getting started: Skill-a (entry level)",
      "Variation: another variant of the same exercise — [en] 쿠폰 적용 변형",
      "Challenge (optional): Skill-a",
    ]);

    const zh = await reasons(h, "zh");
    expect(zh).toEqual([
      "待复习：能力-r",
      "开始学习：能力-a（入门难度）",
      "变式练习：同一道题的另一种变式——[zh] 쿠폰 적용 변형",
      "挑战题（可选）：能力-a",
    ]);
    for (let i = 0; i < ko.length; i++) {
      expect(en[i]).not.toBe(ko[i]);
      expect(zh[i]).not.toBe(ko[i]);
    }
  });

  it("falls back to the Korean skill name when the catalog has no translation", async () => {
    h = await setup(skills, exs, learner, { untranslatedSkills: ["r"] });
    const en = await reasons(h, "en");
    expect(en[0]).toBe("Review due: 기술-r");
    expect(en[1]).toBe("Getting started: Skill-a (entry level)");
  });

  it("treats an unsupported locale from untyped callers as ko", async () => {
    h = await setup(skills, exs, learner);
    const s = must(
      await h.service.start({ userId: USER, language: "gleam", targetMinutes: 30, locale: "fr" as Locale }),
    );
    expect(s.items[0]?.reason).toBe("복습 예정: 기술-r");
  });
});

describe("localized recommendations and errors", () => {
  it("recommend() uses the requested locale and defaults to ko", async () => {
    h = await setup([skill("a", 1)], [exercise("a1", "base", "a", { difficulty: 1300 })], {
      estimates: [estimate("a", 1300)],
      esByDifficulty: { 1300: 0.66 },
    });
    expect(must(await h.service.recommend(USER, "gleam")).reason).toBe(
      "집중 연습: 기술-a — 지금 가장 약한 기술 (예상 성공률 66%)",
    );
    expect(must(await h.service.recommend(USER, "gleam", undefined, "en")).reason).toBe(
      "Focused practice: Skill-a — your weakest skill right now (expected success 66%)",
    );
    expect(must(await h.service.recommend(USER, "gleam", "a" as never, "zh")).reason).toBe(
      "所选能力专项训练：能力-a（预计成功率 66%）",
    );
  });

  it("localizes start/recommend errors", async () => {
    h = await setup([skill("a", 1)], []);
    expect(errorMessage(await h.service.recommend(USER, "gleam"))).toBe("아직 풀 수 있는 연습 문제가 없습니다.");
    expect(errorMessage(await h.service.recommend(USER, "gleam", undefined, "en"))).toBe(
      "There are no exercises you can solve yet.",
    );
    const bad = await h.service.start({ userId: USER, language: "gleam", targetMinutes: 0, locale: "zh" });
    expect(bad.ok ? null : bad.error.code).toBe("invalid_input");
    expect(errorMessage(bad)).toBe("目标时长必须在 1 到 240 分钟之间。");
  });

  it("stores the locale on the session and reuses it for skip and complete", async () => {
    h = await setup([skill("a", 1)], [exercise("a1", "base", "a")]);
    const s = must(await h.service.start({ userId: USER, language: "gleam", targetMinutes: 5, locale: "en" }));
    expect(s.items.map((i) => i.kind)).toEqual(["focus"]);

    const skipped = must(await h.service.skip(s.id, USER));
    expect(skipped.currentIndex).toBeNull();
    expect(skipped.items[0]?.reason).toBe("Getting started: Skill-a (entry level)");
    expect(errorMessage(await h.service.skip(s.id, USER))).toBe("There's no exercise to skip.");
    expect((await h.service.get(s.id, USER))?.items[0]?.reason).toBe("Getting started: Skill-a (entry level)");

    // A new session (in zh) abandons the English one; its messages stay English.
    const next = must(await h.service.start({ userId: USER, language: "gleam", targetMinutes: 5, locale: "zh" }));
    expect(next.items[0]?.reason).toBe("开始学习：能力-a（入门难度）");
    expect(errorMessage(await h.service.complete(s.id, USER))).toBe("A session that was stopped can't be completed.");
    expect(errorMessage(await h.service.skip(s.id, USER))).toBe("This session isn't in progress.");
    must(await h.service.skip(next.id, USER));
    expect(errorMessage(await h.service.skip(next.id, USER))).toBe("没有可以跳过的题目。");
  });
});
