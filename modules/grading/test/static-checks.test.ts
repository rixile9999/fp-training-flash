import { describe, expect, it } from "vitest";
import { staticChecks } from "../src/grading/static-checks.ts";
import { rubricChecks } from "../src/grading/rubric.ts";
import { couponSpec, fixture } from "./helpers.ts";

const spec = couponSpec();
const src = (content: string) => [{ path: "src/coupon.gleam", content }];

describe("staticChecks", () => {
  it("accepts the reference solution", () => {
    expect(staticChecks(spec, src(fixture("reference.gleam")))).toEqual([]);
  });

  it("rejects @external", () => {
    const reasons = staticChecks(spec, src(fixture("external.gleam")));
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toContain("@external");
  });

  it("ignores @external inside comments and strings", () => {
    const code = `${fixture("reference.gleam")}\n// @external(erlang, "os", "cmd")\npub const note = "@external"\n`;
    expect(staticChecks(spec, src(code))).toEqual([]);
  });

  it("rejects grader-internal, runner and test-module imports", () => {
    for (const imp of ["fp_internal/harness", "fp_internal_harness_ffi", "gleeunit", "gleeunit/internal/reporting", "coupon_test", "other_test"]) {
      const reasons = staticChecks(spec, src(`import ${imp}\n${fixture("reference.gleam")}`));
      expect(reasons, imp).toHaveLength(1);
      expect(reasons[0]).toContain(imp);
    }
    expect(staticChecks(spec, src(`import gleeunit/should\n${fixture("reference.gleam")}`))).toEqual([]);
  });

  it("rejects oversized files, NUL bytes and empty submissions", () => {
    expect(staticChecks(spec, src("x".repeat(70_000)))[0]).toContain("너무 깁니다");
    expect(staticChecks(spec, src("pub fn a() { 1 }\u0000"))[0]).toContain("NUL");
    expect(staticChecks(spec, [])).toHaveLength(1);
  });
});

describe("rubricChecks", () => {
  const rubric = [
    { id: "R-01", title: "map", description: "", automatedCheck: { kind: "forbid_pattern", pattern: "list\\.filter", message: "filter는 길이를 바꿉니다" } },
    { id: "R-02", title: "map", description: "", automatedCheck: { kind: "require_pattern", pattern: "list\\.map", message: "list.map을 쓰세요" } },
    { id: "R-03", title: "short", description: "", automatedCheck: { kind: "max_function_lines", max: 8 } },
    { id: "R-04", title: "no check", description: "" },
  ] as const;

  it("flags or passes each automated check and skips items without one", () => {
    const wrong = rubricChecks(rubric, src(fixture("wrong-filter-drops.gleam")));
    expect(wrong.map((r) => [r.rubricId, r.status])).toEqual([
      ["R-01", "flagged"],
      ["R-02", "ok"],
      ["R-03", "ok"],
    ]);
    expect(wrong[0]?.message).toBe("filter는 길이를 바꿉니다");
    const quad = rubricChecks(rubric, src(fixture("quadratic.gleam")));
    expect(quad.map((r) => r.status)).toEqual(["ok", "flagged", "flagged"]);
    expect(quad[2]?.message).toContain("go(12줄)");
  });

  it("ignores patterns that only appear in comments", () => {
    const code = `// list.filter would be wrong\n${fixture("reference.gleam")}`;
    expect(rubricChecks(rubric.slice(0, 1), src(code))[0]?.status).toBe("ok");
  });
});
