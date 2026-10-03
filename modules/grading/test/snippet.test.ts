import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { InMemoryEventBus, runMigrations, silentLogger } from "@fp/kernel";
import type { Db } from "@fp/kernel";
import { createFixedClock, createTestDb } from "@fp/kernel/testing";
import { createGradingModule, migrations } from "../src/index.ts";
import type { RunJob, RunOutput } from "../src/contract/index.ts";
import {
  buildSnippetJob,
  interpretSnippetOutput,
  parseSnippetValue,
  SNIPPET_LIMITS,
  SNIPPET_TEST,
} from "../src/grading/snippet.ts";
import { FAKE_INFO, fakeCatalog, fakeRunner } from "./helpers.ts";

const TOKEN = "fpvabc123";

function job(req: Parameters<typeof buildSnippetJob>[0]) {
  const r = buildSnippetJob(req, TOKEN);
  if (!r.ok || r.value.kind !== "job") throw new Error(`expected a job: ${JSON.stringify(r)}`);
  return r.value;
}

const valueTest = (status: "passed" | "failed" | "error" | "timeout", message?: string): RunOutput => ({
  kind: "completed",
  compileDiagnostics: [],
  tests: [{ functionName: "value_test", status, ...(message !== undefined ? { message } : {}) }],
  performance: [],
  runner: FAKE_INFO,
  durationMs: 5,
});

/** What the harness reports for a value v (see src/grading/snippet.ts). */
const reported = (token: string, v: string, suffix = " (test/fp_snippet_test.gleam:7)") =>
  `panic: ${token}:${Buffer.byteLength(v, "utf8")}:${v}${suffix}`;

