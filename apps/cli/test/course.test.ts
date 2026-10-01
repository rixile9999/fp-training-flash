import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Locale } from "@fp/api-contract";
import { parseAnswers, runCli } from "../src/cli.ts";
import type { CliApi, CliEnv } from "../src/cli.ts";
import { plainInline, plainText } from "../src/course.ts";
import { readlinePrompter } from "../src/prompt.ts";
import type { Prompter } from "../src/prompt.ts";
import { LESSON, LESSON2, UNIT, courseView, fakeApi, lessonView } from "./fixtures.ts";
import type { Call } from "./fixtures.ts";

let root: string;
let cwd: string;
let env: CliEnv;
let api: CliApi;
let calls: Call[];
let out: string[];
let err: string[];
let tty: { lines: (string | null)[]; asked: string[]; closed: boolean } | null;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "fp-cli-course-"));
  cwd = join(root, "work");
  env = { FP_CONFIG_DIR: join(root, "config"), FP_TOKEN: "tok" };
  ({ api, calls } = fakeApi());
  tty = null;
  await mkdir(cwd, { recursive: true });
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

/** A terminal that answers the queued lines in order (null = Ctrl-D). */
function terminal(...lines: (string | null)[]): void {
  tty = { lines, asked: [], closed: false };
}

async function fp(...argv: string[]): Promise<number> {
  out = [];
  err = [];
  const t = tty;
  const prompter = (): Prompter => ({
    ask: async (q) => {
      if (!t) throw new Error("no terminal");
      t.asked.push(q);
      out.push(`<ask ${q}>`);
      return t.lines.length > 0 ? (t.lines.shift() ?? null) : null;
    },
    close: () => {
      if (t) t.closed = true;
    },
  });
  return runCli(argv, {
    env,
    cwd,
    stdout: (s) => out.push(s),
    stderr: (s) => err.push(s),
    createClient: () => api,
    stdinIsTTY: t !== null,
    prompter,
  });
}
const stdout = () => out.join("\n");
const stderr = () => err.join("\n");
const called = (m: string) => calls.filter((c) => c.method === m);
const config = async () => JSON.parse(await readFile(join(root, "config", "config.json"), "utf8")) as Record<string, unknown>;

describe("markdown to plain text", () => {
  it("drops emphasis, backticks and link syntax but keeps fenced code indented", () => {
    expect(plainInline("**값**과 *이름*, `let x = 5`, [투어](https://tour.gleam.run)")).toBe(
      "값과 이름, let x = 5, 투어 (https://tour.gleam.run)",
    );
    expect(plainInline("`a * b` and 2 * 3 * 4")).toBe("a * b and 2 * 3 * 4");
    expect(plainInline("snake_case_name stays")).toBe("snake_case_name stays");
    expect(plainText("## 제목\n\n* 하나\n\n```gleam\nlet x = **1**\n```\n---")).toBe(
      "제목\n\n- 하나\n\n    let x = **1**\n" + "─".repeat(40),
    );
  });
});

describe("fp course", () => {
  it("lists units in order with progress, lessons of the current unit and the next step", async () => {
    expect(await fp("course")).toBe(0);
    const text = stdout();
    expect(text).toContain("Gleam 기초 코스");
    expect(text.indexOf("u01-values")).toBeLessThan(text.indexOf("u02-functions-pipes"));
    expect(text).toContain("▶ 1. 값, 불변성, 표현식 (u01-values) · L1 · 레슨 1/2 · 체크포인트 미응시");
    expect(text).toContain("✓ 값과 let (u01-values/l01-values-let)");
    expect(text).toContain(`▶ ${LESSON2}-title (u01-values/${LESSON2})`);
    expect(text).toContain("선행 단원 미완료");
    expect(text).toContain("fp placement");
    expect(text).toContain(`다음: \`fp lesson u01-values/${LESSON2}\``);
  });

  it("prints the API data with --json", async () => {
    expect(await fp("course", "--json")).toBe(0);
    expect(JSON.parse(stdout())).toEqual(courseView("ko"));
  });
});

