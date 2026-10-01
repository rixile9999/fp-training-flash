import { afterEach, describe, expect, it } from "vitest";
import { SUPPORTED_LOCALES, type Locale } from "@fp/kernel";
import type { Evaluation } from "@fp/grading/contract";
import type { ChatRequest } from "../src/contract/index.ts";
import { MESSAGES, localize, msg, resolveLocale } from "../src/internal/messages.ts";
import { chatSystemPrompt, CHAT_SYSTEM_PROMPT, feedbackSystemPrompt, FEEDBACK_SYSTEM_PROMPT } from "../src/internal/prompts.ts";
import {
  EXERCISE_ID,
  LEARNER_CODE,
  USER,
  evaluations,
  fakeLlm,
  llmFeedbackJson,
  makeSubmission,
  setup,
  type Harness,
} from "./fixtures.ts";

let h: Harness | undefined;
afterEach(async () => {
  await h?.db.close();
  h = undefined;
});

const failedSub = makeSubmission("s-failed", evaluations.failed);
const LOCALES = ["en", "zh"] as const;

function ask(content: string, over: Partial<ChatRequest> = {}): ChatRequest {
  return { userId: USER, exerciseId: EXERCISE_ID, code: LEARNER_CODE, messages: [{ role: "user", content }], ...over };
}

describe("message catalog", () => {
  it("has a non-empty ko, en and zh text for every id", () => {
    for (const [id, text] of Object.entries(MESSAGES)) {
      for (const l of SUPPORTED_LOCALES) expect((text as Record<string, string>)[l], `${id}.${l}`).toMatch(/\S/);
    }
  });

  it("falls back to Korean for a missing translation and for an unsupported locale", () => {
    expect(localize({ ko: "{n}단계" }, "en", { n: 2 })).toBe("2단계");
    expect(localize({ ko: "{n}단계", zh: "第 {n} 级" }, "zh", { n: 2 })).toBe("第 2 级");
    expect(resolveLocale("fr")).toBe("ko");
    expect(resolveLocale(undefined)).toBe("ko");
    expect(msg("fr" as Locale, "error.chat_empty")).toBe(MESSAGES["error.chat_empty"].ko);
  });
});

describe("system prompts per locale", () => {
  const languageLines = (p: string) => p.split("\n").filter((l) => /^1\. |^5\. |^9\. /.test(l));
  const rest = (p: string) => p.split("\n").filter((l) => !/^1\. |^5\. |^9\. /.test(l));

  it("keeps the Korean prompts as the default", () => {
    expect(feedbackSystemPrompt()).toBe(FEEDBACK_SYSTEM_PROMPT);
    expect(chatSystemPrompt()).toBe(CHAT_SYSTEM_PROMPT);
    expect(FEEDBACK_SYSTEM_PROMPT).toContain("1. Write every string value in Korean (friendly 해요체, concise). No emoji.");
    expect(CHAT_SYSTEM_PROMPT).toContain('cite line numbers in the form "N행"');
  });

  it("changes only the language rule, the example phrase and the line form", () => {
    for (const l of LOCALES) {
      expect(rest(feedbackSystemPrompt(l))).toEqual(rest(FEEDBACK_SYSTEM_PROMPT));
      expect(rest(chatSystemPrompt(l))).toEqual(rest(CHAT_SYSTEM_PROMPT));
      expect(languageLines(feedbackSystemPrompt(l))).not.toEqual(languageLines(FEEDBACK_SYSTEM_PROMPT));
      expect(chatSystemPrompt(l)).not.toContain("해요체");
      expect(feedbackSystemPrompt(l)).not.toContain("해요체");
    }
    expect(feedbackSystemPrompt("en")).toContain('Write every string value in English (friendly, concise, second person "you")');
    expect(feedbackSystemPrompt("zh")).toContain("Write every string value in Simplified Chinese (简体中文");
    expect(chatSystemPrompt("en")).toContain('cite line numbers in the form "line N"');
    expect(chatSystemPrompt("zh")).toContain('cite line numbers in the form "第 N 行"');
    expect(chatSystemPrompt("zh")).toContain("address the learner as “你”");
  });
});

