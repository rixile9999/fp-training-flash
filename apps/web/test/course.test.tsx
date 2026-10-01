import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Quiz } from "@fp/api-contract";
import { App } from "../src/App.tsx";
import { FAKE_LESSONS } from "../src/api/generated/fake-lessons.ts";
import { AUTH_KEY, memoryStore } from "../src/storage.ts";
import { spyApi } from "./helpers.ts";

const NOW = Date.parse("2026-09-30T09:00:00Z");
const setup = () => {
  const api = spyApi();
  const store = memoryStore({ [AUTH_KEY]: JSON.stringify({ token: "t", displayName: "김하늘" }) });
  render(<App apiFactory={() => api} store={store} now={() => NOW} initialView="course" />);
  return { api, user: userEvent.setup() };
};
/** The answer index of a (Korean) quiz item, looked up in the sample lessons. */
const answerOf = (item: Quiz["items"][number]) =>
  FAKE_LESSONS.flatMap((l) => l.blocks).find((b) => b.kind === "exercise" && b.prompt.ko === item.prompt && b.choices.every((c, i) => c.ko === item.choices[i])) as { answer: number };
const region = (name: RegExp) => screen.findByRole("region", { name });

describe("course map", () => {
  it("shows levels, unit cards with progress and locks, the placement call to action and a continue button", async () => {
    const { user } = setup();
    await screen.findByRole("heading", { level: 1, name: "강의" });
    expect(screen.getByRole("heading", { name: "이미 Gleam을 아시나요? 5분 진단으로 건너뛰기" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2, name: /^레벨 \d$/ })).toHaveLength(4);
    const first = screen.getByRole("button", { name: "값, 불변성, 표현식" }).closest("article")!;
    expect(within(first).getByText("레슨 1/5")).toBeInTheDocument();
    expect(screen.getAllByText("잠김")).toHaveLength(14);
    // Locked units stay openable.
    await user.click(screen.getByRole("button", { name: "함수와 파이프" }));
    await screen.findByRole("heading", { level: 1, name: "함수와 파이프" });
    expect(screen.getByText(/선수 단원\(값, 불변성, 표현식\)/)).toBeInTheDocument();
  });
});

describe("lesson player", () => {
  it("gives feedback per choice, allows retries, reveals the answer on giveUp and moves on after completion", async () => {
    const { api, user } = setup();
    await user.click(await screen.findByRole("button", { name: /이어서 학습: 불변성과 shadowing/ }));
    const ex1 = await region(/x의 값은/);
    // Blocks after the first unsolved exercise are not shown yet.
    expect(screen.queryByRole("region", { name: /total = total/ })).not.toBeInTheDocument();

    await user.click(within(ex1).getByRole("button", { name: "2" }));
    await within(ex1).findByText(/두 번째 줄까지만 계산했어요/);
    expect(within(ex1).getByRole("button", { name: "2 오답" })).toBeInTheDocument();
    await user.click(within(ex1).getByRole("button", { name: "20" }));
    await within(ex1).findByText("정답이에요");
    expect(within(ex1).getByRole("button", { name: "20 정답" })).toHaveAttribute("aria-disabled", "true");
    expect(within(ex1).getByRole("button", { name: "2 오답" })).toBeInTheDocument();
    expect(api.lessonAnswer).toHaveBeenCalledWith("u01-values", "l02-immutability", { exerciseId: "shadowing-value", choice: 0 });

    const ex2 = await region(/total = total \+ 100/);
    await user.click(within(ex2).getByRole("button", { name: /정답 보기/ }));
    await within(ex2).findByText("정답 공개");
    expect(within(ex2).getByRole("button", { name: /재대입이 없다 정답$/ })).toBeInTheDocument();
    expect(api.lessonAnswer).toHaveBeenLastCalledWith("u01-values", "l02-immutability", { exerciseId: "reassign-illegal", choice: null, giveUp: true });
    // giveUp does not count as solved.
    expect(screen.getByText("3개 중 1개 해결")).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: /레슨 완료/ })).not.toBeInTheDocument();
    await user.click(within(await region(/두 줄의 출력/)).getByRole("button", { name: /정답 보기/ }));
    expect(screen.getByText("다음 레슨: Int와 Float는 남남")).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: /레슨 완료/ }));
    await screen.findByRole("heading", { level: 1, name: "Int와 Float는 남남" });
    expect(api.lessonComplete).toHaveBeenCalledWith("u01-values", "l02-immutability");
  });
});

