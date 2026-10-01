import { describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../src/App.tsx";
import { errorMessage } from "../src/api/client.ts";
import { LOCALE_KEY, SUPPORTED_LOCALES } from "../src/i18n/locale.ts";
import { MESSAGES } from "../src/i18n/messages.ts";
import { createTranslator, translate, translator } from "../src/i18n/translator.ts";
import { AUTH_KEY, memoryStore } from "../src/storage.ts";
import { spyApi } from "./helpers.ts";

const NOW = Date.parse("2026-09-30T09:00:00Z");
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("message catalog", () => {
  it("has en and zh for every message with the same placeholders as ko", () => {
    for (const [id, text] of Object.entries(MESSAGES)) {
      const entry = text as { ko: string; en?: string; zh?: string };
      for (const l of ["en", "zh"] as const) {
        expect(entry[l], `${id}.${l}`).toBeTruthy();
        expect(placeholders(entry[l]!), `${id}.${l}`).toEqual(placeholders(entry.ko));
      }
    }
  });

  it("falls back to ko for a missing translation and to the id for an unknown key", () => {
    const catalog = { "only.ko": { ko: "한국어만 {n}개" }, "full": { ko: "가", en: "A", zh: "甲" } };
    expect(translate(catalog, "en", "only.ko", { n: 2 })).toBe("한국어만 2개");
    expect(translate(catalog, "zh", "only.ko", { n: 3 })).toBe("한국어만 3개");
    expect(translate(catalog, "en", "full")).toBe("A");
    expect(translate(catalog, "zh", "full")).toBe("甲");
    expect(translate(catalog, "en", "missing.key")).toBe("missing.key");
    const tr = createTranslator("en", catalog);
    expect(tr.has("only.ko")).toBe(true);
    expect(tr.t("only.ko" as never, { n: 1 })).toBe("한국어만 1개");
  });

  it("gives different text per locale and Korean by default", () => {
    const [ko, en, zh] = SUPPORTED_LOCALES.map((l) => translator(l).t("editor.submit"));
    expect(new Set([ko, en, zh]).size).toBe(3);
    expect(translator().t("editor.submit")).toBe(ko);
    expect(translator("en").t("hint.reveal", { level: 2 })).toBe("Show hint level 2");
    expect(translator("zh").t("hint.reveal", { level: 2 })).toBe("查看第 2 级提示");
    expect(errorMessage(new TypeError("offline"), translator("en"))).toContain("network");
    expect(errorMessage(new TypeError("offline"))).toContain("네트워크");
  });

  it("formats dates, percents and relative days with Intl per locale", () => {
    const iso = new Date(2026, 8, 30, 12).toISOString();
    expect(translator("ko").date(iso)).toBe("9월 30일");
    expect(translator("en").date(iso)).toBe("September 30");
    expect(translator("zh").date(iso)).toBe("9月30日");
    expect(translator("en").percent(0.62)).toBe("62%");
    const now = new Date(2026, 8, 30, 10).getTime();
    expect(translator("en").relativeDay(new Date(2026, 9, 3).toISOString(), now)).toBe("in 3 days");
    expect(translator("zh").relativeDay(new Date(2026, 8, 28).toISOString(), now)).toBe("2 天前");
    expect(translator("en").list(["a", "b"])).toBe("a, b");
    expect(translator("zh").list(["a", "b"])).toBe("a、b");
  });
});

describe("language switching", () => {
  it("switches UI strings in all three locales, saves the choice and refetches server content", async () => {
    const user = userEvent.setup();
    const api = spyApi();
    const store = memoryStore({ [AUTH_KEY]: JSON.stringify({ token: "t", displayName: "김하늘" }) });
    render(<App apiFactory={() => api} store={store} now={() => NOW} />);

    await user.click(await screen.findByRole("button", { name: /15분 세션 시작/ }));
    await screen.findByRole("heading", { name: /결과 예측/ });
    expect(document.documentElement.lang).toBe("ko");
    const exerciseCalls = api.exercise.mock.calls.length;

    await user.selectOptions(screen.getByRole("combobox", { name: "언어" }), "en");
    expect(await screen.findByRole("button", { name: /Submit for feedback/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Skip this exercise/ })).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Session steps" })).getByText("Review")).toBeInTheDocument();
    expect(screen.queryByText("제출하고 피드백 받기")).not.toBeInTheDocument();
    expect(api.updateMe).toHaveBeenLastCalledWith({ locale: "en" });
    expect(store.get(LOCALE_KEY)).toBe("en");
    expect(document.documentElement.lang).toBe("en");
    // Server-rendered content (exercise, skills) is fetched again once the server stored the locale.
    await waitFor(() => expect(api.exercise.mock.calls.length).toBeGreaterThan(exerciseCalls));
    expect(api.skills.mock.calls.length).toBeGreaterThan(1);

    await user.selectOptions(screen.getByRole("combobox", { name: "Language" }), "zh");
    expect(await screen.findByRole("button", { name: /提交并获取反馈/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /跳过此题/ })).toBeInTheDocument();
    expect(api.updateMe).toHaveBeenLastCalledWith({ locale: "zh" });
    expect(store.get(LOCALE_KEY)).toBe("zh");
    expect(document.documentElement.lang).toBe("zh-Hans");

    // The progress view shows Chinese chrome and the (fake) server's Chinese skill names.
    await user.click(screen.getByRole("button", { name: "学习进度" }));
    expect(await screen.findByRole("heading", { name: "学习进度" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /^列表转换：评分 1310/ })).toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox", { name: "语言" }), "ko");
    expect(await screen.findByRole("heading", { name: "진행 현황" })).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: /^리스트 변환: 레이팅 1310/ })).toBeInTheDocument();
    expect(api.updateMe).toHaveBeenLastCalledWith({ locale: "ko" });
    expect(api.updateMe).toHaveBeenCalledTimes(3);
  });

  it("switches on the login screen and sends the choice with dev-login", async () => {
    const user = userEvent.setup();
    const api = spyApi();
    const store = memoryStore();
    render(<App apiFactory={() => api} store={store} now={() => NOW} />);

    const group = screen.getByRole("group", { name: "언어" });
    await user.click(within(group).getByRole("button", { name: "English" }));
    expect(within(group).getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(api.updateMe).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /Start training/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Please enter a display name.");
    await user.type(screen.getByLabelText("Display name"), "Alex");
    await user.click(screen.getByRole("button", { name: /Start training/ }));
    expect(await screen.findByRole("button", { name: /Start 15-minute session/ })).toBeInTheDocument();
    expect(api.devLogin).toHaveBeenCalledWith({ displayName: "Alex", locale: "en" });
    expect(store.get(LOCALE_KEY)).toBe("en");
    expect((await api.me()).locale).toBe("en");
  });

  it("restores the stored locale on startup and pushes it to the account", async () => {
    const api = spyApi();
    const store = memoryStore({ [AUTH_KEY]: JSON.stringify({ token: "t", displayName: "김하늘" }), [LOCALE_KEY]: "zh" });
    render(<App apiFactory={() => api} store={store} now={() => NOW} />);
    expect(await screen.findByRole("button", { name: /开始 15 分钟训练回合/ })).toBeInTheDocument();
    // The fake account starts in Korean, so the browser's choice is saved to it.
    await waitFor(() => expect(api.updateMe).toHaveBeenCalledWith({ locale: "zh" }));
  });

  it("adopts the account's locale when this browser has none", async () => {
    const api = spyApi();
    await api.devLogin({ displayName: "Mei", locale: "zh" });
    const store = memoryStore({ [AUTH_KEY]: JSON.stringify({ token: "t", displayName: "Mei" }) });
    render(<App apiFactory={() => api} store={store} now={() => NOW} />);
    expect(await screen.findByRole("button", { name: /开始 15 分钟训练回合/ })).toBeInTheDocument();
    expect(store.get(LOCALE_KEY)).toBe("zh");
    expect(api.updateMe).not.toHaveBeenCalled();
  });
});