const tokenOf = (j: RunJob) => /panic as \{ "(fpv[0-9a-f]+):"/.exec(j.testFiles[0]!.content)![1]!;

describe("buildSnippetJob", () => {
  it("builds the snippet module, the value test and small limits", () => {
    const { job: j, module } = job({
      imports: ["gleam/list", " gleam/int.{to_string, type Foo} "],
      definitions: "fn double(x) { x * 2 }",
      expression: "list.map([1], double)",
    });
    expect(module).toBe(
      "import gleam/string\nimport gleam/list\nimport gleam/int.{to_string, type Foo}\n\nfn double(x) { x * 2 }\n\npub fn value() {\nlist.map([1], double)\n}\n",
    );
    expect(j.sourceFiles).toEqual([{ path: "src/fp_snippet.gleam", content: module }]);
    expect(j.supportFiles).toEqual([]);
    expect(j.testFunctions).toEqual([SNIPPET_TEST]);
    expect(j.testFiles[0]?.path).toBe("test/fp_snippet_test.gleam");
    expect(j.testFiles[0]?.content).toContain(`panic as { "${TOKEN}:" <> int.to_string(string.byte_size(v)) <> ":" <> v }`);
    expect(j.limits).toEqual(SNIPPET_LIMITS);
    expect(j.performance).toBeUndefined();
  });

  it("uses the request's own gleam/string import instead of the default one", () => {
    expect(job({ imports: ["gleam/string.{length}"], expression: "length(\"ab\")" }).module).toMatch(
      /^import gleam\/string\.\{length\}\n\n/,
    );
  });

  it("rejects malformed imports and static-check violations", () => {
    for (const imp of ["gleam/list as l", "gleam/list\nimport fp_internal/harness", "Gleam/List", "gleam/list.{map", "../x", ""]) {
      const r = buildSnippetJob({ imports: [imp], expression: "1" }, TOKEN);
      expect(r.ok && r.value.kind, imp).toBe("rejected");
    }
    const forbidden = buildSnippetJob({ imports: ["fp_internal/harness"], expression: "1" }, TOKEN);
    expect(forbidden).toMatchObject({ ok: true, value: { kind: "rejected" } });
    const ext = buildSnippetJob({ imports: [], definitions: '@external(erlang, "os", "cmd")\nfn cmd(c: String) -> String', expression: "1" }, TOKEN);
    expect(ext.ok && ext.value.kind === "rejected" && ext.value.reasons[0]).toMatch(/^@external/);
    // Breaking out of value() does not hide anything: the whole module is checked.
    const escape = buildSnippetJob({ imports: [], expression: '1\n}\n@external(erlang, "os", "cmd")\nfn cmd(c: String) -> String\nfn x() {\n1' }, TOKEN);
    expect(escape.ok && escape.value.kind).toBe("rejected");
    const imported = buildSnippetJob({ imports: [], definitions: "import gleeunit", expression: "1" }, TOKEN);
    expect(imported.ok && imported.value.kind).toBe("rejected");
  });

  it("caps input sizes with invalid_input", () => {
    const big = "x".repeat(4001);
    for (const req of [
      { imports: [], expression: big },
      { imports: [], definitions: big, expression: "1" },
      { imports: Array.from({ length: 11 }, () => "gleam/list"), expression: "1" },
      { imports: [], expression: "   " },
    ]) {
      const r = buildSnippetJob(req, TOKEN);
      expect(!r.ok && r.error.code).toBe("invalid_input");
    }
  });
});

describe("parseSnippetValue / interpretSnippetOutput", () => {
  it("takes exactly <length> bytes after the token, ignoring location and captured output", () => {
    expect(parseSnippetValue(reported(TOKEN, "[2, 4]"), TOKEN)).toBe("[2, 4]");
    expect(parseSnippetValue(reported(TOKEN, '"한글 (x) :1:"', " (test/fp_snippet_test.gleam:7)\n\n출력:\nhi"), TOKEN)).toBe(
      '"한글 (x) :1:"',
    );
    expect(parseSnippetValue(reported("fpvother", "1"), TOKEN)).toBeNull();
    expect(parseSnippetValue("panic: boom (src/fp_snippet.gleam:6)", TOKEN)).toBeNull();
  });

  it("marks a value truncated by the harness", () => {
    expect(parseSnippetValue(`panic: ${TOKEN}:100:"abc한`.slice(0, -1) + "�", TOKEN)).toBe('"abc…');
    expect(parseSnippetValue(`panic: ${TOKEN}:100:[1, 2`, TOKEN)).toBe("[1, 2…");
  });

  it("maps runner outcomes", () => {
    expect(interpretSnippetOutput(valueTest("failed", reported(TOKEN, "-3")), TOKEN)).toEqual({ ok: true, value: { kind: "value", value: "-3" } });
    expect(interpretSnippetOutput(valueTest("error", "panic: boom (src/fp_snippet.gleam:6)"), TOKEN)).toEqual({
      ok: true,
      value: { kind: "runtime_error", message: "panic: boom (src/fp_snippet.gleam:6)" },
    });
    // A failed assertion that is not our value report (wrong token, gleeunit/should) is a runtime error.
    expect(interpretSnippetOutput(valueTest("failed", reported("fpvforged", "1")), TOKEN)).toMatchObject({
      ok: true,
      value: { kind: "runtime_error" },
    });
    expect(interpretSnippetOutput(valueTest("timeout", "시간 제한"), TOKEN)).toEqual({ ok: true, value: { kind: "timeout" } });
    expect(interpretSnippetOutput({ kind: "timeout", runner: FAKE_INFO, durationMs: 1 }, TOKEN)).toEqual({ ok: true, value: { kind: "timeout" } });
    const diag = { severity: "error" as const, message: "Type mismatch", file: "src/fp_snippet.gleam", line: 6 };
    const warning = { severity: "warning" as const, message: "Unused imported module", file: "src/fp_snippet.gleam", line: 1 };
    expect(
      interpretSnippetOutput({ kind: "compile_error", compileDiagnostics: [warning, diag], runner: FAKE_INFO, durationMs: 1 }, TOKEN),
    ).toEqual({ ok: true, value: { kind: "compile_error", diagnostics: [diag] } });
    for (const out of [{ kind: "system_error" as const, message: "docker down" }, valueTest("passed")]) {
      const r = interpretSnippetOutput(out, TOKEN);
      expect(!r.ok && r.error.code).toBe("unavailable");
    }
  });

  it("renders runtime errors in the request locale", () => {
    const todo: RunOutput = {
      kind: "completed",
      compileDiagnostics: [],
      tests: [{ functionName: "value_test", status: "error", message: "ko text", failure: { kind: "todo", message: "not yet" } } as RunOutput extends { tests: readonly (infer T)[] } ? T : never],
      performance: [],
      runner: FAKE_INFO,
      durationMs: 5,
    };
    const en = interpretSnippetOutput(todo, TOKEN, "en");
    expect(en.ok && en.value.kind === "runtime_error" && en.value.message).toMatch(/^Reached code that is not implemented yet \(todo\): not yet/);
    const ko = interpretSnippetOutput(todo, TOKEN);
    expect(ko.ok && ko.value.kind === "runtime_error" && ko.value.message).toMatch(/^아직 구현되지 않은 코드/);
    const zh = buildSnippetJob({ imports: [], expression: "", locale: "zh" }, TOKEN);
    expect(!zh.ok && /[\u4e00-\u9fff]/.test(zh.error.message)).toBe(true);
  });
});

describe("GradingService.evaluateSnippet", () => {
  let db: Db;
  beforeEach(async () => {
    db = await createTestDb();
    await runMigrations(db, "grading", migrations);
  });
  afterEach(async () => {
    await db.close();
  });

  const setup = (runner: ReturnType<typeof fakeRunner>, concurrency = 2) => {
    const events = new InMemoryEventBus(silentLogger);
    const published: unknown[] = [];
    events.subscribe("grading.submission_evaluated", async (e) => {
      published.push(e);
    });
    const service = createGradingModule({ db, clock: createFixedClock(), events, logger: silentLogger, catalog: fakeCatalog([]), runner, concurrency }).service;
    return { service, published };
  };

  it("runs the job with a fresh token, stores nothing and publishes nothing", async () => {
    const runner = fakeRunner((j) => valueTest("failed", reported(tokenOf(j), "[2, 4]")));
    const { service, published } = setup(runner);
    const r = await service.evaluateSnippet({ imports: ["gleam/list"], expression: "list.map([1, 2], fn(x) { x * 2 })" });
    expect(r).toEqual({ ok: true, value: { kind: "value", value: "[2, 4]" } });
    await service.evaluateSnippet({ imports: [], expression: "1" });
    expect(tokenOf(runner.jobs[0]!)).not.toBe(tokenOf(runner.jobs[1]!));
    expect(runner.jobs[0]?.sourceFiles[0]?.content).toContain("import gleam/list");
    expect(published).toEqual([]);
    expect((await db.query("select * from grading.submissions")).rows).toEqual([]);
  });

  it("rejects without running and maps runner failures to unavailable", async () => {
    const runner = fakeRunner(() => ({ kind: "system_error", message: "boom" }));
    const { service } = setup(runner);
    const rejected = await service.evaluateSnippet({ imports: [], definitions: '@external(erlang, "os", "cmd")\nfn cmd(c: String) -> String', expression: "1" });
    expect(rejected.ok && rejected.value.kind).toBe("rejected");
    expect(runner.jobs).toHaveLength(0);
    const down = await service.evaluateSnippet({ imports: [], expression: "1" });
    expect(!down.ok && down.error.code).toBe("unavailable");
    const thrown = setup(fakeRunner(() => Promise.reject(new Error("spawn failed")))).service;
    const t = await thrown.evaluateSnippet({ imports: [], expression: "1" });
    expect(!t.ok && t.error.code).toBe("unavailable");
  });

  it("goes through the bounded job queue", async () => {
    let active = 0;
    let peak = 0;
    const runner = fakeRunner(async (j) => {
      peak = Math.max(peak, ++active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return valueTest("failed", reported(tokenOf(j), "1"));
    });
    const { service } = setup(runner, 1);
    const results = await Promise.all(Array.from({ length: 4 }, () => service.evaluateSnippet({ imports: [], expression: "1" })));
    expect(results.every((r) => r.ok && r.value.kind === "value")).toBe(true);
    expect(peak).toBe(1);
  });
});