describe("checkpoint", () => {
  it("submits all items (unanswered as null), shows score, rating change and a review with backlinks", async () => {
    const { api, user } = setup();
    await user.click(await screen.findByRole("button", { name: "값, 불변성, 표현식" }));
    await user.click(await screen.findByRole("button", { name: "체크포인트 시작" }));
    await user.click(await screen.findByRole("button", { name: "체크포인트 시작" }));
    const prompt = await screen.findByRole("region", { name: /값을 이름에 묶는/ });
    await user.click(within(prompt).getByRole("button", { name: "x = 5" }));
    expect(within(prompt).getByRole("button", { name: "x = 5 선택함" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "8번 문항" }));
    expect(screen.getByText("답하지 않은 7문항은 오답 처리돼요")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "제출하고 결과 보기" }));

    await screen.findByRole("heading", { level: 1, name: "체크포인트 결과" });
    const answers = api.submitCheckpoint.mock.calls[0]![1].answers as Record<string, number | null>;
    expect(Object.values(answers)).toEqual([0, null, null, null, null, null, null, null]);
    expect(screen.getByText("미통과")).toBeInTheDocument();
    const rating = screen.getByRole("region", { name: "레이팅 변화" });
    expect(within(rating).getByText("Gleam 기초")).toBeInTheDocument();
    expect(screen.getAllByText("답하지 않음")).toHaveLength(7);
    expect(screen.getByText("오답 · 내 답")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /레슨에서 다시 보기/ })[0]!);
    await screen.findByRole("heading", { level: 1, name: "값과 let" });
    expect(document.activeElement).toHaveAttribute("id", "ex-bind-syntax");
  });

  it("fake grades on the server side: a passed checkpoint unlocks the next unit, an empty placement is beginner", async () => {
    const api = spyApi();
    const q = await api.startCheckpoint("u01-values");
    expect(q.items).toHaveLength(8);
    expect(JSON.stringify(q)).not.toMatch(/"answer"|feedback/);
    const r = await api.submitCheckpoint(q.quizId, { answers: Object.fromEntries(q.items.map((i) => [i.itemId, answerOf(i).answer])) });
    expect(r).toMatchObject({ score: 8, total: 8, passed: true });
    expect(r.ratingChanges[0]).toMatchObject({ skillId: "gleam-basics", before: 1000 });
    const [u01, u02] = (await api.course()).units;
    expect(u01!.progress).toMatchObject({ checkpointPassed: true, checkpointBest: 1, passedByPlacement: false });
    expect(u02!.progress.unlocked).toBe(true);
    const p = await api.startPlacement();
    expect(await api.submitPlacement(p.quizId, { answers: {} })).toMatchObject({ band: "beginner", recommendation: "course", unitsPassed: [] });
  });
});

describe("placement", () => {
  it("recommends training for an advanced result and marks units as passed", async () => {
    const { api, user } = setup();
    await user.click(await screen.findByRole("button", { name: /진단 시작/ }));
    await user.click(await screen.findByRole("button", { name: /진단 시작/ }));
    const quiz = (await api.startPlacement.mock.results[0]!.value) as Quiz;
    for (const [i, item] of quiz.items.entries()) {
      await screen.findByText(`문항 ${i + 1}/12`);
      await user.click(within(document.querySelector<HTMLElement>(".quiz section")!).getAllByRole("button")[answerOf(item).answer]!);
      if (i < quiz.items.length - 1) await user.click(screen.getByRole("button", { name: /다음 문항/ }));
    }
    await user.click(screen.getByRole("button", { name: "제출하고 결과 보기" }));
    await screen.findByRole("heading", { level: 1, name: "진단 결과" });
    expect(screen.getByRole("heading", { name: "숙련" })).toBeInTheDocument();
    expect(screen.getByText("통과로 표시한 단원 15개")).toBeInTheDocument();
    const training = screen.getByRole("button", { name: /훈련으로 가기/ });
    expect(training).toHaveClass("btn-primary");
    await user.click(training);
    await screen.findByRole("button", { name: /15분 세션 시작/ });
    await user.click(screen.getByRole("button", { name: "강의" }));
    await screen.findByText(/진단 결과: 숙련 · 12\/12 정답/);
    expect(screen.getAllByText("진단으로 통과")).toHaveLength(15);
  });
});

describe("course locale switch", () => {
  it("switches chrome at once and refetches unit titles in en and zh", async () => {
    const { user } = setup();
    await screen.findByRole("button", { name: "값, 불변성, 표현식" });
    await user.selectOptions(screen.getByRole("combobox", { name: "언어" }), "en");
    await screen.findByRole("heading", { level: 1, name: "Course" });
    await screen.findByRole("button", { name: "Values, Immutability, Expressions" });
    await user.click(screen.getByRole("button", { name: /Continue: Immutability and shadowing/ }));
    await screen.findByRole("heading", { level: 1, name: "Immutability and shadowing" });
    await user.selectOptions(screen.getByRole("combobox", { name: "Language" }), "zh");
    await screen.findByRole("heading", { level: 1, name: "不可变性与 shadowing" });
    expect(screen.getByRole("button", { name: "课程" })).toHaveAttribute("aria-current", "page");
  });
});