describe("fp lesson", () => {
  it("next opens the course's next lesson: prose as plain text, numbered exercises and choices", async () => {
    expect(await fp("lesson")).toBe(0);
    expect(called("lesson")[0]?.args).toEqual([UNIT, LESSON2]);
    const text = stdout();
    expect(text).toContain(`값과 let (${UNIT}/${LESSON})`);
    expect(text).toContain("프로그램은 값을 다룹니다. let으로 값에 이름을 붙여요.");
    expect(text).toContain("    let pi = 3.14");
    expect(text).toContain("자세히: Gleam 투어 (https://tour.gleam.run)");
    expect(text).not.toMatch(/\*\*|`let`/);
    expect(text).toContain("[연습 1] bind-syntax · 객관식");
    expect(text).toContain("  1) x = 5\n  2) let x = 5\n  3) var x = 5");
    expect(text).toContain("[연습 2] let-use · 결과 예측");
    expect(text).toContain("    let total = 100 * 3");
    expect(text).toContain(`fp answer ${UNIT}/${LESSON} <연습 ID|번호> <선택 번호>`);
    expect(text).toContain(`fp lesson-done ${UNIT}/${LESSON}`);
  });

  it("an explicit unit/lesson is fetched directly; a bare unit opens its first unfinished lesson", async () => {
    expect(await fp("lesson", `${UNIT}/${LESSON}`)).toBe(0);
    expect(called("course")).toEqual([]);
    expect(called("lesson")[0]?.args).toEqual([UNIT, LESSON]);
    expect(await fp("lesson", UNIT)).toBe(0);
    expect(called("lesson")[1]?.args).toEqual([UNIT, LESSON2]);
    expect(await fp("lesson", "u99-nope")).toBe(1);
    expect(stderr()).toContain("단원을 찾을 수 없습니다: u99-nope");
  });

  it("marks solved exercises", async () => {
    ({ api, calls } = fakeApi({ lesson: async () => lessonView("ko", ["bind-syntax"]) }));
    expect(await fp("lesson", `${UNIT}/${LESSON}`)).toBe(0);
    expect(stdout()).toContain("[연습 1] bind-syntax · 객관식 · ✓ 풀었음");
    expect(stdout()).toContain("연습 1/2 풀었음");
  });

  it("points to the checkpoint or the end of the course instead of a lesson", async () => {
    ({ api, calls } = fakeApi({ course: async () => courseView("ko", { kind: "checkpoint", unitId: UNIT }) }));
    expect(await fp("lesson", "next")).toBe(0);
    expect(called("lesson")).toEqual([]);
    expect(stdout()).toContain(`fp checkpoint ${UNIT}`);
    ({ api, calls } = fakeApi({ course: async () => courseView("ko", { kind: "done" }) }));
    expect(await fp("lesson", "next", "--json")).toBe(0);
    expect(JSON.parse(stdout())).toEqual({ next: { kind: "done" } });
  });

  it("rejects malformed references with exit 2", async () => {
    for (const ref of [`${UNIT}/`, `/${LESSON}`, "a/b/c"]) {
      expect(await fp("lesson", ref)).toBe(2);
      expect(stderr()).toContain("사용법: fp lesson");
    }
    expect(calls.filter((c) => c.method !== "me")).toEqual([]);
  });
});

describe("fp answer", () => {
  it("sends the 0-based choice for a 1-based choice number and shows the feedback", async () => {
    expect(await fp("answer", `${UNIT}/${LESSON}`, "bind-syntax", "2")).toBe(0);
    expect(called("lessonAnswer")[0]?.args).toEqual([UNIT, LESSON, { exerciseId: "bind-syntax", choice: 1 }]);
    expect(stdout()).toContain("✓ 정답이에요!");
    expect(stdout()).toContain("맞아요! let으로 바인딩합니다.");
  });

  it("a wrong answer exits 1, invites a retry and does not reveal the answer", async () => {
    expect(await fp("answer", `${UNIT}/${LESSON}`, "bind-syntax", "3")).toBe(1);
    expect(stdout()).toContain("✗ 아직 아니에요.");
    expect(stdout()).toContain("Gleam에는 var가 없습니다.");
    expect(stdout()).toContain("벌점은 없어요");
    expect(stdout()).not.toContain("정답:");
  });

  it("show gives up: no choice, giveUp, and the answer number is revealed", async () => {
    expect(await fp("answer", `${UNIT}/${LESSON}`, "bind-syntax", "show")).toBe(0);
    expect(called("lessonAnswer")[0]?.args[2]).toEqual({ exerciseId: "bind-syntax", choice: null, giveUp: true });
    expect(stdout()).toContain("정답을 공개합니다.");
    expect(stdout()).toContain("정답: 2번");
  });

  it("accepts the exercise number printed by fp lesson", async () => {
    expect(await fp("answer", `${UNIT}/${LESSON}`, "2", "2")).toBe(0);
    expect(called("lessonAnswer")[0]?.args[2]).toEqual({ exerciseId: "let-use", choice: 1 });
    expect(await fp("answer", `${UNIT}/${LESSON}`, "3", "1")).toBe(2);
    expect(stderr()).toContain("연습 3이(가) 없습니다 (연습 2개)");
    expect(await fp("answer", `${UNIT}/${LESSON}`, "2", "5")).toBe(2);
  });

  it("rejects bad choices and missing arguments before calling the API", async () => {
    calls.length = 0;
    for (const choice of ["0", "abc", "1.5", "-1"]) {
      expect(await fp("answer", `${UNIT}/${LESSON}`, "bind-syntax", choice)).toBe(2);
    }
    expect(await fp("answer", `${UNIT}/${LESSON}`, "bind-syntax")).toBe(2);
    expect(stderr()).toContain("사용법: fp answer");
    expect(calls.filter((c) => c.method !== "me")).toEqual([]);
  });
});

