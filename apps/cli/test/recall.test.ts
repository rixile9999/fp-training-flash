import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ApiError } from "@fp/api-contract";
import type { Locale } from "@fp/api-contract";
import { runCli } from "../src/cli.ts";
import type { CliApi, CliEnv } from "../src/cli.ts";
import type { Prompter } from "../src/prompt.ts";
import {
  bodyFromTemplate,
  bodyTemplate,
  dueIn,
  externalEditor,
  formatRecallItem,
  formatRecallOverview,
  formatRecallResult,
  formatRecallSummary,
} from "../src/recall.ts";
import type { EditBody } from "../src/recall.ts";
import { RECALL_SESSION, fakeApi, recallAnswerResult, recallOverview, recallSession, recallSummary } from "./fixtures.ts";
import type { Call } from "./fixtures.ts";

const NOW = Date.parse("2026-10-03T00:00:00.000Z");

let root: string;
let env: CliEnv;
let api: CliApi;
let calls: Call[];
let out: string[];
let err: string[];
let tty: { lines: (string | null)[]; asked: string[]; opened: number; closed: number } | null;
let editBody: EditBody | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "fp-cli-recall-"));
  env = { FP_CONFIG_DIR: join(root, "config"), FP_TOKEN: "tok" };
  ({ api, calls } = fakeApi());
  tty = null;
  editBody = undefined;
  await mkdir(join(root, "work"), { recursive: true });
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

/** A terminal that answers the queued lines in order (null = Ctrl-D). */
function terminal(...lines: (string | null)[]): void {
  tty = { lines, asked: [], opened: 0, closed: 0 };
}

async function fp(...argv: string[]): Promise<number> {
  out = [];
  err = [];
  const t = tty;
  let clock = NOW;
  const prompter = (): Prompter => {
    if (t) t.opened += 1;
    return {
      ask: async (q) => {
        if (!t) throw new Error("no terminal");
        t.asked.push(q);
        out.push(`<ask ${q}>`);
        clock += 3000;
        return t.lines.length > 0 ? (t.lines.shift() ?? null) : null;
      },
      close: () => {
        if (t) t.closed += 1;
      },
    };
  };
  return runCli(argv, {
    env,
    cwd: join(root, "work"),
    stdout: (s) => out.push(s),
    stderr: (s) => err.push(s),
    createClient: () => api,
    stdinIsTTY: t !== null,
    prompter,
    now: () => clock,
    ...(editBody ? { editBody } : {}),
  });
}
const stdout = () => out.join("\n");
const stderr = () => err.join("\n");
const called = (m: string) => calls.filter((c) => c.method === m);

describe("fp recall status", () => {
  it("shows the decks, due cards and how to start", async () => {
    expect(await fp("recall", "status")).toBe(0);
    expect(called("recallOverview")).toHaveLength(1);
    const text = stdout();
    expect(text).toContain("암기: Gleam 문법과 핵심 라이브러리");
    expect(text).toContain("지금 복습할 카드 5장 · 오늘 남은 새 카드 7장 (하루 10장)");
    expect(text).toContain("  문법 (syntax) · 본 카드 12/60 · 숙달 3 · 복습 대기 4");
    expect(text).toContain("`fp recall --deck syntax`");
  });

  it("prints the overview as JSON and renders en/zh chrome", async () => {
    expect(await fp("recall", "status", "--json")).toBe(0);
    expect(JSON.parse(stdout())).toEqual(recallOverview());
    expect(formatRecallOverview(recallOverview(), "en")).toContain("5 cards due for review now · 7 new cards left today (10 per day)");
    expect(formatRecallOverview(recallOverview(), "zh")).toContain("现在待复习的卡片 5 张");
  });

  it("rejects extra arguments and session options", async () => {
    expect(await fp("recall", "status", "x")).toBe(2);
    expect(await fp("recall", "status", "--minutes", "5")).toBe(2);
    expect(await fp("recall", "later")).toBe(2);
    expect(stderr()).toContain("사용법: fp recall");
    expect(called("recallOverview")).toHaveLength(0);
  });
});

