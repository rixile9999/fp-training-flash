#!/usr/bin/env node
// 로컬 플랫폼 제어: ./fpctl up | down | restart | reset | status | logs [api|web]
//   up       API와 웹을 백그라운드로 실행 (필요하면 의존성 설치, Docker 기동, 채점 이미지 빌드)
//   down     둘 다 종료
//   restart  종료 후 다시 실행
//   reset    종료하고 로컬 학습 기록(.data/pglite) 삭제 (--yes 가 없으면 확인을 묻습니다)
//   status   실행 상태와 API 상태 확인
//   logs     로그 보기 (api, web 또는 둘 다)
// up/restart 옵션: --memory (끄면 사라지는 임시 DB), --agent (도구를 쓰는 채팅 코치), --no-open (브라우저 안 열기), --dev (마지막 커밋 대신 작업 폴더 코드로 실행),
//   --remote (Tailscale 기기에서 웹 접속 허용; restart는 이전 설정을 유지, --local 로 끔)
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, openSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { networkInterfaces } from "node:os";
import { join } from "node:path";
import { ROOT } from "./workspace.mjs";

const RUN_DIR = join(ROOT, ".data", "dev");
const DATA_DIR = join(ROOT, ".data", "pglite");
const IMAGE = process.env.FP_RUNNER_IMAGE ?? "fp-gleam-runner:1.18.1";
const API_PORT = Number(process.env.PORT ?? 8787);
const WEB_PORT = 5173;
const API_URL = `http://localhost:${API_PORT}`;
// fpctl's own checks and the web proxy use the IPv4 loopback the API listens on (FP_HOST default 127.0.0.1).
const API_LOOPBACK = `http://127.0.0.1:${API_PORT}`;
const WEB_URL = `http://localhost:${WEB_PORT}`;


// ---------- i18n ----------

