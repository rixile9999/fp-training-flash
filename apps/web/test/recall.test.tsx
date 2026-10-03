import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditorView } from "@codemirror/view";
import { App } from "../src/App.tsx";
import { createFakeApi } from "../src/api/fake.ts";
import { LOCALE_KEY } from "../src/i18n/locale.ts";
import { AUTH_KEY, memoryStore } from "../src/storage.ts";
import { spyApi } from "./helpers.ts";

const NOW = Date.parse("2026-09-30T09:00:00Z");
const setup = (locale?: string) => {
  const api = spyApi();
  const clock = { t: NOW };
  const store = memoryStore({ [AUTH_KEY]: JSON.stringify({ token: "t", displayName: "김하늘" }), ...(locale ? { [LOCALE_KEY]: locale } : {}) });
  render(<App apiFactory={() => api} store={store} now={() => clock.t} initialView="recall" />);
  return { api, clock, user: userEvent.setup() };
};

describe("recall overview and deck browser", () => {
  it("shows due/new counts, deck progress, the start options and a deck browser without answers", async () => {
    const { api, user } = setup();
    await screen.findByRole("heading", { level: 1, name: "암기" });
    expect(screen.getByRole("button", { name: "암기", current: "page" })).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "주 메뉴" });
    expect(within(nav).getAllByRole("button").map((b) => b.textContent)).toEqual(["강의", "훈련", "암기", "진행 현황"]);
    expect(screen.getByText("지금 복습할 카드").nextElementSibling).toHaveTextContent("1");
    expect(screen.getByText("하루 최대 10장")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "문법: 2장 중 1장 학습, 0장 익힘" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "핵심 라이브러리: 1장 중 0장 학습, 0장 익힘" })).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "15분" }));
    await user.selectOptions(screen.getByLabelText("덱"), "stdlib");
    expect(screen.getByRole("button", { name: /시작 \(약 15분\)/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "문법 카드 보기" }));
    await screen.findByRole("heading", { level: 1, name: "문법" });
    expect(api.recallDeckCards).toHaveBeenCalledWith("syntax");
    const card = (await screen.findByRole("button", { name: /블록의 값/ })).closest("li")!;
    expect(within(card).getByText("빈칸")).toBeInTheDocument();
    expect(within(card).getByText("복습: 오늘")).toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: /case와 _/ }).closest("li")!).getByText("새 카드")).toBeInTheDocument();
    await user.click(within(card).getByRole("button", { name: /블록의 값/ }));
    expect(within(card).getByRole("button", { expanded: true })).toBeInTheDocument();
    expect(within(card).getByText(/마지막 식의 값이 블록 전체의 값/)).toBeInTheDocument();
    expect(within(card).getByLabelText("예제")).toHaveTextContent("x * 3");
    expect(card).not.toHaveTextContent("____");
    // Re-selecting the tab outside a session goes back to the overview.
    await user.click(within(nav).getByRole("button", { name: "암기" }));
    await screen.findByRole("heading", { level: 1, name: "암기" });
  });
});