describe("fp lesson-done", () => {
  it("completes the lesson and shows the next step", async () => {
    expect(await fp("lesson-done", `${UNIT}/${LESSON2}`)).toBe(0);
    expect(called("lessonComplete")[0]?.args).toEqual([UNIT, LESSON2]);
    expect(stdout()).toContain(`레슨 ${UNIT}/${LESSON2}을(를) 완료했어요. 이 단원에서 완료한 레슨: 2개`);
    expect(stdout()).toContain(`fp lesson ${UNIT}/${LESSON2}`);
  });

  it("still succeeds when the next step cannot be loaded", async () => {
    ({ api, calls } = fakeApi({ course: async () => Promise.reject(new Error("down")) }));
    expect(await fp("lesson-done", `${UNIT}/${LESSON}`)).toBe(0);
    expect(stdout()).toContain("fp lesson next");
    expect(await fp("lesson-done")).toBe(2);
  });
});

describe("fp checkpoint and fp placement", () => {
  it("without a terminal prints the whole quiz with how to submit, and remembers the quiz", async () => {
    expect(await fp("checkpoint", UNIT)).toBe(0);
    expect(called("startCheckpoint")[0]?.args).toEqual([UNIT]);
    const text = stdout();
    expect(text).toContain(`단원 체크포인트: ${UNIT} · 2문항 · 통과 기준 80%`);
    expect(text).toContain("문항 1/2\n바인딩 문법은?");
    expect(text).toContain("  1) let x = 1");
    expect(text).toContain("id: item-b");
    expect(text).toContain(`fp checkpoint ${UNIT} --quiz quiz-cp-1 --answers item-a=0,item-b=0`);
    expect(called("submitCheckpoint")).toEqual([]);
    expect((await config()).lastQuiz).toEqual({ id: "quiz-cp-1", kind: "checkpoint", unitId: UNIT });
  });

  it("--json prints the quiz even in a terminal, then --answers submits the remembered quiz", async () => {
    terminal("1", "1");
    expect(await fp("checkpoint", UNIT, "--json")).toBe(0);
    expect(tty?.asked).toEqual([]);
    expect(JSON.parse(stdout())).toMatchObject({ quizId: "quiz-cp-1", kind: "checkpoint", items: [{ itemId: "item-a" }, { itemId: "item-b" }] });

    expect(await fp("checkpoint", UNIT, "--json", "--answers", "item-a=0,item-b=0")).toBe(0);
    expect(called("startCheckpoint")).toHaveLength(1);
    expect(called("submitCheckpoint")[0]?.args).toEqual(["quiz-cp-1", { answers: { "item-a": 0, "item-b": 0 } }]);
    expect(JSON.parse(stdout())).toMatchObject({ passed: true, score: 2, total: 2 });
    expect((await config()).lastQuiz).toBeUndefined();
  });

  it("--answers renders a failed checkpoint with exit 1 and links back to the lessons", async () => {
    expect(await fp("checkpoint", UNIT, "--quiz", "q-9", "--answers", "item-a=0, item-b=")).toBe(1);
    expect(called("submitCheckpoint")[0]?.args).toEqual(["q-9", { answers: { "item-a": 0, "item-b": null } }]);
    const text = stdout();
    expect(text).toContain(`체크포인트 결과 (${UNIT}): 1/2`);
    expect(text).toContain("아직 통과하지 못했어요");
    expect(text).toContain("✗ item-b · 선택 건너뜀 · 정답 1");
    expect(text).toContain(`다시 보기: \`fp lesson ${UNIT}/${LESSON2}\` (plus)`);
  });

  it("--answers needs a quiz id and a valid answer list", async () => {
    expect(await fp("checkpoint", UNIT, "--answers", "item-a=0")).toBe(2);
    expect(stderr()).toContain(`fp checkpoint ${UNIT}`);
    expect(await fp("placement", "--quiz", "q-1")).toBe(2);
    expect(await fp("placement", "--quiz", "q-1", "--answers", "item-a=x")).toBe(2);
    expect(stderr()).toContain("--answers 형식이 올바르지 않습니다: item-a=x");
    expect(called("submitPlacement")).toEqual([]);
    expect(parseAnswers("a=1,b=-, c=2,")).toEqual({ a: 1, b: null, c: 2 });
    expect(() => parseAnswers("=1")).toThrow();
    expect(() => parseAnswers(",")).toThrow();
  });

  it("in a terminal asks one item at a time, re-asks invalid input, then submits and shows the results", async () => {
    terminal("abc", "4", "1", "");
    expect(await fp("checkpoint", UNIT)).toBe(1);
    expect(tty?.asked).toEqual(["답 (1-3, 건너뛰려면 Enter): ", "답 (1-3, 건너뛰려면 Enter): ", "답 (1-3, 건너뛰려면 Enter): ", "답 (1-2, 건너뛰려면 Enter): "]);
    expect(tty?.closed).toBe(true);
    expect(called("submitCheckpoint")[0]?.args).toEqual(["quiz-cp-1", { answers: { "item-a": 0, "item-b": null } }]);
    const text = stdout();
    // Item 2 is shown only after item 1 was answered, and results come after the last item.
    expect(text.indexOf("문항 2/2")).toBeGreaterThan(text.indexOf("1부터 3 사이의 번호를 입력하세요"));
    expect(text.indexOf("체크포인트 결과")).toBeGreaterThan(text.indexOf("<ask 답 (1-2"));
    expect(text).toContain("✓ 문항 1 · 선택 1 · 정답 1");
    expect(text).toContain("✗ 문항 2 · 선택 건너뜀 · 정답 1");
    expect(called("startCheckpoint")).toHaveLength(1);
  });

  it("stops without submitting when input ends", async () => {
    terminal("1", null);
    expect(await fp("placement")).toBe(1);
    expect(stderr()).toContain("답을 제출하지 않고 중단했습니다");
    expect(called("submitPlacement")).toEqual([]);
    expect(tty?.closed).toBe(true);
  });

  it("placement in a terminal shows the band, skipped units and where to go next", async () => {
    terminal("1", "1");
    expect(await fp("placement")).toBe(0);
    expect(called("submitPlacement")[0]?.args).toEqual(["quiz-pl-1", { answers: { "item-a": 0, "item-b": 0 } }]);
    expect(stdout()).toContain("배치 테스트: 2문항");
    expect(stdout()).toContain("배치 테스트 결과: 2/2 · 고급");
    expect(stdout()).toContain("통과로 처리된 단원: u01-values, u02-functions-pipes");
    expect(stdout()).toContain("fp start");
  });
});

