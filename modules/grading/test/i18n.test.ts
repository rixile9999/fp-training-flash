/** Locale behaviour: message catalog, failure rendering, static checks, rubric, predict, service. */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { asId, InMemoryEventBus, runMigrations, silentLogger, SUPPORTED_LOCALES } from "@fp/kernel";
import type { Db, ExerciseId, Locale } from "@fp/kernel";
import { createFixedClock, createTestDb } from "@fp/kernel/testing";
import { createGradingModule, migrations } from "../src/index.ts";
import type { RunOutput } from "../src/contract/index.ts";
import { localize, MESSAGES, msg } from "../src/messages.ts";
import { parseFailure, renderFailure, renderTestMessage, type TestFailure } from "../src/grading/failure.ts";
import { interpretRunOutput, predictEvaluation } from "../src/grading/interpret.ts";
import { rubricChecks } from "../src/grading/rubric.ts";
import { buildRunJob } from "../src/grading/run-job.ts";
import { checkSources, staticChecks } from "../src/grading/static-checks.ts";
import {
  completed,
  couponSpec,
  EXERCISE_ID,
  fakeRunner,
  fixture,
  localizedCatalog,
  NO_HELP,
  translateCoupon,
  USER,
} from "./helpers.ts";

const AT = "2026-09-30T00:00:00.000Z";
const HANGUL = /[가-힣]/;
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("message catalog", () => {
  it("has en and zh for every message, with the same placeholders as ko and no Korean left", () => {
    for (const [id, text] of Object.entries(MESSAGES)) {
      const t = text as { ko: string; en?: string; zh?: string };
      for (const locale of ["en", "zh"] as const) {
        expect(t[locale], `${id}.${locale}`).toBeTruthy();
        expect(placeholders(t[locale]!), `${id}.${locale}`).toEqual(placeholders(t.ko));
        expect(t[locale], `${id}.${locale}`).not.toMatch(HANGUL);
      }
    }
  });

  it("defaults to ko and falls back to ko for a missing translation", () => {
    expect(msg("service.notFound")).toBe("문제를 찾을 수 없습니다.");
    expect(msg("service.notFound", "en")).toBe("Exercise not found.");
    expect(msg("service.notFound", "zh")).toBe("找不到该题目。");
    expect(localize({ ko: "{n}개", en: "{n} items" }, "zh", { n: 3 })).toBe("3개");
    expect(localize({ ko: "{n}개", en: "{n} items" }, "en", { n: 3 })).toBe("3 items");
  });
});

describe("test failure rendering", () => {
  const cases: readonly TestFailure[] = [
    { kind: "budget_exhausted", limitMs: 10000 },
    { kind: "timeout", limitMs: 2000 },
    { kind: "memory", limitMb: 64 },
    { kind: "crashed", reason: "noproc" },
    { kind: "test_not_found", name: "coupon_test.x_test" },
    { kind: "module_not_found", module: "nope_test" },
    { kind: "bad_test_name", name: "x" },
    { kind: "assert", assertKind: "binary_operator", operator: "==", left: "1", right: null, location: { file: "test/a_test.gleam", line: 3 } },
    { kind: "assert", assertKind: "function_call", arguments: ["1", null] },
    { kind: "assert", assertKind: "expression" },
    { kind: "should_equal", expected: "[1]", actual: "[]", location: { file: "test/a_test.gleam", line: 9 } },
    { kind: "should_not_equal", actual: "1" },
    { kind: "todo", message: "later", location: { file: "src/coupon.gleam", line: 14 } },
    { kind: "let_assert", value: "Error(Nil)" },
    { kind: "exception", errorClass: "error", reason: "badarith", frame: { module: "coupon", function: "go", arity: 2, line: 7 } },
    { kind: "not_reported" },
    { kind: "aborted" },
  ];

  it("renders every natural-language failure differently per locale, keeping the data", () => {
    for (const f of cases) {
      const [ko, en, zh] = (["ko", "en", "zh"] as const).map((l) => renderFailure(f, l));
      expect(ko, f.kind).toMatch(HANGUL);
      expect(en, f.kind).not.toBe(ko);
      expect(zh, f.kind).not.toBe(ko);
      expect(zh, f.kind).not.toBe(en);
      expect(en, f.kind).not.toMatch(HANGUL);
      expect(zh, f.kind).not.toMatch(HANGUL);
    }
    const eq = cases[10]!;
    expect(renderFailure(eq, "ko")).toBe("값이 기대와 다릅니다.\n  기대값: [1]\n  실제값: [] (test/a_test.gleam:9)");
    expect(renderFailure(eq, "en")).toBe("The value is not what was expected.\n  expected: [1]\n  actual: [] (test/a_test.gleam:9)");
    expect(renderFailure(eq, "zh")).toBe("值与预期不符。\n  预期值：[1]\n  实际值：[] (test/a_test.gleam:9)");
    expect(renderFailure(cases[7]!, "en")).toContain("right: (not evaluated)");
  });

  it("keeps panic and raw assertion messages identical in every locale (snippets parse the panic prefix)", () => {
    const panic: TestFailure = { kind: "panic", message: "fpv1:1:1", location: { file: "test/fp_snippet_test.gleam", line: 7 } };
    for (const l of SUPPORTED_LOCALES) expect(renderFailure(panic, l)).toBe("panic: fpv1:1:1 (test/fp_snippet_test.gleam:7)");
  });

  it("appends captured output with a localized label, and falls back to the adapter message without structure", () => {
    const raw = { functionName: "t", status: "failed" as const, failure: { kind: "panic" as const, message: "x" }, output: "hi", outputTruncated: true };
    expect(renderTestMessage(raw, "ko")).toBe("panic: x\n\n출력:\nhi\n...(출력 생략)");
    expect(renderTestMessage(raw, "en")).toBe("panic: x\n\nOutput:\nhi\n...(output truncated)");
    expect(renderTestMessage(raw, "zh")).toBe("panic: x\n\n输出：\nhi\n...（输出已截断）");
    expect(renderTestMessage({ functionName: "t", status: "failed", message: "legacy 메시지" }, "en")).toBe("legacy 메시지");
  });

  it("parses harness failures defensively", () => {
    expect(parseFailure({ kind: "rm -rf" })).toBeUndefined();
    expect(parseFailure("should_equal")).toBeUndefined();
    expect(
      parseFailure({ kind: "assert", assertKind: "binary_operator", operator: "==", left: null, right: 3, location: { file: "a", line: "x" } }),
    ).toEqual({ kind: "assert", assertKind: "binary_operator", operator: "==", left: null, right: "?" });
  });
});