const MESSAGES = {
  stableAt: { ko: "• 마지막 커밋으로 실행 준비 중: {commit} {subject}", en: "• preparing the last commit: {commit} {subject}", zh: "• 正在准备最新提交：{commit} {subject}" },
  devDirty: { ko: "! 작업 중인 코드로 실행합니다 (커밋되지 않은 변경 {n}개). 안정 실행은 --dev 없이 실행하세요.", en: "! running the working tree ({n} uncommitted changes). Omit --dev for a stable run.", zh: "! 正在运行工作区代码（{n} 处未提交更改）。如需稳定运行请去掉 --dev。" },
  modeLine: { ko: "  모드   {mode} ({commit})", en: "  mode   {mode} ({commit})", zh: "  模式   {mode}（{commit}）" },
  modeStable: { ko: "안정 실행: 마지막 커밋", en: "stable: last commit", zh: "稳定：最新提交" },
  modeDev: { ko: "개발: 작업 폴더", en: "dev: working tree", zh: "开发：工作区" },
  help: { ko: "로컬 플랫폼 제어: ./fpctl up | down | restart | reset | status | logs [api|web]\n  up       API와 웹을 백그라운드로 실행 (필요하면 의존성 설치, Docker 기동, 채점 이미지 빌드)\n  down     둘 다 종료\n  restart  종료 후 다시 실행\n  reset    종료하고 로컬 학습 기록(.data/pglite) 삭제 (--yes 가 없으면 확인을 묻습니다)\n  status   실행 상태와 API 상태 확인\n  logs     로그 보기 (api, web 또는 둘 다)\nup/restart 옵션: --memory (끄면 사라지는 임시 DB), --agent (도구를 쓰는 채팅 코치), --no-open (브라우저 안 열기), --dev (마지막 커밋 대신 작업 폴더 코드로 실행), --remote (Tailscale 기기에서 웹 접속 허용; restart는 이전 설정 유지, --local 로 끔)\n공통 옵션: --lang ko|en|zh (또는 FP_LANG)", en: "Local platform control: ./fpctl up | down | restart | reset | status | logs [api|web]\n  up       start API and web in the background (installs deps, starts Docker, builds the grader image if needed)\n  down     stop both\n  restart  stop, then start again\n  reset    stop and delete local learning data (.data/pglite); asks first unless --yes\n  status   show processes and API health\n  logs     follow logs (api, web or both)\nup/restart options: --memory (throwaway in-memory DB), --agent (tool-using chat coach), --no-open (don't open the browser), --dev (run the working tree instead of the last commit), --remote (allow web access from Tailscale devices; restart keeps the previous setting, --local turns it off)\nCommon option: --lang ko|en|zh (or FP_LANG)", zh: "本地平台控制：./fpctl up | down | restart | reset | status | logs [api|web]\n  up       在后台启动 API 和网页（按需安装依赖、启动 Docker、构建评测镜像）\n  down     停止两者\n  restart  停止后重新启动\n  reset    停止并删除本地学习记录（.data/pglite）；未加 --yes 时会先确认\n  status   查看进程与 API 状态\n  logs     查看日志（api、web 或全部）\nup/restart 选项：--memory（关闭即丢失的临时数据库）、--agent（使用工具的聊天教练）、--no-open（不打开浏览器）、--dev（运行工作区代码而非最新提交）、--remote（允许 Tailscale 设备访问网页；restart 沿用上次设置，--local 关闭）\n通用选项：--lang ko|en|zh（或 FP_LANG）" },
  stopped: { ko: "■ {name} 종료", en: "■ {name} stopped", zh: "■ {name} 已停止" },
  installing: { ko: "• 의존성 설치 중 (pnpm install)…", en: "• installing dependencies (pnpm install)…", zh: "• 正在安装依赖（pnpm install）…" },
  installFailed: { ko: "pnpm install 실패", en: "pnpm install failed", zh: "pnpm install 失败" },
  startingDocker: { ko: "• Docker Desktop 시작 중…", en: "• starting Docker Desktop…", zh: "• 正在启动 Docker Desktop…" },
  dockerDown: { ko: "Docker가 실행 중이 아닙니다. Docker를 켠 뒤 다시 시도하세요 (채점기가 학습자 코드를 컨테이너에서 실행합니다).", en: "Docker is not running. Start Docker and try again (the grader runs learner code in a container).", zh: "Docker 未运行。请启动 Docker 后重试（评测器在容器中运行学习者代码）。" },
  buildingImage: { ko: "• 채점 이미지 {image} 빌드 중 (최초 1회, 몇 분 소요)…", en: "• building grader image {image} (first run only, a few minutes)…", zh: "• 正在构建评测镜像 {image}（仅首次，需要几分钟）…" },
  imageFailed: { ko: "채점 이미지 빌드 실패", en: "grader image build failed", zh: "评测镜像构建失败" },
  portBusy: { ko: "{label} 포트 {port}를 다른 프로세스(pid {pid})가 쓰고 있습니다. 종료한 뒤 다시 시도하세요: kill {pid}", en: "{label} port {port} is used by another process (pid {pid}). Stop it and try again: kill {pid}", zh: "{label} 端口 {port} 被其他进程（pid {pid}）占用。请结束该进程后重试：kill {pid}" },
  labelApi: { ko: "API", en: "API", zh: "API" },
  labelWeb: { ko: "웹", en: "web", zh: "网页" },
  alreadyRunning: { ko: "이미 실행 중입니다. 다시 시작하려면 ./fpctl restart", en: "Already running. Use ./fpctl restart to restart.", zh: "已在运行。如需重启请执行 ./fpctl restart" },
  startingApi: { ko: "• API 시작 중 ({db}{agent})…", en: "• starting API ({db}{agent})…", zh: "• 正在启动 API（{db}{agent}）…" },
  memoryDb: { ko: "임시 메모리 DB", en: "in-memory DB", zh: "临时内存数据库" },
  agentOn: { ko: ", 채팅 에이전트 켬", en: ", chat agent on", zh: "，聊天智能体已开启" },
  apiUnhealthy: { ko: "API가 정상 기동하지 않았습니다. 마지막 로그:\n{log}", en: "API did not become healthy. Last log lines:\n{log}", zh: "API 未能正常启动。最后的日志：\n{log}" },
  startingWeb: { ko: "• 웹 시작 중…", en: "• starting web…", zh: "• 正在启动网页…" },
  webFailed: { ko: "웹이 시작되지 않았습니다. 마지막 로그:\n{log}", en: "Web did not start. Last log lines:\n{log}", zh: "网页未能启动。最后的日志：\n{log}" },
  running: { ko: "✓ FP Training Flash 실행 중", en: "✓ FP Training Flash is running", zh: "✓ FP Training Flash 正在运行" },
  apiLine: { ko: "  api    {url}  (콘텐츠 {bundle}, 채점기 {runner}, 코치 {llm})", en: "  api    {url}  (content {bundle}, grader {runner}, coach {llm})", zh: "  api    {url}  （内容 {bundle}，评测器 {runner}，教练 {llm}）" },
  hintLine: { ko: "  로그 ./fpctl logs   종료 ./fpctl down   기록 초기화 ./fpctl reset", en: "  logs ./fpctl logs   stop ./fpctl down   reset data ./fpctl reset", zh: "  日志 ./fpctl logs   停止 ./fpctl down   重置记录 ./fpctl reset" },
  allStopped: { ko: "✓ 종료됨", en: "✓ stopped", zh: "✓ 已停止" },
  resetNeedsYes: { ko: "reset은 로컬 학습 기록을 모두 지웁니다. 진행하려면 --yes 를 붙이세요", en: "reset deletes all local learning data; re-run with --yes", zh: "reset 会删除所有本地学习记录；如需继续请加 --yes" },
  resetQuestion: { ko: "{dir} 의 학습 기록을 모두 지울까요? [y/N] ", en: "Delete all local learning data in {dir}? [y/N] ", zh: "删除 {dir} 中的全部学习记录？[y/N] " },
  cancelled: { ko: "취소됨", en: "cancelled", zh: "已取消" },
  resetDone: { ko: "✓ 기록 초기화 완료 ({dir} 삭제). ./fpctl up 으로 다시 시작하세요", en: "✓ data reset ({dir} removed). Start again with ./fpctl up", zh: "✓ 记录已重置（已删除 {dir}）。使用 ./fpctl up 重新启动" },
  noLog: { ko: "(로그 없음)", en: "(no log)", zh: "（无日志）" },
  procRunning: { ko: "실행 중 (pid {pid})", en: "running (pid {pid})", zh: "运行中（pid {pid}）" },
  procStopped: { ko: "꺼짐", en: "stopped", zh: "已停止" },
  healthDown: { ko: "health 응답 없음", en: "health unreachable", zh: "health 无响应" },
  dataNone: { ko: "(아직 없음)", en: "(none yet)", zh: "（暂无）" },
  remoteLine: { ko: "  원격   {urls}  (Tailscale 기기에서 접속)", en: "  remote {urls}  (from Tailscale devices)", zh: "  远程   {urls}（从 Tailscale 设备访问）" },
  remoteWarn: { ko: "! 원격 모드: 개발용 로그인은 비밀번호가 없어서 같은 Tailscale 네트워크의 기기는 누구든 아무 이름으로 들어올 수 있습니다. 같은 Wi-Fi의 다른 기기는 차단됩니다.", en: "! remote mode: the dev login has no password, so any device on your tailnet can sign in under any name. Other devices on the LAN are blocked.", zh: "! 远程模式：开发登录没有密码，同一 Tailscale 网络中的任何设备都能以任意名字登录。同一局域网的其他设备会被拒绝。" },
  noTailscale: { ko: "Tailscale 주소를 찾지 못했습니다. Tailscale을 켜고 로그인한 뒤 다시 시도하세요.", en: "No Tailscale address found. Start Tailscale, sign in and try again.", zh: "未找到 Tailscale 地址。请启动并登录 Tailscale 后重试。" },
  noLogsYet: { ko: "아직 로그가 없습니다", en: "no logs yet", zh: "暂无日志" },
};

