import { describe, expect, it } from "vitest";
import { importedModules, REFERENCE_HASH, stdlibReference } from "../src/internal/gleam-reference.ts";
import { PROMPT_VERSION } from "../src/internal/prompts.ts";

describe("Gleam reference material", () => {
  it("finds imported stdlib modules in first-seen order", () => {
    const code = "import gleam/list\nimport gleam/dict.{type Dict}\nimport coupon.{Order}\n  import gleam/dynamic/decode";
    expect(importedModules([code, "import gleam/list\nimport gleam/int"])).toEqual([
      "gleam/list",
      "gleam/dict",
      "gleam/dynamic/decode",
      "gleam/int",
    ]);
  });

  it("includes signatures only for imported modules, always including gleam/list", () => {
    const ref = stdlibReference(["import gleam/option"]);
    expect(ref).toContain("gleam_stdlib 1.0.5");
    expect(ref).toContain("## gleam/list");
    expect(ref).toMatch(/list\.map\(List\(a\), with: fn\(a\) -> b\) -> List\(b\)/);
    expect(ref).toContain("## gleam/option");
    expect(ref).toContain("pub type Option(a) { Some(a) | None }");
    expect(ref).not.toContain("## gleam/dict");
  });

  it("ties the prompt version to the reference material", () => {
    expect(REFERENCE_HASH).toMatch(/^[0-9a-f]{8}$/);
    expect(PROMPT_VERSION).toBe(`coach-v4+ref-${REFERENCE_HASH}`);
  });
});
