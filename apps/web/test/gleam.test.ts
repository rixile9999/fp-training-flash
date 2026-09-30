import { describe, expect, it } from "vitest";
import { highlightGleam } from "../src/editor/gleam.ts";

describe("highlightGleam", () => {
  it("classifies keywords, types, strings and comments and keeps the text intact", () => {
    const code = 'pub fn go(x: Int) -> String {\n  // note\n  case x { _ -> "a" }\n}';
    const spans = highlightGleam(code);
    expect(spans.map((s) => s.text).join("")).toBe(code);
    const cls = (text: string) => spans.find((s) => s.text === text)?.cls;
    expect(cls("pub")).toBe("tok-kw");
    expect(cls("case")).toBe("tok-kw");
    expect(cls("Int")).toBe("tok-type");
    expect(cls('"a"')).toBe("tok-str");
    expect(cls("// note")).toBe("tok-com");
    expect(cls("go")).toBe("tok-fn");
  });
});