describe("fp recall (interactive session)", () => {
  it("asks one item at a time, sends typed answers with elapsed time and ends with a summary", async () => {
    terminal("9", "2", " fold ", "-6", "?", "list.fold(xs, 0, fn(acc, x) {", "  acc + x", "})", "");
    expect(await fp("recall", "--minutes", "12", "--deck", "stdlib,syntax", "--deck", "pitfalls")).toBe(0);

    expect(called("startRecall")[0]?.args).toEqual([{ minutes: 12, deckIds: ["stdlib", "syntax", "pitfalls"] }]);
    const answers = called("recallAnswer").map((c) => c.args);
    expect(answers).toEqual([
      [RECALL_SESSION, { itemId: "i-new", response: { kind: "choice", choice: 1 }, elapsedMs: 6000 }],
      [RECALL_SESSION, { itemId: "i-cloze", response: { kind: "text", text: "fold" }, elapsedMs: 3000 }],
      [RECALL_SESSION, { itemId: "i-predict", response: { kind: "text", text: "-6" }, elapsedMs: 3000 }],
      [
        RECALL_SESSION,
        { itemId: "i-produce", response: { kind: "code", body: "list.fold(xs, 0, fn(acc, x) {\n  acc + x\n})" }, elapsedMs: 15000 },
      ],
    ]);
    expect(called("finishRecall")[0]?.args).toEqual([RECALL_SESSION]);
    expect(tty?.closed).toBe(1);

    const text = stdout();
    expect(text).toContain("암기 세션 · 4개 항목. 그만하려면 Ctrl-D.");
    // New card: summary, signature and example before the question; choices numbered from 1.
    expect(text).toContain("[1/4] list.fold · 새 카드 · 고르기");
    expect(text).toContain("리스트를 왼쪽부터 접어 값 하나로 만듭니다.");
    expect(text).toContain("시그니처: list.fold(List(a), from: b, with: fn(b, a) -> b) -> b");
    expect(text).toContain("    list.fold([1, 2, 3], 0, fn(acc, x) { acc + x })  // -> 6");
    expect(text).toContain("  1) fn(원소, 누적값)\n  2) fn(누적값, 원소)");
    expect(text).toContain("1부터 2 사이의 번호를 입력하세요.");
    expect(text).toContain("✓ 정답이에요\n맞아요. 누적값이 먼저예요.");
    expect(text).toContain("다음 복습: 2일 후 · 단계: 고르기");
    // Cloze and predict.
    expect(text).toContain("[2/4] list.fold · 섞어 풀기 · 빈칸 채우기");
    expect(text).toContain("    list.____([1, 2, 3], 0, fn(acc, x) { acc + x })");
    expect(text).toContain("<ask 빈칸 (모르면 Enter): >");
    expect(text).toContain("<ask 값 (모르면 Enter): >");
    expect(text).toContain("정답: -6");
    // Produce: imports + header, hint on "?", body lines until an empty line.
    expect(text).toContain("[4/4] list.fold · 마무리 · 직접 쓰기");
    expect(text).toContain("    import gleam/list\n\n    pub fn total(xs: List(Int)) -> Int {\n      ...\n    }");
    expect(text).toContain("힌트: 시작값은 0이에요.");
    expect(tty?.asked.filter((q) => q === "(계속)> ")).toHaveLength(3);
    expect(text).toContain("내 답의 값: #(6, 0, 5)");
    // Summary.
    expect(text).toContain("세션 요약\n답한 항목 4개 · 정답 3개 (75%) · 새로 익힌 카드 1장 · 내일 복습 2장");
    expect(text).toContain("  핵심 라이브러리: 숙달 0/50 · 복습 대기 1");
  });

  it("shows expected, actual, diagnostics, missing tokens and the reference after wrong answers", async () => {
    terminal("1", "", "6", "", null);
    expect(await fp("recall")).toBe(0);
    expect(called("startRecall")[0]?.args).toEqual([{}]);
    const text = stdout();
    expect(text).toContain("✗ 아직 아니에요\n반대예요.");
    expect(text).toContain("정답: fold\n내 답의 값: 6");
    expect(called("recallAnswer")[3]?.args[1]).toMatchObject({ response: { kind: "code", body: "" } });
    expect(text).toContain("꼭 써야 하는 것: list.fold");
    expect(text).toContain("컴파일/실행 문제:\n    warning: unused variable xs");
    expect(text).toContain("모범 답안:\n    list.fold(xs, 0, fn(acc, x) { acc + x })");
    expect(text).toContain("다음 복습: 2일 후 · 단계: 빈칸 채우기");
  });

  it("stops on Ctrl-D, keeps what was answered and still finishes the session", async () => {
    terminal("2", null);
    expect(await fp("recall")).toBe(0);
    expect(called("recallAnswer")).toHaveLength(1);
    expect(called("finishRecall")).toHaveLength(1);
    expect(stdout()).toContain("여기서 멈출게요. 지금까지 답한 항목은 저장되었어요.");
    expect(stdout()).toContain("답한 항목 1개");
    expect(tty?.closed).toBe(1);
  });

  it("opens the editor for produce bodies and reopens the prompter afterwards", async () => {
    const templates: string[] = [];
    editBody = async (template) => {
      templates.push(template);
      return `${template}\n  list.fold(xs, 0, fn(acc, x) { acc + x })\n`;
    };
    env = { ...env, EDITOR: "vim" };
    terminal("2", "fold", "-6");
    expect(await fp("recall")).toBe(0);
    expect(templates).toHaveLength(1);
    expect(templates[0]).toContain("//fp pub fn total(xs: List(Int)) -> Int {");
    expect(templates[0]).toContain("//fp import gleam/list");
    expect(called("recallAnswer")[3]?.args[1]).toMatchObject({
      response: { kind: "code", body: "  list.fold(xs, 0, fn(acc, x) { acc + x })" },
    });
    expect(stdout()).toContain("편집기(vim)에서 함수 본문을 쓰고 저장한 뒤 닫으세요.");
    expect(stdout()).toContain("힌트: 시작값은 0이에요.");
    expect(tty?.opened).toBe(2);
    expect(tty?.closed).toBe(2);
  });

  it("falls back to typing when the editor fails", async () => {
    editBody = async () => null;
    terminal("2", "fold", "-6", "list.fold(xs, 0, fn(a, x) { a + x })", "");
    expect(await fp("recall")).toBe(0);
    expect(stdout()).toContain("편집기를 실행하지 못했어요. 여기에 직접 입력하세요.");
    expect(called("recallAnswer")[3]?.args[1]).toMatchObject({ response: { kind: "code", body: "list.fold(xs, 0, fn(a, x) { a + x })" } });
  });

  it("reports a failed answer check and moves on", async () => {
    let n = 0;
    ({ api, calls } = fakeApi({
      recallAnswer: async (_s, req) => {
        n += 1;
        if (n === 1) throw new ApiError(429, { code: "rate_limited", message: "너무 많아요." });
        return recallAnswerResult(req.itemId, req.response);
      },
    }));
    terminal("2", "fold", null);
    expect(await fp("recall")).toBe(0);
    expect(stdout()).toContain("답을 확인하지 못했어요: 너무 많아요. 다음 항목으로 넘어갑니다.");
    expect(called("recallAnswer")).toHaveLength(2);
    expect(called("finishRecall")).toHaveLength(1);
  });

  it("says when there is nothing to do and does not ask anything", async () => {
    ({ api, calls } = fakeApi({ startRecall: async () => ({ ...recallSession(), items: [] }) }));
    terminal();
    expect(await fp("recall")).toBe(0);
    expect(stdout()).toContain("지금은 복습할 카드도 새 카드도 없어요.");
    expect(tty?.asked).toEqual([]);
    expect(called("finishRecall")).toHaveLength(0);
  });

  it("needs a terminal and refuses --json", async () => {
    expect(await fp("recall")).toBe(1);
    expect(stderr()).toContain("터미널에서 `fp recall`을 실행하세요");
    terminal("1");
    expect(await fp("recall", "--json")).toBe(1);
    expect(called("startRecall")).toHaveLength(0);
  });

  it.each([["0"], ["61"], ["2.5"], ["ten"]])("rejects --minutes %s", async (m) => {
    terminal();
    expect(await fp("recall", "--minutes", m)).toBe(2);
    expect(stderr()).toContain("--minutes는 1부터 60 사이의 정수여야 해요.");
    expect(called("startRecall")).toHaveLength(0);
  });

  it("renders chrome in the account locale and passes server content through", async () => {
    for (const locale of ["en", "zh"] as Locale[]) {
      ({ api, calls } = fakeApi({}, locale));
      terminal("2", null);
      expect(await fp("recall")).toBe(0);
      const text = stdout();
      if (locale === "en") {
        expect(text).toContain("Recall session · 4 items. Press Ctrl-D to stop.");
        expect(text).toContain("[1/4] list.fold · new card · recognize");
        expect(text).toContain("Folds a list from the left into a single value.");
        expect(text).toContain("✓ Correct");
        expect(text).toContain("<ask Your answer (1-2): >");
      } else {
        expect(text).toContain("记忆训练回合 · 共 4 项。");
        expect(text).toContain("[1/4] list.fold · 新卡片 · 识别");
        expect(text).toContain("从左到右把列表折叠成一个值。");
        expect(text).toContain("训练回合小结");
      }
    }
  });
});