describe("feedback with an LLM in a locale", () => {
  it.each(LOCALES)("sends the %s language rule and localized content, fetched in that locale", async (locale) => {
    const llm = fakeLlm([llmFeedbackJson()]);
    h = await setup({ llm, submissions: [failedSub] });
    const r = await h.service.feedback(failedSub.id, USER, locale);
    expect(r.ok && r.value.source).toBe("llm");
    const req = llm.requests[0];
    expect(req?.system).toBe(feedbackSystemPrompt(locale));
    const content = req?.messages[0]?.content ?? "";
    expect(content).toContain(locale === "en" ? "Title: Apply a coupon" : "标题：使用优惠券");
    expect(content).toContain(msg(locale, "prompt.feedback_instruction"));
    expect(content).not.toContain("쿠폰 적용하기");
    expect(h.catalog.locales).toContain(`getExercise:${locale}`);
  });

  it("fetches the revealed reference solution in the requested locale", async () => {
    const llm = fakeLlm([llmFeedbackJson()]);
    h = await setup({ llm, submissions: [failedSub] });
    await h.service.revealExplanation(USER, EXERCISE_ID, "zh");
    await h.service.feedback(failedSub.id, USER, "zh");
    expect(h.catalog.locales.filter((c) => c.startsWith("getReferenceMaterial"))).toEqual([
      "getReferenceMaterial:zh",
      "getReferenceMaterial:zh",
    ]);
    expect(llm.requests[0]?.messages[0]?.content).toContain("参考解法：");
  });

  it("caches feedback per locale", async () => {
    const llm = fakeLlm([llmFeedbackJson()]);
    h = await setup({ llm, submissions: [failedSub] });
    await h.service.feedback(failedSub.id, USER);
    await h.service.feedback(failedSub.id, USER, "en");
    await h.service.feedback(failedSub.id, USER, "en");
    await h.service.feedback(failedSub.id, USER, "ko");
    expect(llm.requests.map((r) => r.system)).toEqual([feedbackSystemPrompt("ko"), feedbackSystemPrompt("en")]);
  });

  it.each([
    ["en", "All tests passed!"],
    ["zh", "所有测试都通过了！"],
  ] as const)("rejects a %s summary that claims all tests passed on a failing submission", async (locale, summary) => {
    const llm = fakeLlm([llmFeedbackJson({ summary })]);
    h = await setup({ llm, submissions: [failedSub] });
    const r = await h.service.feedback(failedSub.id, USER, locale);
    expect(r.ok && r.value.source).toBe("rule_based");
    expect(r.ok && r.value.summary).toBe(msg(locale, "fb.failed.summary", { total: 3, failed: 1 }));
  });
});

describe("rule-based feedback per locale", () => {
  async function ruleFeedback(locale: Locale | undefined, evaluation: Evaluation = evaluations.failed) {
    const sub = makeSubmission("s1", evaluation);
    h = await setup({ submissions: [sub], errorTags: [{ tag: "rounding_error", count: 3, lastSeenAt: "2026-09-29T00:00:00.000Z" }] });
    const r = await h.service.feedback(sub.id, USER, locale);
    if (!r.ok) throw new Error(r.error.message);
    await h.db.close();
    h = undefined;
    return r.value;
  }

  it("writes failed_tests feedback in en and zh, differently from ko", async () => {
    const ko = await ruleFeedback(undefined);
    const en = await ruleFeedback("en");
    const zh = await ruleFeedback("zh");
    expect(ko.summary).toBe("테스트 3개 중 1개가 실패했습니다.");
    expect(en.summary).toBe("1 of 3 tests failed.");
    expect(zh.summary).toBe("3 个测试中有 1 个失败。");
    expect(en.evidence[0]?.text).toBe("'rounds discount' failed: expected 90, got 89 (error type: rounding_error)");
    expect(zh.evidence[0]?.text).toBe("“rounds discount”失败：expected 90, got 89（错误类型：rounding_error）");
    expect(en.priorities[1]).toContain("3 times");
    expect(zh.priorities[1]).toContain("3 次");
    for (const fb of [en, zh]) {
      expect(fb.nextAction).not.toBe(ko.nextAction);
      expect(fb.evidence[0]?.testId).toBe("H2");
    }
  });

  it("cites compile error lines in each locale's form", async () => {
    expect((await ruleFeedback(undefined, evaluations.compileError)).nextAction).toContain("3행");
    expect((await ruleFeedback("en", evaluations.compileError)).nextAction).toContain("on line 3");
    expect((await ruleFeedback("zh", evaluations.compileError)).nextAction).toContain("第 3 行");
  });

  it("localizes the system_error apology and rubric notes", async () => {
    expect((await ruleFeedback("en", evaluations.systemError)).summary).toContain("isn't your fault");
    expect((await ruleFeedback("zh", evaluations.systemError)).summary).toContain("不是你的错");
    const en = await ruleFeedback("en", evaluations.passed);
    expect(en.summary).toBe("All tests passed. Nice work!");
    expect(en.rubricNotes[1]).toEqual({ rubricId: "R-02", verdict: "good", text: "You followed the 짧은 함수 criterion well." });
  });

  it("falls back to Korean for an unsupported locale", async () => {
    const fb = await ruleFeedback("fr" as Locale);
    expect(fb.summary).toBe("테스트 3개 중 1개가 실패했습니다.");
  });
});