function resolveLocale() {
  const i = process.argv.indexOf("--lang");
  // The system LANG is ignored on purpose: macOS often reports en_US for Korean users. Default is Korean.
  const candidates = [i >= 0 ? process.argv[i + 1] : undefined, process.env.FP_LANG];
  for (const c of candidates) {
    const prefix = (c ?? "").toLowerCase().slice(0, 2);
    if (prefix === "ko" || prefix === "en" || prefix === "zh") return prefix;
  }
  return "ko";
}
const LOCALE = resolveLocale();
const t = (key, params = {}) => (MESSAGES[key][LOCALE] ?? MESSAGES[key].ko).replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m));

const argv = process.argv.slice(2).filter((a, i, all) => a !== "--lang" && all[i - 1] !== "--lang");
const [command = "help", ...rest] = argv;
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

function startDetached(name, cmd, argv, env, cwd = ROOT) {
  mkdirSync(RUN_DIR, { recursive: true });
  const out = openSync(logFile(name), "a");
  writeFileSync(logFile(name), `\n===== ${new Date().toISOString()} ${cmd} ${argv.join(" ")} =====\n`, { flag: "a" });
  const child = spawn(cmd, argv, { cwd, env: { ...process.env, ...env }, detached: true, stdio: ["ignore", out, out] });
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
    say(t("stopped", { name }));
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
  for (const [label, port] of [[t("labelApi"), API_PORT], [t("labelWeb"), WEB_PORT]]) {
    const pid = portOwner(port);
    if (pid) fail(t("portBusy", { label, port, pid }));
  }
}

