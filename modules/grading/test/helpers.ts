/** Shared test fixtures: the orders-apply-coupon spec, a fake catalog and a scriptable fake runner. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { asId } from "@fp/kernel";
import type { ExerciseId, Locale, UserId } from "@fp/kernel";
import type { ContentCatalog, FileContent, GradingSpec } from "@fp/content/contract";
import type { CodeRunner, HelpUsed, RunJob, RunOutput, RunnerInfo } from "../src/contract/index.ts";

const FIXTURES = join(import.meta.dirname, "fixtures", "orders-apply-coupon");

export function fixture(name: string): string {
  return readFileSync(join(FIXTURES, name), "utf8");
}

export const EXERCISE_ID = asId<ExerciseId>("orders-apply-coupon/base@1");
export const USER = asId<UserId>("user-1");

export const couponTestFile: FileContent = { path: "test/coupon_test.gleam", content: fixture("coupon_test.gleam") };

/** Mirrors content/exercises/orders-apply-coupon/base/exercise.yaml. */
export function couponSpec(overrides: Partial<GradingSpec> = {}): GradingSpec {
  return {
    exerciseId: EXERCISE_ID,
    language: "gleam",
    kind: "implement",
    moduleName: "coupon",
    testFiles: [couponTestFile],
    supportFiles: [],
    tests: [
      { id: "T1", functionName: "empty_list_test", name: "빈 목록은 빈 목록을 반환한다", visibility: "public" },
      { id: "T2", functionName: "discounts_pending_test", name: "Pending 주문의 금액을 할인한다", visibility: "public", requirementIds: ["R1"] },
      {
        id: "T3",
        functionName: "keeps_other_orders_test",
        name: "Pending과 Shipped가 섞인 목록",
        visibility: "public",
        errorTag: "drops_items_with_filter",
        requirementIds: ["R2"],
      },
      {
        id: "T4",
        functionName: "keeps_order_test",
        name: "원래 순서를 유지한다",
        visibility: "hidden",
        errorTag: "reorders_items",
        requirementIds: ["R3"],
      },
      { id: "T5", functionName: "rounds_down_test", name: "할인 금액은 내림한다", visibility: "hidden", errorTag: "wrong_rounding" },
    ],
    requirements: [
      { id: "R1", description: "Pending 주문만 금액 변경" },
      { id: "R2", description: "대상 외 주문 보존" },
      { id: "R3", description: "순서 유지" },
    ],
    rubric: [],
    limits: { timeMs: 10000, memoryMb: 256 },
    ...overrides,
  };
}

export const NO_HELP: HelpUsed = {
  maxHintLevel: 0,
  conceptNotesOpened: 0,
  theoryNotesOpened: 0,
  explanationViewed: false,
  coachMessages: 0,
};

export function fakeCatalog(specs: readonly GradingSpec[]): ContentCatalog {
  const byId = new Map(specs.map((s) => [s.exerciseId as string, s]));
  const none = async () => null;
  const empty = async () => [];
  return {
    listSkills: empty,
    getSkill: none,
    listExercises: empty,
    getExercise: none,
    getGradingSpec: async (id) => byId.get(id) ?? null,
    getReferenceMaterial: none,
    getConceptNotes: empty,
    getTheoryTopics: empty,
    listTheoryTopics: empty,
    listLessonUnits: async () => [],
    getLesson: async () => null,
    getLessonAnswer: async () => null,
    listRecallDecks: async () => [],
    listRecallCards: async () => [],
    getRecallCard: async () => null,
    getRecallCardKey: async () => null,
    currentBundle: none,
  };
}

/**
 * A catalog whose grading specs depend on the locale, like the real one: `translate(spec, locale)` returns the
 * localized spec (or the spec itself for a missing translation). Records the locale of every getGradingSpec call.
 */
export function localizedCatalog(
  specs: readonly GradingSpec[],
  translate: (spec: GradingSpec, locale: Locale) => GradingSpec,
): ContentCatalog & { readonly specLocales: (Locale | undefined)[] } {
  const base = fakeCatalog(specs);
  const specLocales: (Locale | undefined)[] = [];
  return {
    ...base,
    specLocales,
    getGradingSpec: async (id, locale) => {
      specLocales.push(locale);
      const spec = await base.getGradingSpec(id);
      return spec ? translate(spec, locale ?? "ko") : null;
    },
  };
}

/** English and Chinese test names / requirement descriptions for couponSpec (zh lacks R3: falls back to ko). */
export function translateCoupon(spec: GradingSpec, locale: Locale): GradingSpec {
  const names: Partial<Record<Locale, Record<string, string>>> = {
    en: { T1: "An empty list returns an empty list", T2: "Discounts Pending orders", T3: "A mix of Pending and Shipped", T4: "Keeps the original order", T5: "Rounds the discount down" },
    zh: { T1: "空列表返回空列表", T2: "对待发货订单打折", T3: "待发货与已发货混合的列表", T4: "保持原有顺序", T5: "折扣金额向下取整" },
  };
  const reqs: Partial<Record<Locale, Record<string, string>>> = {
    en: { R1: "Only Pending orders change amount", R2: "Other orders are kept", R3: "Order is preserved" },
    zh: { R1: "只修改待发货订单的金额", R2: "保留其他订单" },
  };
  return {
    ...spec,
    tests: spec.tests.map((t) => ({ ...t, name: names[locale]?.[t.id] ?? t.name })),
    requirements: spec.requirements.map((r) => ({ ...r, description: reqs[locale]?.[r.id] ?? r.description })),
    rubric: spec.rubric.map((item) =>
      item.automatedCheck && item.automatedCheck.kind !== "max_function_lines" && locale !== "ko"
        ? { ...item, automatedCheck: { ...item.automatedCheck, message: `[${locale}] ${item.automatedCheck.message}` } }
        : item,
    ),
  };
}

export const FAKE_INFO: RunnerInfo = { runner: "local", languageVersion: "1.18.1", runtimeVersion: "OTP 29" };

/** Result of every requested test as passed, except the given function names. */
export function completed(job: RunJob, failing: Record<string, "failed" | "error" | "timeout"> = {}): RunOutput {
  return {
    kind: "completed",
    compileDiagnostics: [],
    tests: job.testFunctions.map((q) => {
      const fn = q.slice(q.lastIndexOf(".") + 1);
      const status = failing[fn] ?? "passed";
      return status === "passed" ? { functionName: fn, status } : { functionName: fn, status, message: `${fn} 실패` };
    }),
    performance: [],
    runner: FAKE_INFO,
    durationMs: 12,
  };
}

export interface FakeRunner extends CodeRunner {
  readonly jobs: RunJob[];
}

export function fakeRunner(respond: (job: RunJob) => RunOutput | Promise<RunOutput> = (job) => completed(job)): FakeRunner {
  const jobs: RunJob[] = [];
  return {
    language: "gleam",
    jobs,
    info: async () => FAKE_INFO,
    run: async (job) => {
      jobs.push(job);
      return respond(job);
    },
  };
}