describe("chat per locale", () => {
  it("writes the rule-based reply in en and zh, differently from ko", async () => {
    const replies: Record<string, string> = {};
    for (const locale of ["ko", "en", "zh"] as const) {
      h = await setup({ submissions: [failedSub] });
      await h.service.revealHint(USER, EXERCISE_ID, 1, locale);
      const r = await h.service.chat(ask("?", { submissionId: failedSub.id, locale }));
      expect(r.ok && r.value.source).toBe("rule_based");
      replies[locale] = r.ok ? r.value.message.content : "";
      await h.db.close();
      h = undefined;
    }
    expect(replies.ko).toContain("힌트 2단계");
    expect(replies.en).toContain("In your last submission, the 'rounds discount' test failed (expected 90, got 89).");
    expect(replies.en).toContain("open the level 2 hint");
    expect(replies.en).toContain('"list.map basics"');
    expect(replies.zh).toContain("“rounds discount”测试失败（expected 90, got 89）");
    expect(replies.zh).toContain("第 2 级提示");
    expect(replies.zh).toContain("list.map 基础");
    expect(replies.en).not.toBe(replies.ko);
    expect(replies.zh).not.toBe(replies.ko);
  });

  it("sends the locale's chat prompt and localized data, and extracts en/zh line references", async () => {
    const llm = fakeLlm(["Look at line 4. 也看看第2行和第 4 行。"]);
    h = await setup({ llm });
    await h.service.revealHint(USER, EXERCISE_ID, 1, "en");
    const r = await h.service.chat(ask("Where is the bug?", { locale: "en" }));
    expect(r.ok && r.value.references).toEqual([{ line: 4 }, { line: 2 }]);
    const sent = llm.requests[0];
    expect(sent?.system).toBe(chatSystemPrompt("en"));
    const context = sent?.messages[0]?.content ?? "";
    expect(context).toContain("[Level 1] Hint1: what do you do with each element?");
    expect(context).toContain("## Coding concept note: list.map basics");
    expect(context).toContain(msg("en", "prompt.chat_instruction"));
    expect(h.catalog.locales).toEqual(expect.arrayContaining(["getConceptNotes:en", "getTheoryTopics:en"]));
  });

  it("localizes validation errors", async () => {
    h = await setup();
    const en = await h.service.chat(ask(" ", { locale: "en" }));
    expect(!en.ok && en.error.message).toBe("Your question is empty.");
    const zh = await h.service.chat(ask("가".repeat(4001), { locale: "zh" }));
    expect(!zh.ok && zh.error.message).toBe("每条消息不能超过 4000 个字符。");
    const ko = await h.service.chat(ask(" "));
    expect(!ko.ok && ko.error.message).toBe("질문 내용이 비어 있습니다.");
  });
});

describe("hints and explanation per locale", () => {
  it("returns authored hints and errors in the requested locale", async () => {
    h = await setup();
    const hints = await h.service.revealHint(USER, EXERCISE_ID, 1, "zh");
    expect(hints.ok && hints.value[0]?.markdown).toBe("提示1：你要对每个元素做什么？");
    const skip = await h.service.revealHint(USER, EXERCISE_ID, 3, "en");
    expect(!skip.ok && skip.error.message).toBe("Open hints in order. The next level you can open is 2.");
    const range = await h.service.revealHint(USER, EXERCISE_ID, 9, "zh");
    expect(!range.ok && range.error.message).toBe("提示级别必须在 1 到 5 之间。");
    const ko = await h.service.revealHint(USER, EXERCISE_ID, 9);
    expect(!ko.ok && ko.error.message).toBe("힌트 단계는 1에서 5 사이여야 합니다.");
  });

  it("fetches the explanation in the requested locale", async () => {
    h = await setup();
    await h.service.revealExplanation(USER, EXERCISE_ID, "en");
    expect(h.catalog.locales).toEqual(["getExercise:en", "getReferenceMaterial:en"]);
  });
});
