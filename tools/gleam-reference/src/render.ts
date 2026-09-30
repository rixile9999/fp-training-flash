/** Renders `gleam export package-interface` JSON into compact, model-readable signature lines. */

export type IfaceType =
  | { kind: "named"; name: string; module: string; package: string; parameters: IfaceType[] }
  | { kind: "variable"; id: number }
  | { kind: "fn"; parameters: IfaceType[]; return: IfaceType }
  | { kind: "tuple"; elements: IfaceType[] };

export interface IfaceFunction {
  documentation: string | null;
  deprecation: { message: string } | null;
  parameters: { label: string | null; type: IfaceType }[];
  return: IfaceType;
}

export interface IfaceTypeDef {
  documentation: string | null;
  deprecation: { message: string } | null;
  parameters: number;
  constructors: { name: string; documentation: string | null; parameters: { label: string | null; type: IfaceType }[] }[];
  opaque?: boolean;
}

export interface IfaceModule {
  documentation: string[];
  types: Record<string, IfaceTypeDef>;
  "type-aliases": Record<string, { parameters: number; alias: IfaceType; deprecation: { message: string } | null }>;
  constants: Record<string, { type: IfaceType; deprecation: { message: string } | null }>;
  functions: Record<string, IfaceFunction>;
}

export interface PackageInterface {
  name: string;
  version: string;
  modules: Record<string, IfaceModule>;
}

/** Assigns a, b, c... to type variables in order of first appearance within one signature. */
function varNamer(): (id: number) => string {
  const names = new Map<number, string>();
  return (id) => {
    let n = names.get(id);
    if (!n) {
      const i = names.size;
      n = i < 26 ? String.fromCharCode(97 + i) : `t${i}`;
      names.set(id, n);
    }
    return n;
  };
}

export function renderType(t: IfaceType, currentModule: string, name: (id: number) => string): string {
  switch (t.kind) {
    case "variable":
      return name(t.id);
    case "tuple":
      return `#(${t.elements.map((e) => renderType(e, currentModule, name)).join(", ")})`;
    case "fn":
      return `fn(${t.parameters.map((p) => renderType(p, currentModule, name)).join(", ")}) -> ${renderType(t.return, currentModule, name)}`;
    case "named": {
      const qualifier = t.module === "gleam" || t.module === currentModule ? "" : `${t.module.split("/").pop()}.`;
      const args = t.parameters.length ? `(${t.parameters.map((p) => renderType(p, currentModule, name)).join(", ")})` : "";
      return `${qualifier}${t.name}${args}`;
    }
  }
}

/** First sentence of a doc comment, single line, at most `max` characters. */
export function summary(doc: string | null, max = 140): string {
  if (!doc) return "";
  const text = doc.split(/\n\s*\n/)[0]?.replace(/\s+/g, " ").trim() ?? "";
  const sentence = text.match(/^.*?[.!?](\s|$)/)?.[0]?.trim() ?? text;
  return sentence.length > max ? `${sentence.slice(0, max - 1)}…` : sentence;
}

export function renderFunction(moduleName: string, fnName: string, f: IfaceFunction): string {
  const name = varNamer();
  const params = f.parameters.map((p) => `${p.label ? `${p.label}: ` : ""}${renderType(p.type, moduleName, name)}`).join(", ");
  const short = moduleName.split("/").pop();
  const doc = summary(f.documentation);
  return `${short}.${fnName}(${params}) -> ${renderType(f.return, moduleName, name)}${doc ? `  // ${doc}` : ""}`;
}

export function renderTypeDef(moduleName: string, typeName: string, t: IfaceTypeDef): string {
  const name = varNamer();
  const params = t.parameters > 0 ? `(${Array.from({ length: t.parameters }, (_, i) => name(-1 - i)).join(", ")})` : "";
  if (t.opaque || t.constructors.length === 0) return `pub opaque type ${typeName}${params}`;
  const ctors = t.constructors
    .map((c) => {
      const cname = varNamer();
      const ps = c.parameters.map((p) => `${p.label ? `${p.label}: ` : ""}${renderType(p.type, moduleName, cname)}`).join(", ");
      return ps ? `${c.name}(${ps})` : c.name;
    })
    .join(" | ");
  return `pub type ${typeName}${params} { ${ctors} }`;
}

export interface ModuleReference {
  readonly module: string;
  readonly summary: string;
  readonly lines: readonly string[];
}

export function renderPackage(iface: PackageInterface): ModuleReference[] {
  return Object.keys(iface.modules)
    .sort()
    .map((m) => {
      const mod = iface.modules[m]!;
      const lines: string[] = [];
      for (const [tn, t] of Object.entries(mod.types).sort(([a], [b]) => a.localeCompare(b))) {
        if (!t.deprecation) lines.push(renderTypeDef(m, tn, t));
      }
      for (const [fn, f] of Object.entries(mod.functions).sort(([a], [b]) => a.localeCompare(b))) {
        if (!f.deprecation) lines.push(renderFunction(m, fn, f));
      }
      return { module: m, summary: summary(mod.documentation.join("\n"), 200), lines };
    });
}
