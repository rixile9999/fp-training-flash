import { describe, expect, it } from "vitest";
import { renderFunction, renderTypeDef, summary, type IfaceFunction, type IfaceType } from "../src/render.ts";

const list = (t: IfaceType): IfaceType => ({ kind: "named", name: "List", module: "gleam", package: "", parameters: [t] });
const v = (id: number): IfaceType => ({ kind: "variable", id });

describe("render", () => {
  it("renders labelled parameters, type variables in order and function types", () => {
    const f: IfaceFunction = {
      documentation: " Returns a new list containing the results. More text.\n\n ## Examples",
      deprecation: null,
      parameters: [
        { label: null, type: list(v(7)) },
        { label: "with", type: { kind: "fn", parameters: [v(7)], return: v(3) } },
      ],
      return: list(v(3)),
    };
    expect(renderFunction("gleam/list", "map", f)).toBe(
      "list.map(List(a), with: fn(a) -> b) -> List(b)  // Returns a new list containing the results.",
    );
  });

  it("qualifies types from other modules and renders tuples", () => {
    const dict: IfaceType = { kind: "named", name: "Dict", module: "gleam/dict", package: "gleam_stdlib", parameters: [v(1), v(2)] };
    const f: IfaceFunction = {
      documentation: null,
      deprecation: null,
      parameters: [{ label: null, type: dict }],
      return: list({ kind: "tuple", elements: [v(1), v(2)] }),
    };
    expect(renderFunction("gleam/list", "from_dict", f)).toBe("list.from_dict(dict.Dict(a, b)) -> List(#(a, b))");
  });

  it("renders custom types with constructors, and opaque types without them", () => {
    expect(
      renderTypeDef("gleam/option", "Option", {
        documentation: null,
        deprecation: null,
        parameters: 1,
        constructors: [
          { name: "Some", documentation: null, parameters: [{ label: null, type: v(0) }] },
          { name: "None", documentation: null, parameters: [] },
        ],
      }),
    ).toBe("pub type Option(a) { Some(a) | None }");
    expect(renderTypeDef("gleam/dict", "Dict", { documentation: null, deprecation: null, parameters: 2, constructors: [] })).toBe(
      "pub opaque type Dict(a, b)",
    );
  });

  it("truncates long summaries", () => {
    expect(summary("x".repeat(300), 10)).toBe(`${"x".repeat(9)}…`);
    expect(summary(null)).toBe("");
  });
});