describe("interpretRunOutput / predict per locale", () => {
  const job = buildRunJob(couponSpec(), [{ path: "src/coupon.gleam", content: "" }], true);
  const structured: RunOutput = {
    ...(completed(job) as RunOutput & { kind: "completed" }),
    tests: job.testFunctions.map((q, i) => {
      const functionName = q.slice(q.lastIndexOf(".") + 1);
      return i === 2
        ? { functionName, status: "failed" as const, message: "ko rendering", failure: { kind: "should_equal", expected: "[1]", actual: "[]" } }
        : { functionName, status: "passed" as const };
    }),
  };

  it("uses the localized spec's names and renders failures in the locale; ko stays the default", () => {
    const en = interpretRunOutput(translateCoupon(couponSpec(), "en"), structured, AT, "en");
    expect(en.tests[2]).toMatchObject({ name: "A mix of Pending and Shipped", message: "The value is not what was expected.\n  expected: [1]\n  actual: []" });
    expect(en.requirements.map((r) => r.description)).toEqual(["Only Pending orders change amount", "Other orders are kept", "Order is preserved"]);
    const zh = interpretRunOutput(translateCoupon(couponSpec(), "zh"), structured, AT, "zh");
    expect(zh.tests[2]?.message).toBe("值与预期不符。\n  预期值：[1]\n  实际值：[]");
    // R3 has no zh translation in the catalog: Korean fallback.
    expect(zh.requirements.map((r) => r.description)).toEqual(["只修改待发货订单的金额", "保留其他订单", "순서 유지"]);
    const ko = interpretRunOutput(couponSpec(), structured, AT);
    expect(ko.tests[2]?.message).toBe("값이 기대와 다릅니다.\n  기대값: [1]\n  실제값: []");
  });

  it("localizes system errors and keeps the runner diagnostic", () => {
    const se = (l?: Locale) => interpretRunOutput(couponSpec(), { kind: "system_error", message: "docker down" }, AT, l).rejectionReasons;
    expect(se()).toEqual([msg("eval.systemError", "ko"), "docker down"]);
    expect(se("en")?.[0]).toMatch(/^A problem with the grading environment/);
    expect(se("zh")?.[0]).toMatch(/^评测环境出错/);
  });

  it("predict: test name and message follow the locale", () => {
    const spec = couponSpec({ kind: "predict", tests: [], requirements: [], predict: { code: "1 + 1", acceptedAnswers: ["2"] } });
    expect(predictEvaluation(spec, "3", AT).tests[0]).toMatchObject({ name: "예측한 결과", message: "예상한 값이 실제 결과와 다릅니다." });
    expect(predictEvaluation(spec, "3", AT, "en").tests[0]).toMatchObject({ name: "Your predicted result", message: "Your predicted value differs from the actual result." });
    expect(predictEvaluation(spec, "3", AT, "zh").tests[0]).toMatchObject({ name: "你预测的结果", message: "你预测的值与实际结果不同。" });
  });
});