describe("course output per locale", () => {
  async function inLocale(locale: Locale): Promise<string> {
    ({ api, calls } = fakeApi({}, locale));
    const parts: string[] = [];
    for (const argv of [["course"], ["lesson"], ["answer", `${UNIT}/${LESSON}`, "1", "3"], ["checkpoint", UNIT]]) {
      await fp(...argv);
      parts.push(stdout());
    }
    terminal("1", "2");
    await fp("placement");
    parts.push(stdout());
    tty = null;
    return parts.join("\n");
  }

  it("renders the chrome in the account locale around server-localized content", async () => {
    const en = await inLocale("en");
    expect(en).toContain("Gleam basics course");
    expect(en).toContain("lessons 1/2 · checkpoint not taken");
    expect(en).toContain("Values and let (u01-values/l01-values-let)");
    expect(en).toContain("Programs work with values. You name a value with let.");
    expect(en).toContain("[Exercise 1] bind-syntax · multiple choice");
    expect(en).toContain("✗ Not quite.\nGleam has no var.");
    expect(en).toContain("Unit checkpoint: u01-values · 2 items · pass mark 80%");
    expect(en).toContain("Your answer (1-3, Enter to skip): ");
    expect(en).toContain("Placement test result: 1/2 · beginner");
    // Quiz items in the fake are Korean server content; the CLI's own words must not be.
    expect(en).not.toMatch(/레슨|체크포인트|연습 |배치 테스트|건너뛰려면|정답/);

    const zh = await inLocale("zh");
    expect(zh).toContain("Gleam 基础课程");
    expect(zh).toContain("值与 let");
    expect(zh).toContain("[练习 1] bind-syntax · 选择题");
    expect(zh).toContain("✗ 还不对。");
    expect(zh).toContain("单元测验：u01-values · 2 题 · 及格线 80%");
    expect(zh).toContain("分级测试结果：1/2 · 入门");
    expect(zh).toContain("下一步：`fp lesson u01-values/l02-immutability`");
  });
});

describe("readline prompter", () => {
  it("answers questions from piped lines in order and null after the input ends", async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    let written = "";
    output.on("data", (c: Buffer) => (written += c.toString()));
    const p = readlinePrompter(input, output, false);
    const first = p.ask("Q1? ");
    input.write("2\n3\n");
    expect(await first).toBe("2");
    expect(await p.ask("Q2? ")).toBe("3");
    const third = p.ask("Q3? ");
    input.end();
    expect(await third).toBeNull();
    expect(await p.ask("Q4? ")).toBeNull();
    p.close();
    expect(written).toContain("Q1? ");
    expect(written).toContain("Q2? ");
  });
});