describe("recall rendering", () => {
  it("never shows answers in an item and shows definitions for cloze", () => {
    const view = recallSession();
    const cloze = { ...view.items[1]!, card: { ...view.items[1]!.card, definitions: "pub type Shape { Circle(r: Float) }" } };
    const text = formatRecallItem(cloze, 2, 4, "en");
    expect(text).toContain("Definitions in scope:\n    pub type Shape { Circle(r: Float) }");
    // A review item does not repeat the summary.
    expect(text).not.toContain("Signature:");
  });

  it("formats due times relative to now", () => {
    expect(dueIn("2026-10-03T00:05:00.000Z", NOW)).toBe("5분 후");
    expect(dueIn("2026-10-03T00:00:10.000Z", NOW, "en")).toBe("in 1 min");
    expect(dueIn("2026-10-03T05:00:00.000Z", NOW, "zh")).toBe("5 小时后");
    expect(dueIn("2026-10-10T00:00:00.000Z", NOW, "en")).toBe("in 7 days");
  });

  it("formats results and summaries without optional parts when absent", () => {
    const res = recallAnswerResult("i-new", { kind: "choice", choice: 1 });
    expect(formatRecallResult(res, NOW, "en")).toBe("✓ Correct\n맞아요. 누적값이 먼저예요.\nNext review: in 2 days · stage: recognize");
    expect(formatRecallSummary({ ...recallSummary(0), decks: [] }, "en")).toContain("0 answered · 0 correct (-)");
  });

  it("round-trips the editor template", () => {
    const item = recallSession().items[3]!;
    const template = bodyTemplate(item, "en");
    expect(template.split("\n")[0]).toBe("//fp Write only the body of the function below. Lines starting with //fp are ignored.");
    expect(bodyFromTemplate(template)).toBe("");
    expect(bodyFromTemplate(template.replace("\n\n", "\n\n  let s = 0\n\n  s\n"))).toBe("  let s = 0\n\n  s");
    expect(bodyFromTemplate("//fp x\r\n  // my comment\r\n  1\r\n")).toBe("  // my comment\n  1");
  });
});

describe("externalEditor", () => {
  it("runs the command on a temporary file and returns what was saved, or null when it fails", async () => {
    expect(await externalEditor("true")("//fp x\n")).toBe("//fp x\n");
    expect(await externalEditor(`sh -c 'printf "  1\\n" >> "$0"'`)("//fp x\n")).toBe("//fp x\n  1\n");
    expect(await externalEditor("false")("//fp x\n")).toBeNull();
  });
});
