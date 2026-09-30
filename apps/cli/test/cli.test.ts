import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ApiError } from "@fp/api-contract";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCli } from "../src/cli.ts";
import type { CliApi, CliEnv } from "../src/cli.ts";
import { EX_ID, fakeApi, session } from "./fixtures.ts";
import type { Call } from "./fixtures.ts";

let root: string;
let cwd: string;
let env: CliEnv;
let api: CliApi;
let calls: Call[];
let clients: { baseUrl: string; token?: string }[];
let out: string[];
let err: string[];

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "fp-cli-"));
  cwd = join(root, "work");
  env = { FP_CONFIG_DIR: join(root, "config") };
  ({ api, calls } = fakeApi());
  clients = [];
  await mkdir(cwd, { recursive: true });
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function fp(...argv: string[]): Promise<number> {
  out = [];
  err = [];
  return runCli(argv, {
    env,
    cwd,
    stdout: (t) => out.push(t),
    stderr: (t) => err.push(t),
    createClient: (o) => {
      clients.push({ ...o });
      return api;
    },
    newKey: () => "key-1",
  });
}
const stdout = () => out.join("\n");
const stderr = () => err.join("\n");
const called = (m: string) => calls.filter((c) => c.method === m);
const config = async () => JSON.parse(await readFile(join(root, "config", "config.json"), "utf8")) as Record<string, unknown>;
const projectDir = () => join(cwd, "fp-work", "orders-apply-coupon-base");

async function loggedIn(): Promise<void> {
  expect(await fp("login", "민수")).toBe(0);
  calls.length = 0;
  clients = [];
}

describe("login and config", () => {
  it("stores apiUrl and token in an owner-only config file and uses the token afterwards", async () => {
    expect(await fp("login", "민수")).toBe(0);
    expect(stdout()).toContain("민수(으)로 로그인했습니다");
    expect(clients[0]).toEqual({ baseUrl: "http://localhost:8787" });
    const cfg = await config();
    expect(cfg).toMatchObject({ apiUrl: "http://localhost:8787", token: "tok-secret", user: { id: "user-1", displayName: "민수" } });
    expect((await stat(join(root, "config", "config.json"))).mode & 0o777).toBe(0o600);

    expect(await fp("whoami")).toBe(0);
    expect(clients.at(-1)).toEqual({ baseUrl: "http://localhost:8787", token: "tok-secret" });
    expect(stdout()).toContain("민수 (user-1)");
  });

  it("lets FP_API_URL and FP_TOKEN override the config file", async () => {
    await loggedIn();
    env = { ...env, FP_API_URL: "http://api.test", FP_TOKEN: "env-token" };
    expect(await fp("whoami")).toBe(0);
    expect(clients.at(-1)).toEqual({ baseUrl: "http://api.test", token: "env-token" });
  });

  it("asks to log in when there is no token, without calling the API", async () => {
    expect(await fp("whoami")).toBe(1);
    expect(stderr()).toContain("fp login");
    expect(calls).toEqual([]);
  });

  it("translates API errors into Korean messages and JSON errors", async () => {
    await loggedIn();
    ({ api, calls } = fakeApi({ me: async () => Promise.reject(new ApiError(401, { code: "unauthorized", message: "bad token" })) }));
    expect(await fp("whoami", "--json")).toBe(1);
    expect(stderr()).toContain("인증에 실패했습니다");
    expect(JSON.parse(stdout())).toEqual({ error: { code: "unauthorized", message: "bad token", status: 401 } });
  });
});

describe("usage", () => {
  it("prints usage for no command (exit 2), --help (exit 0) and rejects unknown commands", async () => {
    expect(await fp()).toBe(2);
    expect(stdout()).toContain("사용법: fp");
    expect(await fp("--help")).toBe(0);
    expect(await fp("frobnicate")).toBe(2);
    expect(stderr()).toContain("알 수 없는 명령: frobnicate");
    expect(await fp("start", "--bogus")).toBe(2);
  });
});

describe("session flow", () => {
  it("start creates a session and writes the current exercise under ./fp-work", async () => {
    await loggedIn();
    expect(await fp("start", "--minutes", "20", "--focus", "data-transform")).toBe(0);
    expect(called("startSession")[0]?.args[0]).toEqual({ language: "gleam", targetMinutes: 20, focusSkill: "data-transform" });
    expect(called("exercise")[0]?.args[0]).toBe(EX_ID);
    expect(stdout()).toContain("현재 문제: 쿠폰 적용하기");
    expect(stdout()).toContain(join("fp-work", "orders-apply-coupon-base", "src", "coupon.gleam"));
    expect(await readFile(join(projectDir(), "test", "coupon_test.gleam"), "utf8")).toContain("coupon.apply([])");
    expect((await config()).lastWorkDir).toBe(projectDir());
  });

  it("rejects a non-positive --minutes", async () => {
    await loggedIn();
    expect(await fp("start", "--minutes", "0")).toBe(2);
    expect(called("startSession")).toEqual([]);
  });

  it("next keeps edited code unless --force", async () => {
    await loggedIn();
    await fp("next");
    await writeFile(join(projectDir(), "src", "coupon.gleam"), "my code");
    expect(await fp("next")).toBe(0);
    expect(stdout()).toContain("유지됨: src/coupon.gleam");
    expect(await readFile(join(projectDir(), "src", "coupon.gleam"), "utf8")).toBe("my code");
    expect(await fp("current", "--force")).toBe(0);
    expect(await readFile(join(projectDir(), "src", "coupon.gleam"), "utf8")).toContain("todo");
  });

  it("next without an active session tells the learner to start one", async () => {
    await loggedIn();
    ({ api, calls } = fakeApi({ activeSession: async () => null }));
    expect(await fp("next")).toBe(1);
    expect(stderr()).toContain("fp start");
  });

  it("skip advances the session and writes the next exercise", async () => {
    await loggedIn();
    expect(await fp("skip")).toBe(0);
    expect(called("skipItem")[0]?.args[0]).toBe("sess-1");
    expect(stdout()).toContain("현재 문제: 주문 합계");
    expect(await readFile(join(cwd, "fp-work", "orders-total-base", "src", "total.gleam"), "utf8")).toContain("pub fn");
  });
});