describe("static checks and rubric per locale", () => {
  const src = (content: string) => [{ path: "src/coupon.gleam", content }];

  it("localizes rejection reasons with the file prefix", () => {
    const code = `import fp_internal/harness\n${fixture("external.gleam")}`;
    const [ko, en, zh] = (["ko", "en", "zh"] as const).map((l) => staticChecks(couponSpec(), src(code), l)) as [
      readonly string[],
      readonly string[],
      readonly string[],
    ];
    expect(ko).toHaveLength(2);
    expect(ko[0]).toBe("src/coupon.gleam: @external(외부 함수 연결)은 사용할 수 없습니다. Gleam 표준 라이브러리만 사용하세요.");
    expect(en[0]).toBe("src/coupon.gleam: @external (foreign function binding) is not allowed. Use only the Gleam standard library.");
    expect(zh[0]).toBe("src/coupon.gleam：不能使用 @external（外部函数绑定）。请只使用 Gleam 标准库。");
    expect(en[1]).toBe("src/coupon.gleam: You can't import the fp_internal/harness module (grader-internal module).");
    expect(zh[1]).toBe("src/coupon.gleam：不能 import fp_internal/harness 模块（评测器内部模块）。");
    expect(checkSources([], new Set(), "en")).toEqual(["No code was submitted."]);
    expect(staticChecks(couponSpec(), src(code))).toEqual(ko);
  });

  it("localizes generated rubric messages", () => {
    const rubric = [{ id: "R-03", title: "short", description: "", automatedCheck: { kind: "max_function_lines", max: 8 } }] as const;
    const files = src(fixture("quadratic.gleam"));
    expect(rubricChecks(rubric, files)[0]?.message).toContain("go(12줄)");
    expect(rubricChecks(rubric, files, "en")[0]?.message).toMatch(/^Functions longer than 8 lines: .*go \(12 lines\)/);
    expect(rubricChecks(rubric, files, "zh")[0]?.message).toMatch(/^以下函数超过 8 行：.*go（12 行）/);
  });
});

