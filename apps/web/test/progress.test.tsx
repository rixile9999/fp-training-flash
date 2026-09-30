import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Progress } from "../src/screens/Progress.tsx";
import { RangeBar, axisPos, rangeLabel } from "../src/ui/RangeBar.tsx";
import { spyApi } from "./helpers.ts";

const NOW = Date.parse("2026-09-30T09:00:00Z");

describe("RangeBar", () => {
  it("describes rating and range in its aria-label and clamps to the 1000..1800 axis", () => {
    render(<RangeBar skill="재귀" rating={1750} deviation={120} provisional />);
    const bar = screen.getByRole("img", { name: "재귀: 레이팅 1750, 추정 범위 1630부터 1870까지 (잠정)" });
    const band = bar.querySelector(".range-band") as HTMLElement;
    expect(band.style.left).toBe(`${axisPos(1630)}%`);
    // The band is clipped at the axis end (1800 = 100%).
    expect(parseFloat(band.style.left) + parseFloat(band.style.width)).toBeCloseTo(100);
    expect(axisPos(900)).toBe(0);
    expect(rangeLabel("x", 1200.4, 80.6)).toBe("x: 레이팅 1200, 추정 범위 1119부터 1281까지");
  });
});

describe("Progress screen", () => {
  it("lists per-skill ratings with labelled range bars, reviews and error tags", async () => {
    const api = spyApi();
    render(<Progress api={api} now={() => NOW} recent={[]} hasActiveSession={false} onStart={vi.fn()} onResume={vi.fn()} busy={false} />);

    expect(await screen.findByRole("heading", { name: "진행 현황" })).toBeInTheDocument();
    expect(api.progress).toHaveBeenCalledWith("gleam");
    expect(screen.getByRole("img", { name: "리스트 변환: 레이팅 1310, 추정 범위 1170부터 1450까지 (잠정)" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "패턴 매칭: 레이팅 1420, 추정 범위 1335부터 1505까지" })).toBeInTheDocument();

    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row").slice(1);
    // Ordered by the skill's learning-path order.
    expect(rows.map((r) => within(r).getByRole("rowheader").textContent)).toEqual(["리스트 변환잠정", "패턴 매칭", "Option과 Result잠정"]);
    expect(within(rows[0]!).getByText("±140")).toBeInTheDocument();
    expect(within(rows[0]!).getByText("3회")).toBeInTheDocument();

    const overall = screen.getByRole("region", { name: "전체 레이팅" });
    expect(within(overall).getByText("잠정")).toBeInTheDocument();

    const reviews = screen.getByRole("region", { name: /복습 일정/ });
    expect(within(reviews).getAllByRole("listitem")[0]).toHaveTextContent("Option과 Result");
    const tags = screen.getByRole("region", { name: /반복되는 실수/ });
    expect(within(tags).getByText("filter로 남겨야 할 원소를 버림")).toBeInTheDocument();
  });

  it("starts a session from the progress page when none is active", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<Progress api={spyApi()} now={() => NOW} recent={[]} hasActiveSession={false} onStart={onStart} onResume={vi.fn()} busy={false} />);
    await user.click(await screen.findByRole("button", { name: /15분 세션 시작/ }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