describe("run, submit, feedback", () => {
  it("run sends the local learner file from the project dir and exits 1 on failing tests", async () => {
    await loggedIn();
    await fp("next");
    await writeFile(join(projectDir(), "src", "coupon.gleam"), "pub fn apply(o) { o }\n");
    expect(await fp("run", projectDir())).toBe(1);
    expect(called("trialRun")[0]?.args).toEqual([EX_ID, { code: "pub fn apply(o) { o }\n" }]);
    expect(stdout()).toContain("결과: 테스트 실패 (1/2 통과)");
    expect(stdout()).toContain("Expected [] got [1]");
  });

  it("run falls back to the last written project when cwd is not a project", async () => {
    await loggedIn();
    await fp("next");
    expect(await fp("run")).toBe(1);
    expect(called("trialRun")).toHaveLength(1);
  });

  it("run outside any project explains how to get one", async () => {
    await loggedIn();
    expect(await fp("run")).toBe(1);
    expect(stderr()).toContain("fp next");
  });

  it("submit links the active session, prints the rating change, and feedback last uses it", async () => {
    await loggedIn();
    await fp("next");
    expect(await fp("submit")).toBe(0);
    expect(called("submit")[0]?.args[0]).toEqual({
      exerciseId: EX_ID,
      code: "pub fn apply(orders) {\n  todo\n}\n",
      idempotencyKey: "key-1",
      sessionId: "sess-1",
    });
    expect(stdout()).toContain("결과: 통과 (2/2 통과)");
    expect(stdout()).toContain("숨김 1 (숨김)");
    expect(stdout()).toContain("레이팅 변화: data-transform 1200 → 1216 (+16) · 잠정치");
    expect(stdout()).toContain("fp next");
    expect((await config()).lastSubmissionId).toBe("sub-1");

    expect(await fp("feedback", "last")).toBe(0);
    expect(called("feedback")[0]?.args[0]).toBe("sub-1");
    expect(stdout()).toContain("다음 행동: 다음 문제로 넘어가세요.");
  });

  it("submit does not link a session whose current item is another exercise", async () => {
    await loggedIn();
    await fp("next");
    ({ api, calls } = fakeApi({ activeSession: async () => session(1) }));
    expect(await fp("submit", projectDir())).toBe(0);
    expect(called("submit")[0]?.args[0]).not.toHaveProperty("sessionId");
  });

  it("submit --json prints the submission view as JSON", async () => {
    await loggedIn();
    await fp("next");
    expect(await fp("submit", "--json")).toBe(0);
    const parsed = JSON.parse(stdout()) as { submission: { id: string }; ratingChange: { after: number } };
    expect(parsed.submission.id).toBe("sub-1");
    expect(parsed.ratingChange.after).toBe(1216.4);
  });

  it("feedback without any submission asks for an id", async () => {
    await loggedIn();
    expect(await fp("feedback")).toBe(1);
    expect(called("feedback")).toEqual([]);
  });
});

describe("help commands", () => {
  it("hint without a level reveals the next level after the revealed ones", async () => {
    await loggedIn();
    await fp("next");
    expect(await fp("hint")).toBe(0);
    expect(called("revealHint")[0]?.args).toEqual([EX_ID, { level: 2 }]);
    expect(stdout()).toContain("[힌트 2] SECRET-HINT-TWO");
    expect(stdout()).not.toContain("레이팅에 반영되지 않습니다");
  });

  it("hint level 3 warns that the attempt will not be rated; invalid levels are rejected", async () => {
    await loggedIn();
    await fp("next");
    expect(await fp("hint", "3")).toBe(0);
    expect(stdout()).toContain("레이팅에 반영되지 않습니다");
    expect(await fp("hint", "9")).toBe(2);
    expect(called("revealHint")).toHaveLength(1);
  });

  it("explain requires --yes before revealing the solution", async () => {
    await loggedIn();
    await fp("next");
    expect(await fp("explain")).toBe(1);
    expect(stderr()).toContain("fp explain --yes");
    expect(called("explanation")).toEqual([]);
    expect(await fp("explain", "--yes")).toBe(0);
    expect(stdout()).toContain("참고 풀이:");
  });

  it("progress shows skill names and review dates", async () => {
    await loggedIn();
    expect(await fp("progress")).toBe(0);
    expect(called("progress")[0]?.args[0]).toBe("gleam");
    expect(stdout()).toContain("데이터 변환: 1216 ±180");
    expect(stdout()).toContain("2026-10-02");
  });

  it("token issue prints the token and a ready-to-use MCP config", async () => {
    await loggedIn();
    expect(await fp("token", "issue", "claude", "desktop")).toBe(0);
    expect(called("issueToken")[0]?.args[0]).toEqual({ label: "claude desktop" });
    expect(stdout()).toContain("tok-mcp");
    expect(stdout()).toContain('"FP_TOKEN": "tok-mcp"');
    expect(await fp("token", "issue")).toBe(2);
  });
});
