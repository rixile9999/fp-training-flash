#!/usr/bin/env node
// 로컬 플랫폼 제어: ./fpctl up | down | restart | reset | status | logs [api|web]
//   up       API와 웹을 백그라운드로 실행 (필요하면 의존성 설치, Docker 기동, 채점 이미지 빌드)
//   down     둘 다 종료
//   restart  종료 후 다시 실행
//   reset    종료하고 로컬 학습 기록(.data/pglite) 삭제 (--yes 가 없으면 확인을 묻습니다)
//   status   실행 상태와 API 상태 확인
//   logs     로그 보기 (api, web 또는 둘 다)
// up/restart 옵션: --memory (끄면 사라지는 임시 DB), --agent (도구를 쓰는 채팅 코치), --no-open (브라우저 안 열기)
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, openSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { join } from "node:path";
import { ROOT } from "./workspace.mjs";

const RUN_DIR = join(ROOT, ".data", "dev");
const DATA_DIR = join(ROOT, ".data", "pglite");
const IMAGE = process.env.FP_RUNNER_IMAGE ?? "fp-gleam-runner:1.18.1";
const API_PORT = Number(process.env.PORT ?? 8787);
const WEB_PORT = 5173;
const API_URL = `http://localhost:${API_PORT}`;
const WEB_URL = `http://localhost:${WEB_PORT}`;

const [command = "help", ...rest] = process.argv.slice(2);
const flags = new Set(rest.filter((a) => a.startsWith("-")));
const args = rest.filter((a) => !a.startsWith("-"));

const say = (msg) => console.log(msg);
const fail = (msg) => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const quiet = (cmd, argv, opts = {}) => spawnSync(cmd, argv, { cwd: ROOT, stdio: "ignore", ...opts }).status === 0;

// ---------- process bookkeeping ----------

const pidFile = (name) => join(RUN_DIR, `${name}.pid`);
const logFile = (name) => join(RUN_DIR, `${name}.log`);

function readPid(name) {
  try {
    return Number(readFileSync(pidFile(name), "utf8").trim()) || null;
  } catch {
    return null;
  }
}

function alive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function startDetached(name, cmd, argv, env) {
  mkdirSync(RUN_DIR, { recursive: true });
  const out = openSync(logFile(name), "a");
  writeFileSync(logFile(name), `\n===== ${new Date().toISOString()} ${cmd} ${argv.join(" ")} =====\n`, { flag: "a" });
  const child = spawn(cmd, argv, { cwd: ROOT, env: { ...process.env, ...env }, detached: true, stdio: ["ignore", out, out] });
  child.unref();
  writeFileSync(pidFile(name), String(child.pid));
  return child.pid;
}

async function stop(name) {
  const pid = readPid(name);
  if (alive(pid)) {
    try {
      process.kill(-pid, "SIGTERM"); // whole process group (pnpm -> node/vite)
    } catch {
      try {
        process.kill(pid, "SIGTERM");
      } catch {}
    }
    for (let i = 0; i < 50 && alive(pid); i++) await sleep(100);
    if (alive(pid)) {
      try {
        process.kill(-pid, "SIGKILL");
      } catch {}
    }
    say(`■ ${name} 종료`);
  }
  if (existsSync(pidFile(name))) unlinkSync(pidFile(name));
}

async function waitFor(url, seconds) {
  for (let i = 0; i < seconds * 2; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
    } catch {}
    await sleep(500);
  }
  return null;
}

/** pid listening on a TCP port, via lsof (macOS/Linux); null if free or unknown. */
function portOwner(port) {
  const r = spawnSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"], { encoding: "utf8" });
  const pid = Number((r.stdout ?? "").split("\n")[0]);
  return pid || null;
}

function ensurePortsFree() {
  for (const [label, port] of [["API", API_PORT], ["웹", WEB_PORT]]) {
    const pid = portOwner(port);
    if (pid) fail(`${label} 포트 ${port}를 다른 프로세스(pid ${pid})가 쓰고 있습니다. 종료한 뒤 다시 시도하세요: kill ${pid}`);
  }
}

// ---------- prerequisites ----------

function ensureDeps() {
  if (existsSync(join(ROOT, "node_modules", ".pnpm"))) return;
  say("• 의존성 설치 중 (pnpm install)…");
  if (spawnSync("pnpm", ["install"], { cwd: ROOT, stdio: "inherit" }).status !== 0) fail("pnpm install 실패");
}

async function ensureDocker() {
  if (quiet("docker", ["info"])) return;
  if (process.platform === "darwin") {
    say("• Docker Desktop 시작 중…");
    spawnSync("open", ["-a", "Docker"]);
    for (let i = 0; i < 90; i++) {
      if (quiet("docker", ["info"])) return;
      await sleep(1000);
    }
  }
  fail("Docker가 실행 중이 아닙니다. Docker를 켠 뒤 다시 시도하세요 (채점기가 학습자 코드를 컨테이너에서 실행합니다).");
}

