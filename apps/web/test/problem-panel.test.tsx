import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProblemPanel } from "../src/screens/ProblemPanel.tsx";
import { SKILLS } from "../src/api/fake-data.ts";
import { spyApi } from "./helpers.ts";

const COUPON = "orders-apply-coupon/base@1";

async function renderCoupon() {
  const api = spyApi();
  const view = await api.exercise(COUPON);
  render(<ProblemPanel api={api} view={view} skills={SKILLS} />);
  return { api, view };
}

describe("ProblemPanel notes", () => {
  it("folds both note panels by default and records noteOpened only on first open", async () => {
    const user = userEvent.setup();
    const { api, view } = await renderCoupon();

    const concept = screen.getByRole("button", { name: /코딩 개념 노트/ });
    const theory = screen.getByRole("button", { name: /이론 노트/ });
    expect(concept).toHaveAttribute("aria-expanded", "false");
    expect(theory).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(view.conceptNotes[0]!.title)).not.toBeInTheDocument();
    expect(screen.queryByText(view.theoryTopics[0]!.title)).not.toBeInTheDocument();
    expect(api.noteOpened).not.toHaveBeenCalled();

    await user.click(concept);
    expect(concept).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(view.conceptNotes[0]!.title)).toBeInTheDocument();
    expect(api.noteOpened).toHaveBeenCalledTimes(view.conceptNotes.length);
    for (const n of view.conceptNotes) expect(api.noteOpened).toHaveBeenCalledWith(COUPON, { kind: "concept", noteId: n.id });
    // Theory stays folded; the two panels are independent.
    expect(theory).toHaveAttribute("aria-expanded", "false");

    // Closing and reopening does not record again.
    await user.click(concept);
    await user.click(concept);
    expect(api.noteOpened).toHaveBeenCalledTimes(view.conceptNotes.length);

    await user.click(theory);
    expect(api.noteOpened).toHaveBeenLastCalledWith(COUPON, { kind: "theory", noteId: view.theoryTopics[0]!.id });
    expect(screen.getByText(view.theoryTopics[0]!.title)).toBeInTheDocument();
  });
});

describe("HintPanel", () => {
  it("reveals hints strictly in order and updates the 5-dot indicator", async () => {
    const user = userEvent.setup();
    const { api, view } = await renderCoupon();
    const hints = view.exercise.hints;

    expect(screen.getByText("힌트 사용은 감점하지 않고 기록만 합니다")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "힌트 5단계 중 0단계 사용" })).toBeInTheDocument();
    expect(screen.queryByText(hints[0]!.markdown)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "힌트 1단계 보기" }));
    expect(await screen.findByText(hints[0]!.markdown)).toBeInTheDocument();
    expect(screen.queryByText(/원소 개수를 유지하면서/)).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "힌트 5단계 중 1단계 사용" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "힌트 2단계 보기" }));
    await screen.findByRole("img", { name: "힌트 5단계 중 2단계 사용" });
    // Before level 3 the learner is told it removes the first submission from rating.
    expect(screen.getByText(/3단계부터는/)).toBeInTheDocument();

    expect(api.revealHint.mock.calls.map((c) => (c[1] as { level: number }).level)).toEqual([1, 2]);
    const list = screen.getByRole("list", { name: "공개한 힌트" });
    const levels = within(list).getAllByText(/단계 ·/).map((n) => n.textContent);
    expect(levels).toEqual(["1단계 · 질문", "2단계 · 개념"]);
  });

  it("starts from hints already revealed on the server", async () => {
    const api = spyApi();
    await api.revealHint(COUPON, { level: 1 });
    const view = await api.exercise(COUPON);
    render(<ProblemPanel api={api} view={view} skills={SKILLS} />);
    expect(screen.getByRole("img", { name: "힌트 5단계 중 1단계 사용" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "힌트 2단계 보기" })).toBeInTheDocument();
  });
});