describe("recall session", () => {
  it("runs every form (cloze, intro + recognize, predict, produce) with keys, keeps state across tabs and ends with a summary", async () => {
    const { api, clock, user } = setup();
    await user.click(await screen.findByRole("button", { name: /시작 \(약 10분\)/ }));
    expect(api.startRecall).toHaveBeenCalledWith({ minutes: 10 });

    // 1. Review, cloze: inline blank, Enter submits.
    await screen.findByText("문항 1/6");
    expect(screen.getByText("복습")).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "빈칸" }), "let{Enter}");
    expect(await screen.findByText("정답이에요")).toBeInTheDocument();
    await user.keyboard("{Enter}");

    // 2. New card: intro (not timed), then recognize answered with key 2 (wrong).
    await screen.findByText("문항 2/6");
    expect(screen.getAllByText("새 카드").length).toBeGreaterThan(0);
    expect(screen.getByText(/위에서부터 패턴을 맞춰/)).toBeInTheDocument();
    clock.t += 60_000;
    await user.click(screen.getByRole("button", { name: /문제 풀기/ }));
    clock.t += 4_000;
    await user.keyboard("2");
    expect(await screen.findByText("아직 아니에요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /else.*오답/ })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: /_.*정답/ })).toBeInTheDocument();
    expect(screen.getByText(/Gleam 키워드가 아닙니다/)).toBeInTheDocument();
    const [, req] = api.recallAnswer.mock.calls.at(-1)!;
    expect(req).toMatchObject({ response: { kind: "choice", choice: 1 }, elapsedMs: 4_000 });

    // The session survives a tab switch.
    await user.click(screen.getByRole("button", { name: "진행 현황" }));
    await screen.findByRole("heading", { name: "진행 현황" });
    await user.click(screen.getByRole("button", { name: "암기" }));
    expect(await screen.findByText("아직 아니에요")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /다음/ }));

    // 3. New card list.fold: signature in the intro, correct choice with key 2.
    await screen.findByText("문항 3/6");
    expect(screen.getByText("list.fold(List(a), from: b, with: fn(b, a) -> b) -> b")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /문제 풀기/ }));
    await user.keyboard("2");
    expect(await screen.findByRole("button", { name: /누적값, 원소.*정답/ })).toBeInTheDocument();
    await user.keyboard("{Enter}");

    // 4. Mix, cloze.
    await screen.findByText("문항 4/6");
    expect(screen.getByText("섞어서")).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "빈칸" }), "_{Enter}");
    await screen.findByText("정답이에요");
    await user.keyboard("{Enter}");

    // 5. Predict: typed value, expected shown.
    await screen.findByText("문항 5/6");
    await user.type(screen.getByRole("textbox", { name: "식의 값" }), "-6{Enter}");
    await screen.findByText("정답이에요");
    expect(screen.getByText("기대값").nextElementSibling).toHaveTextContent("-6");
    await user.keyboard("{Enter}");

    // 6. Finale, produce: header and brace fixed, hint, missing token, reference.
    await screen.findByText("문항 6/6");
    expect(screen.getByText("마무리")).toBeInTheDocument();
    const [head, close] = document.querySelectorAll(".recall-produce > .code-block");
    expect(head).toHaveTextContent("import gleam/list pub fn total(xs: List(Int)) -> Int {");
    expect(close).toHaveTextContent(/^}$/);
    await user.click(screen.getByRole("button", { name: /힌트 보기/ }));
    expect(screen.getByText(/시작값은 0이고/)).toBeInTheDocument();
    const view = EditorView.findFromDOM(await screen.findByRole("textbox", { name: "코드 편집기: total 본문" }))!;
    view.dispatch({ changes: { from: 0, insert: "int.sum(xs)" } });
    await user.click(screen.getByRole("button", { name: "확인" }));
    expect(await screen.findByText("아직 아니에요")).toBeInTheDocument();
    expect(screen.getByText("꼭 써야 하는 요소가 빠졌어요: list.fold")).toBeInTheDocument();
    expect(screen.getByLabelText("모범 답안")).toHaveTextContent("list.fold(xs, 0, fn(acc, x) { acc + x })");
    expect(api.recallAnswer.mock.calls.at(-1)![1]).toMatchObject({ response: { kind: "code", body: "int.sum(xs)" } });
    await user.click(screen.getByRole("button", { name: "결과 보기" }));

    await screen.findByRole("heading", { level: 1, name: "암기를 마쳤어요" });
    expect(screen.getByText("답한 문항").nextElementSibling).toHaveTextContent("6");
    expect(screen.getByText("정답률").nextElementSibling).toHaveTextContent("67%");
    expect(screen.getByText("새로 배운 카드").nextElementSibling).toHaveTextContent("2");
    expect(screen.getByRole("img", { name: "핵심 라이브러리: 1장 중 1장 학습, 0장 익힘" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "암기 홈으로" }));
    await screen.findByRole("heading", { level: 1, name: "암기" });
  });
});

describe("recall in en and zh", () => {
  it.each([
    ["en", "Recall", "Start (about 10 min)", "Syntax: seen 1/2, mastered 0"],
    ["zh", "记忆", "开始（约 10 分钟）", "语法：已学 1/2，已掌握 0"],
  ])("renders the overview in %s", async (locale, title, start, meter) => {
    setup(locale);
    await screen.findByRole("heading", { level: 1, name: title });
    expect(screen.getByRole("button", { name: new RegExp(start.replace(/[()（）]/g, ".")) })).toBeInTheDocument();
    // Deck titles are server-rendered: refetched once the account's locale is updated.
    expect(await screen.findByRole("img", { name: meter })).toBeInTheDocument();
  });
});

describe("fake recall grading", () => {
  it("accepts a produce body with every mustUse token and reports an empty body", async () => {
    const api = createFakeApi({ now: () => NOW });
    const s = await api.startRecall({ deckIds: ["stdlib"] });
    const produce = s.items.find((i) => i.form === "produce")!;
    const ok = await api.recallAnswer(s.sessionId, { itemId: produce.itemId, response: { kind: "code", body: "list.fold(xs, 0, fn(a, x) { a + x })" }, elapsedMs: 20_000 });
    expect(ok).toMatchObject({ correct: true, rating: "good", actual: "#(6, 0, 5)" });
    // Idempotent per item.
    expect(await api.recallAnswer(s.sessionId, { itemId: produce.itemId, response: { kind: "code", body: "" }, elapsedMs: 1 })).toEqual(ok);
    const s2 = await api.startRecall({ deckIds: ["syntax"] });
    const p2 = s2.items.find((i) => i.form === "produce")!;
    expect(await api.recallAnswer(s2.sessionId, { itemId: p2.itemId, response: { kind: "code", body: " " }, elapsedMs: 1 })).toMatchObject({ correct: false, diagnostics: ["함수 본문이 비어 있습니다."] });
  });
});