// ---------- prerequisites ----------

function ensureDeps() {
  if (existsSync(join(ROOT, "node_modules", ".pnpm"))) return;
  say(t("installing"));
  if (spawnSync("pnpm", ["install"], { cwd: ROOT, stdio: "inherit" }).status !== 0) fail(t("installFailed"));
}

async function ensureDocker() {
  if (quiet("docker", ["info"])) return;
  if (process.platform === "darwin") {
    say(t("startingDocker"));
    spawnSync("open", ["-a", "Docker"]);
    for (let i = 0; i < 90; i++) {
      if (quiet("docker", ["info"])) return;
      await sleep(1000);
    }
  }
  fail(t("dockerDown"));
}

function ensureImage() {
  if (quiet("docker", ["image", "inspect", IMAGE])) return;
  say(t("buildingImage", { image: IMAGE }));
  const r = spawnSync("sh", ["modules/grading/runners/gleam/build-image.sh"], { cwd: ROOT, stdio: "inherit" });
  if (r.status !== 0) fail(t("imageFailed"));
}


// ---------- remote (Tailscale) ----------

/** Tailscale MagicDNS name and addresses of this machine; null when Tailscale is not connected. */
function tailscaleInfo() {
  for (const cli of ["tailscale", "/Applications/Tailscale.app/Contents/MacOS/Tailscale"]) {
    const r = spawnSync(cli, ["status", "--json"], { encoding: "utf8", timeout: 5000 });
    if (r.status !== 0 || !r.stdout) continue;
    try {
      const self = JSON.parse(r.stdout).Self ?? {};
      const ips = (self.TailscaleIPs ?? []).filter((ip) => !ip.includes(":"));
      const dnsName = String(self.DNSName ?? "").replace(/\.$/, "");
      if (ips.length) return { dnsName, ips };
    } catch {}
  }
  // No CLI: fall back to an interface address in Tailscale's 100.64.0.0/10 range.
  const ips = Object.values(networkInterfaces())
    .flat()
    .filter((a) => a && a.family === "IPv4" && /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(a.address))
    .map((a) => a.address);
  return ips.length ? { dnsName: "", ips } : null;
}

function previousMode() {
  try {
    return JSON.parse(readFileSync(modeFile, "utf8"));
  } catch {
    return {};
  }
}

// ---------- stable snapshot ----------

const STABLE_DIR = join(ROOT, ".data", "stable");
const modeFile = join(RUN_DIR, "mode.json");

