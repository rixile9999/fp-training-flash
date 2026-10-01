import { describe, expect, it } from "vitest";
import type { Session } from "@fp/api-contract";
import { stepStates } from "../src/session.ts";
import { parseExpectedActual } from "../src/screens/FeedbackView.tsx";
import { formatClock } from "../src/ui/labels.ts";
import { translator } from "../src/i18n/translator.ts";
import { AUTH_KEY, memoryStore, readAuth } from "../src/storage.ts";
import { parseBlocks } from "../src/ui/Markdown.tsx";
import { errorMessage, loadApiFactory } from "../src/api/client.ts";
import { ApiError } from "@fp/api-contract";

const item = (index: number, kind: Session["items"][number]["kind"]) =>
  ({ index, kind, exerciseId: `e${index}`, skillId: "s", reason: "", expectedSuccess: 0.6, status: "pending", submissionIds: [] }) as unknown as Session["items"][number];
const session = { items: [item(0, "review"), item(1, "focus"), item(2, "variation")] } as unknown as Session;

describe("stepStates", () => {
  it("maps session items and the feedback phase onto the five steps", () => {
    expect(stepStates(session, 0, "work", false)).toEqual({ review: "current", focus: "upcoming", feedback: "upcoming", variation: "upcoming", wrapup: "upcoming" });
    expect(stepStates(session, 1, "work", false).focus).toBe("current");
    expect(stepStates(session, 1, "feedback", false)).toMatchObject({ review: "done", focus: "done", feedback: "current" });
    expect(stepStates(session, 2, "feedback", false)).toMatchObject({ feedback: "done", variation: "current" });
    expect(stepStates(session, null, "work", false).wrapup).toBe("current");
    expect(stepStates(session, 1, "work", true).wrapup).toBe("current");
  });
});

describe("helpers", () => {
  it("splits gleeunit expected/got messages", () => {
    expect(parseExpectedActual("Values were not equal\nexpected: [1]\n     got: []")).toEqual({ expected: "[1]", actual: "[]", rest: "Values were not equal" });
    expect(parseExpectedActual("todo expression evaluated")).toBeNull();
    expect(parseExpectedActual(undefined)).toBeNull();
  });

  it("formats clocks and relative days", () => {
    expect(formatClock(65_000)).toBe("01:05");
    expect(formatClock(-5)).toBe("00:00");
    const now = new Date(2026, 8, 30, 10).getTime();
    const { relativeDay } = translator("ko");
    expect(relativeDay(new Date(2026, 8, 30, 23).toISOString(), now)).toBe("오늘");
    expect(relativeDay(new Date(2026, 9, 1, 1).toISOString(), now)).toBe("내일");
    expect(relativeDay(new Date(2026, 8, 28).toISOString(), now)).toBe("2일 지남");
  });

  it("reads stored auth defensively", () => {
    expect(readAuth(memoryStore())).toBeNull();
    expect(readAuth(memoryStore({ [AUTH_KEY]: "{bad" }))).toBeNull();
    expect(readAuth(memoryStore({ [AUTH_KEY]: JSON.stringify({ token: "t", displayName: "a" }) }))).toEqual({ token: "t", displayName: "a" });
  });

  it("parses the markdown subset", () => {
    expect(parseBlocks("a\nb\n\n- x\n- y\n\n```gleam\nfn()\n```").map((b) => b.kind)).toEqual(["p", "ul", "code"]);
  });

  it("picks the HTTP client or the fake from env", async () => {
    const calls: string[] = [];
    const fetchStub = (async (url: string) => {
      calls.push(url);
      return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
    }) as unknown as typeof fetch;
    const orig = globalThis.fetch;
    globalThis.fetch = fetchStub;
    try {
      await (await loadApiFactory({}))(undefined).health();
      await (await loadApiFactory({ VITE_API_URL: "http://api.test/" }))("tok").health();
    } finally {
      globalThis.fetch = orig;
    }
    expect(calls).toEqual(["http://localhost:8787/v1/health", "http://api.test/v1/health"]);
    const fake = await loadApiFactory({ VITE_FAKE_API: "1" });
    expect(fake(undefined)).toBe(fake("x"));
    expect(errorMessage(new ApiError(401, { code: "unauthorized", message: "x" }))).toContain("다시 로그인");
    expect(errorMessage(new TypeError("fetch failed"))).toContain("네트워크");
  });
});

describe("renderInline", async () => {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { renderInline } = await import("../src/ui/Markdown.tsx");
  it("renders code nested inside bold", () => {
    expect(renderToStaticMarkup(<p>{renderInline("a **b `c` d** e")}</p>)).toBe("<p>a <strong>b <code>c</code> d</strong> e</p>");
  });
});