describe("service locale", () => {
  let db: Db;
  const clock = createFixedClock();
  const PREDICT_ID = asId<ExerciseId>("predict/base@1");
  const specs = [
    couponSpec({
      rubric: [{ id: "R-01", title: "filter", description: "", automatedCheck: { kind: "forbid_pattern", pattern: "list\\.filter", message: "filter 금지" } }],
    }),
    couponSpec({ exerciseId: PREDICT_ID, kind: "predict", tests: [], requirements: [], predict: { code: "1", acceptedAnswers: ["1"] } }),
  ];

  beforeEach(async () => {
    db = await createTestDb();
    await runMigrations(db, "grading", migrations);
  });
  afterEach(async () => {
    await db.close();
  });

  const setup = (respond: Parameters<typeof fakeRunner>[0] = (job) => completed(job, { keeps_other_orders_test: "failed" })) => {
    const catalog = localizedCatalog(specs, translateCoupon);
    const service = createGradingModule({
      db,
      clock,
      events: new InMemoryEventBus(silentLogger),
      logger: silentLogger,
      catalog,
      runner: fakeRunner(respond),
    }).service;
    return { service, catalog };
  };
  const req = (key: string, extra: object = {}) => ({
    userId: USER,
    exerciseId: EXERCISE_ID,
    code: fixture("wrong-filter-drops.gleam"),
    idempotencyKey: key,
    helpUsed: NO_HELP,
    ...extra,
  });
  const storedLocale = async (id: string) =>
    (await db.query<{ locale: string }>("select locale from grading.submissions where id = $1", [id])).rows[0]?.locale;

  it("evaluates in the request locale, loads the spec in it and stores it with the submission", async () => {
    const { service, catalog } = setup();
    const en = await service.submit(req("en", { locale: "en" }));
    const zh = await service.submit(req("zh", { locale: "zh" }));
    const ko = await service.submit(req("default"));
    if (!en.ok || !zh.ok || !ko.ok) throw new Error("submit failed");
    expect(catalog.specLocales).toEqual(["en", "zh", "ko"]);
    expect(en.value.evaluation?.tests.find((t) => t.id === "T3")?.name).toBe("A mix of Pending and Shipped");
    expect(zh.value.evaluation?.tests.find((t) => t.id === "T3")?.name).toBe("待发货与已发货混合的列表");
    expect(ko.value.evaluation?.tests.find((t) => t.id === "T3")?.name).toBe("Pending과 Shipped가 섞인 목록");
    expect(en.value.evaluation?.rubricChecks[0]?.message).toBe("[en] filter 금지");
    expect(await storedLocale(en.value.id)).toBe("en");
    expect(await storedLocale(zh.value.id)).toBe("zh");
    expect(await storedLocale(ko.value.id)).toBe("ko");
  });

  it("localizes rejections, system errors, trial runs and service errors; rejects unknown locales", async () => {
    const { service } = setup(() => ({ kind: "system_error", message: "docker down" }));
    const rejected = await service.submit(req("r", { locale: "en", code: fixture("external.gleam") }));
    expect(rejected.ok && rejected.value.evaluation?.rejectionReasons?.[0]).toMatch(/^src\/coupon\.gleam: @external \(foreign function binding\)/);
    const broken = await service.submit(req("s", { locale: "zh" }));
    expect(broken.ok && broken.value.evaluation?.rejectionReasons).toEqual([msg("eval.systemError", "zh"), "docker down"]);
    const trial = await service.trialRun({ exerciseId: EXERCISE_ID, code: fixture("reference.gleam"), locale: "en" });
    expect(!trial.ok && trial.error).toMatchObject({ code: "unavailable", message: msg("service.trialUnavailable", "en") });
    const predict = await service.trialRun({ exerciseId: PREDICT_ID, code: "1", locale: "zh" });
    expect(!predict.ok && predict.error.message).toBe("预测题无法运行。请直接提交答案。");
    const missing = await service.submit(req("m", { locale: "en", exerciseId: asId<ExerciseId>("nope@1") }));
    expect(!missing.ok && missing.error.message).toBe("Exercise not found.");
    const bad = await service.submit(req("b", { locale: "fr" }));
    expect(!bad.ok && bad.error.code).toBe("invalid_input");
    const badTrial = await service.trialRun({ exerciseId: EXERCISE_ID, code: "x", locale: "fr" as Locale });
    expect(!badTrial.ok && badTrial.error.code).toBe("invalid_input");
  });

  it("trial runs return localized public test names and messages", async () => {
    const { service } = setup((job) => ({
      ...(completed(job) as RunOutput & { kind: "completed" }),
      tests: job.testFunctions.map((q) => {
        const functionName = q.slice(q.lastIndexOf(".") + 1);
        return functionName === "keeps_other_orders_test"
          ? { functionName, status: "failed" as const, message: "ko", failure: { kind: "should_equal", expected: "[1]", actual: "[]" } }
          : { functionName, status: "passed" as const };
      }),
    }));
    const r = await service.trialRun({ exerciseId: EXERCISE_ID, code: fixture("wrong-filter-drops.gleam"), locale: "zh" });
    expect(r.ok && r.value.tests.map((t) => t.name)).toEqual(["空列表返回空列表", "对待发货订单打折", "待发货与已发货混合的列表"]);
    expect(r.ok && r.value.tests[2]?.message).toBe("值与预期不符。\n  预期值：[1]\n  实际值：[]");
  });

  it("recovers interrupted submissions with a message in each submission's locale", async () => {
    const catalog = localizedCatalog(specs, translateCoupon);
    const hanging = fakeRunner(() => new Promise<RunOutput>(() => {}));
    const events = new InMemoryEventBus(silentLogger);
    const crashed = createGradingModule({ db, clock, events, logger: silentLogger, catalog, runner: hanging });
    void crashed.service.submit(req("a", { locale: "en" }));
    void crashed.service.submit(req("b", { locale: "zh" }));
    void crashed.service.submit(req("c"));
    await new Promise((r) => setTimeout(r, 50));
    const restarted = createGradingModule({ db, clock, events, logger: silentLogger, catalog, runner: fakeRunner() });
    expect(await restarted.recoverInterrupted()).toBe(3);
    const recovered = await restarted.service.listSubmissions(USER);
    const byLocale = Object.fromEntries(
      await Promise.all(recovered.map(async (s) => [await storedLocale(s.id), s.evaluation?.rejectionReasons?.[0]])),
    );
    expect(byLocale).toEqual({
      en: msg("eval.interrupted", "en"),
      zh: msg("eval.interrupted", "zh"),
      ko: msg("eval.interrupted", "ko"),
    });
  });
});
