/** Shared helpers for reading authored YAML: every problem becomes an issue instead of an exception. */
import { parse as parseYamlText } from "yaml";
import type { z } from "zod";
import { formatZodIssues } from "./schemas.ts";
import type { TreeFile } from "./tree.ts";

export type AddIssue = (path: string, message: string) => void;

/**
 * Validates `raw` and reports every schema issue. When the only problems are unknown keys, they are
 * reported and validation continues without them, so the remaining checks of the file still run.
 */
export function validate<S extends z.ZodType>(schema: S, raw: unknown, path: string, add: AddIssue): z.output<S> | null {
  const r = schema.safeParse(raw);
  if (r.success) return r.data;
  for (const m of formatZodIssues(r.error)) add(path, m);
  const unknownKeysOnly = r.error.issues.every((i) => i.code === "unrecognized_keys");
  if (!unknownKeysOnly) return null;
  const cleaned = structuredClone(raw);
  for (const i of r.error.issues) {
    if (i.code !== "unrecognized_keys") continue;
    let target: unknown = cleaned;
    for (const k of i.path) target = (target as Record<PropertyKey, unknown> | undefined)?.[k];
    if (typeof target === "object" && target !== null) for (const k of i.keys) delete (target as Record<string, unknown>)[k];
  }
  const retry = schema.safeParse(cleaned);
  return retry.success ? retry.data : null;
}

/** Parses a YAML file; an empty file is `{}`. Returns undefined (and reports) on a syntax error. */
export function parseYaml(file: TreeFile, add: AddIssue): unknown {
  try {
    const value: unknown = parseYamlText(file.text);
    return value ?? {};
  } catch (e) {
    add(file.path, `invalid YAML: ${e instanceof Error ? e.message.split("\n")[0] : String(e)}`);
    return undefined;
  }
}
