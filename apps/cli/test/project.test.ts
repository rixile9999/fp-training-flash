import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { publicTestModule, readLearnerCode, readMeta, writeProject } from "../src/project.ts";
import { EX_ID, PREDICT_ID, exerciseView, predictView } from "./fixtures.ts";

let base: string;
beforeEach(async () => {
  base = await mkdtemp(join(tmpdir(), "fp-cli-project-"));
});
afterEach(async () => {
  await rm(base, { recursive: true, force: true });
});

const read = (dir: string, rel: string) => readFile(join(dir, rel), "utf8");

describe("writeProject", () => {
  it("writes a Gleam project whose package name matches the test module", async () => {
    const report = await writeProject(base, exerciseView(), { sessionId: "sess-1" });
    expect(report.dir).toBe(join(base, "fp-work", "orders-apply-coupon-base"));
    expect((await readdir(report.dir)).sort()).toEqual([".fp.json", ".gitignore", "PROMPT.md", "gleam.toml", "src", "test"]);

    const toml = await read(report.dir, "gleam.toml");
    expect(toml).toMatch(/^name = "coupon"$/m);
    expect(toml).toContain("[dependencies]\ngleam_stdlib");
    expect(toml).toContain("[dev-dependencies]\ngleeunit");
    expect(await readdir(join(report.dir, "test"))).toEqual(["coupon_test.gleam"]);

    expect(await read(report.dir, "src/coupon.gleam")).toBe("pub fn apply(orders) {\n  todo\n}\n");
    expect(JSON.parse(await read(report.dir, ".fp.json"))).toEqual({
      exerciseId: EX_ID,
      moduleName: "coupon",
      kind: "implement",
      sessionId: "sess-1",
    });
    expect(report.kept).toEqual([]);
  });

  it("puts prompt, public tests, revealed hints and notes in PROMPT.md but no unrevealed hints", async () => {
    const { dir } = await writeProject(base, exerciseView());
    const md = await read(dir, "PROMPT.md");
    expect(md).toContain("# 쿠폰 적용하기");
    expect(md).toContain("`apply` 함수를 작성하세요");
    expect(md).toContain("coupon.apply([]) |> should.equal([])");
    expect(md).toContain("어떤 주문이 바뀌어야 하나요?");
    expect(md).toContain("## 개념 노트: list.map");
    expect(md).toContain("## 이론: 펑터");
    expect(md).not.toContain("SECRET-HINT");
  });

  it("never overwrites an edited learner file without force, but refreshes generated files", async () => {
    const { dir } = await writeProject(base, exerciseView());
    await writeFile(join(dir, "src/coupon.gleam"), "pub fn apply(o) { o }\n");
    await writeFile(join(dir, "PROMPT.md"), "stale");

    const second = await writeProject(base, exerciseView());
    expect(second.kept).toEqual(["src/coupon.gleam"]);
    expect(await read(dir, "src/coupon.gleam")).toBe("pub fn apply(o) { o }\n");
    expect(await read(dir, "PROMPT.md")).toContain("# 쿠폰 적용하기");

    const forced = await writeProject(base, exerciseView(), { force: true });
    expect(forced.kept).toEqual([]);
    expect(forced.written).toContain("src/coupon.gleam");
    expect(await read(dir, "src/coupon.gleam")).toContain("todo");
  });

  it("does not report an unchanged starter file as kept", async () => {
    await writeProject(base, exerciseView());
    const again = await writeProject(base, exerciseView());
    expect(again.kept).toEqual([]);
    expect(again.written).not.toContain("src/coupon.gleam");
  });

  it("refuses starter paths that escape the project directory", async () => {
    const view = exerciseView();
    const evil = { ...view, exercise: { ...view.exercise, starterFiles: [{ path: "../../escape.gleam", content: "x" }] } };
    await expect(writeProject(base, evil)).rejects.toThrow(/잘못된 파일 경로/);
  });

  it("writes predict exercises as an answer file without a Gleam project and without the answers", async () => {
    const { dir } = await writeProject(base, predictView());
    expect((await readdir(dir)).sort()).toEqual([".fp.json", "PROMPT.md", "answer.txt"]);
    const md = await read(dir, "PROMPT.md");
    expect(md).toContain("list.map(fn(x) { x * 2 })");
    expect(md).not.toContain("SECRET-ANSWER");

    await writeFile(join(dir, "answer.txt"), "  [2, 4, 6]\n");
    const meta = await readMeta(dir);
    expect(meta?.exerciseId).toBe(PREDICT_ID);
    expect(await readLearnerCode(dir, meta!)).toBe("[2, 4, 6]");
  });
});

describe("publicTestModule", () => {
  it("wraps bare test bodies, keeps full functions verbatim and hoists imports once", () => {
    const src = publicTestModule(exerciseView());
    const importLines = src.split("\n").filter((l) => l.startsWith("import "));
    expect(importLines).toEqual(["import gleeunit", "import gleeunit/should", "import coupon", "import gleam/list"]);
    expect(src).toContain("pub fn main() {\n  gleeunit.main()\n}");
    expect(src).toContain("pub fn t1_test() {\n  coupon.apply([]) |> should.equal([])\n}");
    expect(src).toContain("pub fn keeps_length_test() {");
    expect(src.match(/fn keeps_length_test/g)).toHaveLength(1);
  });

  it("gives colliding test ids distinct function names", () => {
    const view = exerciseView();
    const tests = [
      { id: "T-1", name: "a", code: "1 |> should.equal(1)" },
      { id: "t 1", name: "b", code: "2 |> should.equal(2)" },
    ];
    const src = publicTestModule({ ...view, exercise: { ...view.exercise, publicTests: tests } });
    expect(src).toContain("pub fn t_1_test()");
    expect(src).toContain("pub fn t_1_2_test()");
  });
});
