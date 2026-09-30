import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULTS, loadConfig, REPO_ROOT, runnerLabel } from "../src/config.ts";
import { createRateLimiter } from "../src/rate-limit.ts";
import { MODULE_MIGRATIONS } from "../src/bootstrap.ts";
import { fakeClock } from "./fakes.ts";

describe("loadConfig", () => {
  it("uses defaults for an empty environment", () => {
    const r = loadConfig({}, "/work");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toEqual({
      port: 8787,
      db: { kind: "pglite", dataDir: resolve("/work", ".data/pglite") },
      contentDir: resolve(REPO_ROOT, "content"),
      runner: { kind: "docker", image: "fp-gleam-runner:1.18.1" },
      llm: { provider: "none" },
      webOrigin: "http://localhost:5173",
    });
  });

  it("prefers DATABASE_URL and supports in-memory PGlite", () => {
    const pg = loadConfig({ DATABASE_URL: "postgres://x/y", FP_DATA_DIR: "memory" });
    expect(pg.ok && pg.value.db).toEqual({ kind: "postgres", url: "postgres://x/y" });
    const mem = loadConfig({ FP_DATA_DIR: "memory" });
    expect(mem.ok && mem.value.db).toEqual({ kind: "pglite", dataDir: undefined });
  });

  it("enables the LLM only when an API key is present", () => {
    const off = loadConfig({ FP_COACH_MODEL: "m" });
    expect(off.ok && off.value.llm).toEqual({ provider: "none" });
    const on = loadConfig({ ANTHROPIC_API_KEY: "sk-test" });
    expect(on.ok && on.value.llm).toEqual({ provider: "anthropic", apiKey: "sk-test", model: DEFAULTS.coachModel });
    const custom = loadConfig({ ANTHROPIC_API_KEY: "sk-test", FP_COACH_MODEL: "m" });
    expect(custom.ok && custom.value.llm).toMatchObject({ model: "m" });
  });

  it("selects DashScope when only its key is set, or when requested explicitly", () => {
    const ds = loadConfig({ DASHSCOPE_API_KEY: "sk-ds" });
    expect(ds.ok && ds.value.llm).toEqual({
      provider: "dashscope",
      apiKey: "sk-ds",
      model: DEFAULTS.dashscopeCoachModel,
      baseUrl: DEFAULTS.dashscopeBaseUrl,
      enableThinking: false,
      chatAgent: false,
    });
    const agent = loadConfig({ DASHSCOPE_API_KEY: "sk-ds", FP_COACH_CHAT_AGENT: "on" });
    expect(agent.ok && agent.value.llm).toMatchObject({ provider: "dashscope", chatAgent: true });
    const both = loadConfig({ ANTHROPIC_API_KEY: "sk-a", DASHSCOPE_API_KEY: "sk-ds" });
    expect(both.ok && both.value.llm.provider).toBe("anthropic");
    const forced = loadConfig({
      ANTHROPIC_API_KEY: "sk-a",
      DASHSCOPE_API_KEY: "sk-ds",
      FP_LLM_PROVIDER: "dashscope",
      FP_COACH_MODEL: "qwen3.8-max",
      FP_COACH_THINKING: "on",
    });
    expect(forced.ok && forced.value.llm).toMatchObject({ provider: "dashscope", model: "qwen3.8-max", enableThinking: true });
    expect(loadConfig({ FP_LLM_PROVIDER: "dashscope" }).ok).toBe(false);
    expect(loadConfig({ FP_LLM_PROVIDER: "openai" }).ok).toBe(false);
    const none = loadConfig({ DASHSCOPE_API_KEY: "sk-ds", FP_LLM_PROVIDER: "none" });
    expect(none.ok && none.value.llm).toEqual({ provider: "none" });
  });

  it("configures the runner", () => {
    const docker = loadConfig({ FP_RUNNER_IMAGE: "img:1" });
    expect(docker.ok && runnerLabel(docker.value.runner)).toBe("docker:img:1");
    const local = loadConfig({ FP_RUNNER: "local", FP_RUNNER_TEMPLATE_DIR: "tpl" }, "/work");
    expect(local.ok && local.value.runner).toEqual({ kind: "local", templateDir: resolve("/work", "tpl") });
  });

  it("reports every invalid setting", () => {
    const r = loadConfig({ PORT: "http", FP_RUNNER: "local" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe("invalid_input");
    expect(r.error.details?.problems).toHaveLength(2);
    expect(loadConfig({ FP_RUNNER: "podman" }).ok).toBe(false);
  });

  it("reads PORT, content dir and web origin", () => {
    const r = loadConfig({ PORT: "9000", FP_CONTENT_DIR: "c", FP_WEB_ORIGIN: "https://fp.example" }, "/work");
    expect(r.ok && [r.value.port, r.value.contentDir, r.value.webOrigin]).toEqual([
      9000,
      resolve("/work", "c"),
      "https://fp.example",
    ]);
  });
});

describe("createRateLimiter", () => {
  it("is a sliding window that does not count rejected attempts", () => {
    const clock = fakeClock();
    const limiter = createRateLimiter(clock);
    const rule = { limit: 2, windowMs: 1000 };
    expect(limiter.check("a", rule).allowed).toBe(true);
    clock.advance(400);
    expect(limiter.check("a", rule).allowed).toBe(true);
    expect(limiter.check("a", rule)).toEqual({ allowed: false, retryAfterMs: 600 });
    expect(limiter.check("b", rule).allowed).toBe(true);
    clock.advance(600);
    expect(limiter.check("a", rule).allowed).toBe(true);
    expect(limiter.check("a", rule)).toEqual({ allowed: false, retryAfterMs: 400 });
  });

  it("sweeps expired keys when the table grows", () => {
    const clock = fakeClock();
    const limiter = createRateLimiter(clock, 3);
    const rule = { limit: 1, windowMs: 100 };
    for (const k of ["a", "b", "c"]) limiter.check(k, rule);
    clock.advance(200);
    // Triggers a sweep; all old keys expired, so "a" is allowed again.
    expect(limiter.check("d", rule).allowed).toBe(true);
    expect(limiter.check("a", rule).allowed).toBe(true);
  });
});

describe("MODULE_MIGRATIONS", () => {
  it("runs in dependency order", () => {
    expect(MODULE_MIGRATIONS.map(([name]) => name)).toEqual([
      "accounts",
      "content",
      "grading",
      "learner",
      "sessions",
      "coaching",
    ]);
  });
});