/**
 * Default mode runs the last commit from a separate git worktree (.data/stable), so coding agents editing the
 * working tree cannot break or skew the running app. --dev runs the live working tree instead.
 */
function prepareStable() {
  const git = (...a) => spawnSync("git", a, { cwd: ROOT, encoding: "utf8" });
  const head = git("rev-parse", "HEAD").stdout.trim();
  if (!existsSync(join(STABLE_DIR, ".git"))) {
    spawnSync("git", ["worktree", "prune"], { cwd: ROOT, stdio: "ignore" });
    const r = git("worktree", "add", "--detach", STABLE_DIR, head);
    if (r.status !== 0) fail(`git worktree add failed: ${r.stderr}`);
  } else {
    const r = spawnSync("git", ["checkout", "--detach", "--force", head], { cwd: STABLE_DIR, encoding: "utf8" });
    if (r.status !== 0) fail(`git checkout failed: ${r.stderr}`);
  }
  say(t("stableAt", { commit: head.slice(0, 7), subject: git("log", "-1", "--format=%s", head).stdout.trim() }));
  const r = spawnSync("pnpm", ["install", "--frozen-lockfile", "--prefer-offline"], { cwd: STABLE_DIR, stdio: ["ignore", "ignore", "inherit"] });
  if (r.status !== 0) fail(t("installFailed"));
  return { dir: STABLE_DIR, commit: head };
}

function dirtyFiles() {
  const r = spawnSync("git", ["status", "--porcelain"], { cwd: ROOT, encoding: "utf8" });
  return (r.stdout ?? "").split("\n").filter(Boolean).length;
}

// ---------- commands ----------

async function up() {
  if (alive(readPid("api")) || alive(readPid("web"))) {
    say(t("alreadyRunning"));
    await status();
    return;
  }
  ensurePortsFree();
  ensureDeps();
  await ensureDocker();
  ensureImage();
  const dev = flags.has("--dev");
  const remote = flags.has("--remote");
  const tailnet = remote ? tailscaleInfo() : null;
  if (remote && !tailnet) fail(t("noTailscale"));
  const tree = dev ? { dir: ROOT, commit: "working tree" } : prepareStable();
  if (dev && dirtyFiles() > 0) say(t("devDirty", { n: dirtyFiles() }));
  mkdirSync(RUN_DIR, { recursive: true });
  writeFileSync(modeFile, JSON.stringify({ mode: dev ? "dev" : "stable", commit: tree.commit, remote }));

  const memory = flags.has("--memory");
  const env = { FP_DATA_DIR: memory ? "memory" : DATA_DIR, PORT: String(API_PORT) };
  if (flags.has("--agent")) env.FP_COACH_CHAT_AGENT = "on";
  say(t("startingApi", { db: memory ? t("memoryDb") : `DB ${DATA_DIR}`, agent: flags.has("--agent") ? t("agentOn") : "" }));
  startDetached("api", "node", ["apps/api/src/main.ts"], env, tree.dir);
  const health = await waitFor(`${API_LOOPBACK}/v1/health`, 90);
  if (!health) {
    await stop("api");
    fail(t("apiUnhealthy", { log: tail("api", 20) }));
  }
  const h = await health.json();

  say(t("startingWeb"));
  // vite directly (not via pnpm), so stopping it does not log a misleading pnpm failure.
  // The browser calls the API on the page's own origin ("/"), and vite proxies /v1 to the local API: this works from
  // other devices and needs no CORS. --remote listens on all interfaces; vite.config.ts then serves only loopback
  // and Tailscale addresses.
  const webEnv = { VITE_API_URL: "/", FP_API_PROXY: API_LOOPBACK };
  const viteArgs = ["--port", String(WEB_PORT), "--strictPort"];
  if (tailnet) {
    viteArgs.push("--host", "0.0.0.0");
    webEnv.FP_WEB_REMOTE = "tailscale";
    if (tailnet.dnsName) webEnv.FP_WEB_ALLOWED_HOSTS = [tailnet.dnsName, tailnet.dnsName.split(".")[0]].join(",");
  }
  startDetached("web", join(tree.dir, "apps/web/node_modules/.bin/vite"), viteArgs, webEnv, join(tree.dir, "apps/web"));
  if (!(await waitFor(WEB_URL, 60))) {
    await stop("web");
    fail(t("webFailed", { log: tail("web", 20) }));
  }

  say("");
  say(t("running"));
  say(`  web    ${WEB_URL}`);
  if (tailnet) {
    const urls = [tailnet.dnsName, ...tailnet.ips].filter(Boolean).map((h) => `http://${h}:${WEB_PORT}`);
    say(t("remoteLine", { urls: urls.join("  ") }));
  }
  say(t("apiLine", { url: API_URL, bundle: h.contentBundle, runner: h.runner, llm: h.llm }));
  say(t("modeLine", { mode: dev ? t("modeDev") : t("modeStable"), commit: tree.commit.slice(0, 7) }));
  say(t("hintLine"));
  if (tailnet) say(t("remoteWarn"));
  if (!flags.has("--no-open") && process.platform === "darwin") spawnSync("open", [WEB_URL]);
}