function ensureImage() {
  if (quiet("docker", ["image", "inspect", IMAGE])) return;
  say(`• 채점 이미지 ${IMAGE} 빌드 중 (최초 1회, 몇 분 소요)…`);
  const r = spawnSync("sh", ["modules/grading/runners/gleam/build-image.sh"], { cwd: ROOT, stdio: "inherit" });
  if (r.status !== 0) fail("채점 이미지 빌드 실패");
}

// ---------- commands ----------

async function up() {
  if (alive(readPid("api")) || alive(readPid("web"))) {
    say("이미 실행 중입니다. 다시 시작하려면 ./fpctl restart");
    await status();
    return;
  }
  ensurePortsFree();
  ensureDeps();
  await ensureDocker();
  ensureImage();

  const memory = flags.has("--memory");
  const env = { FP_DATA_DIR: memory ? "memory" : DATA_DIR, PORT: String(API_PORT) };
  if (flags.has("--agent")) env.FP_COACH_CHAT_AGENT = "on";
  say(`• API 시작 중 (${memory ? "임시 메모리 DB" : `DB ${DATA_DIR}`}${flags.has("--agent") ? ", 채팅 에이전트 켬" : ""})…`);
  startDetached("api", "node", ["apps/api/src/main.ts"], env);
  const health = await waitFor(`${API_URL}/v1/health`, 90);
  if (!health) {
    await stop("api");
    fail(`API가 정상 기동하지 않았습니다. 마지막 로그:\n${tail("api", 20)}`);
  }
  const h = await health.json();

  say("• 웹 시작 중…");
  startDetached("web", "pnpm", ["--filter", "@fp/web", "exec", "vite", "--port", String(WEB_PORT), "--strictPort"], {
    VITE_API_URL: API_URL,
  });
  if (!(await waitFor(WEB_URL, 60))) {
    await stop("web");
    fail(`웹이 시작되지 않았습니다. 마지막 로그:\n${tail("web", 20)}`);
  }

  say("");
  say(`✓ FP Training Flash 실행 중`);
  say(`  web    ${WEB_URL}`);
  say(`  api    ${API_URL}  (콘텐츠 ${h.contentBundle}, 채점기 ${h.runner}, 코치 ${h.llm})`);
  say(`  로그 ./fpctl logs   종료 ./fpctl down   기록 초기화 ./fpctl reset`);
  if (!flags.has("--no-open") && process.platform === "darwin") spawnSync("open", [WEB_URL]);
}

async function down() {
  await stop("web");
  await stop("api");
  // Grader containers are removed after each job; clean up any left by a crash.
  const r = spawnSync("docker", ["ps", "-aq", "--filter", "label=fp.grading=job"], { encoding: "utf8" });
  const ids = (r.stdout ?? "").split("\n").filter(Boolean);
  if (ids.length) spawnSync("docker", ["rm", "-f", ...ids], { stdio: "ignore" });
  say("✓ 종료됨");
}

async function reset() {
  if (!flags.has("--yes") && !flags.has("-y")) {
    if (!process.stdin.isTTY) fail("reset은 로컬 학습 기록을 모두 지웁니다. 진행하려면 --yes 를 붙이세요");
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(`${DATA_DIR} 의 학습 기록을 모두 지울까요? [y/N] `);
    rl.close();
    if (!/^y(es)?$/i.test(answer.trim())) return say("취소됨");
  }
  await down();
  rmSync(DATA_DIR, { recursive: true, force: true });
  say(`✓ 기록 초기화 완료 (${DATA_DIR} 삭제). ./fpctl up 으로 다시 시작하세요`);
}

function tail(name, n) {
  try {
    return readFileSync(logFile(name), "utf8").trimEnd().split("\n").slice(-n).join("\n");
  } catch {
    return "(로그 없음)";
  }
}

async function status() {
  for (const name of ["api", "web"]) {
    const pid = readPid(name);
    say(`${name.padEnd(4)} ${alive(pid) ? `실행 중 (pid ${pid})` : "꺼짐"}`);
  }
  try {
    const h = await (await fetch(`${API_URL}/v1/health`)).json();
    say(`health ${JSON.stringify(h)}`);
  } catch {
    say("health 응답 없음");
  }
  say(`data   ${existsSync(DATA_DIR) ? DATA_DIR : "(아직 없음)"}`);
}

function logs() {
  const which = args[0] === "api" || args[0] === "web" ? [args[0]] : ["api", "web"];
  const files = which.map(logFile).filter(existsSync);
  if (!files.length) return say("아직 로그가 없습니다");
  spawn("tail", ["-n", "40", "-f", ...files], { stdio: "inherit" });
}

const commands = {
  up,
  down,
  restart: async () => {
    await down();
    await up();
  },
  reset,
  status,
  logs,
};

if (!(command in commands)) {
  say(readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(1, 9).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
  process.exit(command === "help" ? 0 : 1);
}
await commands[command]();
