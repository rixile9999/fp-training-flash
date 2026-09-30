import { describe, expect, it } from "vitest";
import {
  blankCommentsAndStrings,
  extractFunction,
  importedModules,
  moduleNameFromPath,
  publicNames,
  topLevelFunctions,
} from "../src/gleam/source.ts";
import { fixture } from "./helpers.ts";

describe("gleam source helpers", () => {
  it("blanks comments and string contents but keeps offsets", () => {
    const code = 'let a = "x // @external \\" y" // @external here\nlet b = 1';
    const blanked = blankCommentsAndStrings(code);
    expect(blanked.length).toBe(code.length);
    expect(blanked).not.toContain("@external");
    expect(blanked).toContain("let b = 1");
    expect(blanked.split("\n")).toHaveLength(2);
  });

  it("extracts a test function with its body", () => {
    const code = extractFunction(fixture("coupon_test.gleam"), "keeps_order_test");
    expect(code).toMatch(/^pub fn keeps_order_test\(\) \{/);
    expect(code).toContain("Order(2, Cancelled, 300)");
    expect(code?.trimEnd().endsWith("}")).toBe(true);
    expect(extractFunction(fixture("coupon_test.gleam"), "missing_test")).toBeNull();
  });

  it("finds top-level functions and skips bodiless @external declarations", () => {
    const fns = topLevelFunctions(fixture("external.gleam"));
    expect(fns.map((f) => f.name)).toEqual(["apply_coupon"]);
    const quad = topLevelFunctions(fixture("quadratic.gleam"));
    expect(quad.map((f) => [f.name, f.isPublic])).toEqual([
      ["apply_coupon", true],
      ["go", false],
    ]);
    const go = quad[1]!;
    expect(go.endLine - go.startLine + 1).toBe(12);
  });

  it("lists imports, module names and public names", () => {
    expect(importedModules('import gleam/list\nimport coupon.{Order}\n// import fp_internal/harness\nconst s = "import x"')).toEqual([
      "gleam/list",
      "coupon",
    ]);
    expect(moduleNameFromPath("src/foo/bar.gleam")).toBe("foo/bar");
    expect(moduleNameFromPath("coupon_test.gleam")).toBe("coupon_test");
    expect(publicNames(fixture("reference.gleam")).sort()).toEqual(
      ["Cancelled", "Order", "Pending", "Shipped", "Status", "apply_coupon"].sort(),
    );
  });
});