async function down() {
  await stop("web");
  await stop("api");
  // Grader containers are removed after each job; clean up any left by a crash.
  const r = spawnSync("docker", ["ps", "-aq", "--filter", "label=fp.grading=job"], { encoding: "utf8" });
  const ids = (r.stdout ?? "").split("\n").filter(Boolean);
  if (ids.length) spawnSync("docker", ["rm", "-f", ...ids], { stdio: "ignore" });
  say(t("allStopped"));
}

async function reset() {
  if (!flags.has("--yes") && !flags.has("-y")) {
    if (!process.stdin.isTTY) fail(t("resetNeedsYes"));
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(t("resetQuestion", { dir: DATA_DIR }));
    rl.close();
    if (!/^y(es)?$/i.test(answer.trim())) return say(t("cancelled"));
  }
  await down();
  rmSync(DATA_DIR, { recursive: true, force: true });
  say(t("resetDone", { dir: DATA_DIR }));
}

function tail(name, n) {
  try {
    return readFileSync(logFile(name), "utf8").trimEnd().split("\n").slice(-n).join("\n");
  } catch {
    return t("noLog");
  }
}

async function status() {
  for (const name of ["api", "web"]) {
    const pid = readPid(name);
    say(`${name.padEnd(4)} ${alive(pid) ? t("procRunning", { pid }) : t("procStopped")}`);
  }
  try {
    const h = await (await fetch(`${API_LOOPBACK}/v1/health`)).json();
    say(`health ${JSON.stringify(h)}`);
  } catch {
    say(t("healthDown"));
  }
  say(`data   ${existsSync(DATA_DIR) ? DATA_DIR : t("dataNone")}`);
  try {
    const m = JSON.parse(readFileSync(modeFile, "utf8"));
    say(t("modeLine", { mode: m.mode === "dev" ? t("modeDev") : t("modeStable"), commit: String(m.commit).slice(0, 7) }));
    if (m.remote) {
      const ts = tailscaleInfo();
      if (ts) say(t("remoteLine", { urls: [ts.dnsName, ...ts.ips].filter(Boolean).map((h) => `http://${h}:${WEB_PORT}`).join("  ") }));
    }
  } catch {}
}

function logs() {
  const which = args[0] === "api" || args[0] === "web" ? [args[0]] : ["api", "web"];
  const files = which.map(logFile).filter(existsSync);
  if (!files.length) return say(t("noLogsYet"));
  spawn("tail", ["-n", "40", "-f", ...files], { stdio: "inherit" });
}

const commands = {
  up,
  down,
  restart: async () => {
    // Keep remote access across restarts unless --local is given.
    if (previousMode().remote && !flags.has("--local")) flags.add("--remote");
    await down();
    await up();
  },
  reset,
  status,
  logs,
};

if (!(command in commands)) {
  say(t("help"));
  process.exit(command === "help" ? 0 : 1);
}
await commands[command]();
