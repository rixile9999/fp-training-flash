import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CoachingFeedback } from "@fp/api-contract";
import { EditorView } from "@codemirror/view";
import { App } from "../src/App.tsx";
import { AUTH_KEY, memoryStore } from "../src/storage.ts";
import { deferred, spyApi } from "./helpers.ts";

const NOW = Date.parse("2026-09-30T09:00:00Z");
const loggedIn = () => memoryStore({ [AUTH_KEY]: JSON.stringify({ token: "t", displayName: "김하늘" }) });

describe("login", () => {
  it("logs in by display name and stores the token", async () => {
    const user = userEvent.setup();
    const api = spyApi();
    const store = memoryStore();
    render(<App apiFactory={() => api} store={store} now={() => NOW} />);
    await user.click(screen.getByRole("button", { name: /훈련 시작하기/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("표시 이름을 입력해 주세요.");
    await user.type(screen.getByLabelText("표시 이름"), "김하늘");
    await user.click(screen.getByRole("button", { name: /훈련 시작하기/ }));
    expect(await screen.findByRole("button", { name: /15분 세션 시작/ })).toBeInTheDocument();
    expect(api.devLogin).toHaveBeenCalledWith({ displayName: "김하늘" });
    expect(JSON.parse(store.get(AUTH_KEY)!)).toMatchObject({ displayName: "김하늘", token: expect.stringMatching(/^fake-token/) });
  });
});

describe("training flow", () => {
  it("shows the evaluation layers immediately and the coach feedback only when it arrives", async () => {
    const user = userEvent.setup();
    const coaching = deferred<CoachingFeedback>();
    const base = spyApi();
    const api = spyApi({ ...base, feedback: () => coaching.promise });
    render(<App apiFactory={() => api} store={loggedIn()} now={() => NOW} />);

    await user.click(await screen.findByRole("button", { name: /15분 세션 시작/ }));
    expect(api.startSession).toHaveBeenCalledWith({ language: "gleam", targetMinutes: 15 });

    // First item: review (predict). Skip it to reach the coupon exercise.
    expect(await screen.findByRole("heading", { name: /결과 예측/ })).toBeInTheDocument();
    const stepper = screen.getByRole("list", { name: "세션 단계" });
    expect(within(stepper).getByText("복습").closest("li")).toHaveAttribute("aria-current", "step");
    await user.click(screen.getByRole("button", { name: /이 문제 건너뛰기/ }));
    expect(await screen.findByRole("heading", { name: "주문 목록에 쿠폰 적용하기" })).toBeInTheDocument();
    expect(within(stepper).getByText("집중 훈련").closest("li")).toHaveAttribute("aria-current", "step");

    // Replace `todo` with a filter-based answer (drops non-matching orders) through the real editor.
    const editor = EditorView.findFromDOM(screen.getByRole("textbox", { name: /코드 편집기/ }))!;
    const doc = editor.state.doc.toString();
    const at = doc.indexOf("todo");
    editor.dispatch({ changes: { from: at, to: at + 4, insert: "list.filter(orders, fn(o) { o.coupon == Some(code) })" } });
    await user.click(screen.getByRole("button", { name: /제출하고 피드백 받기/ }));
    expect(await screen.findByRole("heading", { name: /동작 정확성/ })).toBeInTheDocument();
    const submitReq = api.submit.mock.calls[0]![0] as { idempotencyKey: string; exerciseId: string; sessionId?: string };
    expect(submitReq.exerciseId).toBe("orders-apply-coupon/base@1");
    expect(submitReq.idempotencyKey).toMatch(/.{8,}/);
    expect(submitReq.sessionId).toBeDefined();

    expect(screen.getByRole("heading", { name: /과제 요구사항/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /코드 품질/ })).toBeInTheDocument();
    expect(screen.getByText("정답 판정과 레이팅에 반영하지 않음")).toBeInTheDocument();
    expect(screen.getAllByText("기대값").length).toBeGreaterThan(0);
    expect(screen.getByText(/첫 제출만 반영합니다/)).toBeInTheDocument();
    expect(within(stepper).getByText("피드백·재제출").closest("li")).toHaveAttribute("aria-current", "step");
    // Rating change for the first attempt: before -> after with the provisional badge.
    expect(screen.getByText("1310")).toBeInTheDocument();
    expect(screen.getAllByText("잠정").length).toBeGreaterThan(0);

    // Coaching is still loading while results are visible.
    expect(screen.getByText(/피드백을 작성하고 있습니다/)).toBeInTheDocument();
    expect(screen.queryByText("우선 과제")).not.toBeInTheDocument();

    const submissionId = (await api.submit.mock.results[0]!.value).submission.id as string;
    coaching.resolve(await base.feedback(submissionId));
    expect(await screen.findByText("우선 과제")).toBeInTheDocument();
    expect(screen.queryByText(/피드백을 작성하고 있습니다/)).not.toBeInTheDocument();
  });

  it("asks for confirmation before revealing the full explanation", async () => {
    const user = userEvent.setup();
    const api = spyApi();
    render(<App apiFactory={() => api} store={loggedIn()} now={() => NOW} />);
    await user.click(await screen.findByRole("button", { name: /15분 세션 시작/ }));
    await user.click(await screen.findByRole("button", { name: /이 문제 건너뛰기/ }));
    await user.click(await screen.findByRole("button", { name: /제출하고 피드백 받기/ }));

    await user.click(await screen.findByRole("button", { name: /전체 해설 보기/ }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent("새로운 변형 문제로 다시 확인");
    expect(api.explanation).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "해설 보기" }));
    expect(await screen.findByRole("heading", { name: /전체 해설/ })).toBeInTheDocument();
    expect(api.explanation).toHaveBeenCalledTimes(1);

    // Going back to the editor keeps the code and offers a resubmission.
    await user.click(screen.getByRole("button", { name: /코드 수정하고 재제출/ }));
    expect(await screen.findByRole("button", { name: /제출하고 피드백 받기/ })).toBeInTheDocument();
  });

  it("completes a session and shows the summary", async () => {
    const user = userEvent.setup();
    const api = spyApi();
    render(<App apiFactory={() => api} store={loggedIn()} now={() => NOW} />);
    await user.click(await screen.findByRole("button", { name: /15분 세션 시작/ }));
    await screen.findByRole("heading", { name: /결과 예측/ });
    await user.click(screen.getByLabelText("main()이 돌려주는 값"));
    await user.paste("[30, 40]");
    await user.click(screen.getByRole("button", { name: /제출하고 피드백 받기/ }));
    expect(await screen.findByText("정답")).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: /다음 문제: 집중 훈련/ }));
    expect(await screen.findByRole("heading", { name: "주문 목록에 쿠폰 적용하기" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /세션 마무리/ }));
    expect(await screen.findByRole("heading", { name: "세션을 마쳤습니다" })).toBeInTheDocument();
    expect(api.completeSession).toHaveBeenCalledTimes(1);
    expect(screen.getByText("통과").nextElementSibling).toHaveTextContent("1");
  });
});
