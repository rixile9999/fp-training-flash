import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import type { ExerciseView } from "@fp/api-contract";
import { DEFAULT_LOCALE, LocalizedError, translator } from "./messages.ts";
import type { Locale } from "./messages.ts";

/** Metadata file linking a local project dir to its exercise. */
export const META_FILE = ".fp.json";
export const WORK_ROOT = "fp-work";
/** Answer file for predict exercises (no Gleam code to write). */
export const ANSWER_FILE = "answer.txt";

export interface ProjectMeta {
  readonly exerciseId: string;
  readonly moduleName: string;
  readonly kind: ExerciseView["exercise"]["kind"];
  readonly sessionId?: string;
}

export interface WriteReport {
  readonly dir: string;
  /** Paths (relative to dir) written or rewritten. */
  readonly written: readonly string[];
  /** Learner files that already existed with different content and were kept (no --force). */
  readonly kept: readonly string[];
}

/** Lowercase snake_case identifier valid as a Gleam name. */
export function snake(s: string): string {
  const out = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (out === "") return "x";
  return /^[0-9]/.test(out) ? `t_${out}` : out;
}

/** fp-work/<family>-<variant>, filesystem-safe. */
export function projectDirFor(baseDir: string, view: ExerciseView): string {
  const safe = (s: string) => s.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^\.+/, "_");
  return join(baseDir, WORK_ROOT, `${safe(view.exercise.familyId)}-${safe(view.exercise.variantKey)}`);
}

/**
 * Gleam package name. `gleam test` runs the module `<package>_test`, so the package is named after the
 * exercise module and the test file is test/<package>_test.gleam.
 */
export function packageName(moduleName: string): string {
  return snake(moduleName.replaceAll("/", "_"));
}

export function learnerFile(meta: Pick<ProjectMeta, "kind" | "moduleName">): string {
  return meta.kind === "predict" ? ANSWER_FILE : join("src", `${meta.moduleName}.gleam`);
}

export function gleamToml(view: ExerciseView): string {
  const ex = view.exercise;
  return [
    `name = "${packageName(ex.moduleName)}"`,
    `version = "0.1.0"`,
    `description = ${JSON.stringify(`fp exercise ${ex.id}`)}`,
    `target = "erlang"`,
    "",
    "[dependencies]",
    `gleam_stdlib = ">= 0.44.0 and < 2.0.0"`,
    "",
    "[dev-dependencies]",
    `gleeunit = ">= 1.0.0 and < 2.0.0"`,
    "",
  ].join("\n");
}

/**
 * test/<package>_test.gleam built from the PUBLIC tests only. A public test's code is usually a test body;
 * if it already defines functions it is kept verbatim. Import lines are hoisted and de-duplicated.
 */
export function publicTestModule(view: ExerciseView, locale: Locale = DEFAULT_LOCALE): string {
  const ex = view.exercise;
  const imports = new Set<string>(["import gleeunit", "import gleeunit/should", `import ${ex.moduleName}`]);
  const bodies: string[] = [];
  const usedNames = new Set<string>();
  for (const t of ex.publicTests) {
    const lines = t.code.replace(/\r\n/g, "\n").split("\n");
    const rest: string[] = [];
    for (const line of lines) {
      if (/^import\s/.test(line.trim()) && !line.startsWith(" ") && !line.startsWith("\t")) imports.add(line.trim());
      else rest.push(line);
    }
    const code = rest.join("\n").trim();
    if (/^(pub\s+)?fn\s/m.test(code)) {
      bodies.push(`// ${t.name}\n${code}`);
      continue;
    }
    let name = `${snake(t.id)}_test`;
    for (let i = 2; usedNames.has(name); i++) name = `${snake(t.id)}_${i}_test`;
    usedNames.add(name);
    const indented = code
      .split("\n")
      .map((l) => (l.trim() === "" ? "" : `  ${l}`))
      .join("\n");
    bodies.push(`// ${t.name}\npub fn ${name}() {\n${indented}\n}`);
  }
  const header = translator(locale)("testFileHeader");
  const main = "pub fn main() {\n  gleeunit.main()\n}";
  return [header, [...imports].join("\n"), main, ...bodies].join("\n\n") + "\n";
}

function fence(code: string): string {
  return "```gleam\n" + code.replace(/\n+$/, "") + "\n```";
}

/**
 * PROMPT.md. Headings and instructions are in the display locale; the problem text, tests, hints and notes
 * come from the server, which already renders them in the account's locale (Korean when untranslated).
 */
export function promptMarkdown(view: ExerciseView, locale: Locale = DEFAULT_LOCALE): string {
  const t = translator(locale);
  const ex = view.exercise;
  const out: string[] = [`# ${ex.title}`];
  out.push(t("promptMeta", { id: ex.id, skill: ex.primarySkill, difficulty: ex.difficulty, minutes: ex.estimatedMinutes }));
  out.push(`${t("promptProblem")}\n\n${ex.promptMarkdown.trim()}`);
  if (ex.predict) out.push(`${t("promptReadCode")}\n\n${fence(ex.predict.code)}\n\n${t("promptAnswerHow", { file: ANSWER_FILE })}`);
  if (ex.publicTests.length > 0) {
    out.push(`${t("promptPublicTests")}\n\n` + ex.publicTests.map((x) => `### ${x.name}\n\n${fence(x.code)}`).join("\n\n"));
  }
  if (ex.rubric.length > 0) out.push(`${t("promptRubric")}\n\n` + ex.rubric.map((r) => `- ${r.id} ${r.title}: ${r.description}`).join("\n"));
  if (view.revealedHints.length > 0) {
    out.push(`${t("promptRevealedHints")}\n\n` + view.revealedHints.map((h) => `${t("promptHintLevel", { level: h.level })}: ${h.markdown}`).join("\n\n"));
  }
  for (const n of view.conceptNotes) out.push(`${t("promptConceptNote", { title: n.title })}\n\n${n.markdown.trim()}`);
  for (const x of view.theoryTopics) out.push(`${t("promptTheory", { title: x.title })}\n\n${x.markdown.trim()}`);
  out.push(t("promptUsage", { file: learnerFile({ kind: ex.kind, moduleName: ex.moduleName }), hints: ex.hints.length }));
  return out.join("\n\n") + "\n";
}

async function readIfExists(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

/** Resolves a server-provided relative path, refusing anything that escapes the project dir. */
function inside(dir: string, rel: string): string {
  const target = resolve(dir, rel);
  if (!target.startsWith(resolve(dir) + sep)) throw new LocalizedError("errInvalidPath", { path: rel });
  return target;
}

export interface WriteOptions {
  readonly force?: boolean;
  readonly sessionId?: string;
  /** Display locale for generated headings (PROMPT.md, test file comment). Default "ko". */
  readonly locale?: Locale;
}

/**
 * Writes the exercise as a local Gleam project. Generated files (gleam.toml, tests, PROMPT.md, metadata)
 * are always refreshed; learner files are never overwritten when they differ, unless `force`.
 */
export async function writeProject(baseDir: string, view: ExerciseView, opts: WriteOptions = {}): Promise<WriteReport> {
  const ex = view.exercise;
  const dir = projectDirFor(baseDir, view);
  const written: string[] = [];
  const kept: string[] = [];

  const put = async (rel: string, content: string) => {
    const file = inside(dir, rel);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, content);
    written.push(rel);
  };
  const putLearner = async (rel: string, content: string) => {
    const existing = await readIfExists(inside(dir, rel));
    if (existing === content) return;
    if (existing !== null && !opts.force) {
      kept.push(rel);
      return;
    }
    await put(rel, content);
  };

  const meta: ProjectMeta = {
    exerciseId: ex.id,
    moduleName: ex.moduleName,
    kind: ex.kind,
    ...(opts.sessionId ? { sessionId: opts.sessionId } : {}),
  };
  await put(META_FILE, JSON.stringify(meta, null, 2) + "\n");
  const locale = opts.locale ?? DEFAULT_LOCALE;
  await put("PROMPT.md", promptMarkdown(view, locale));

  if (ex.kind === "predict") {
    await putLearner(ANSWER_FILE, "");
  } else {
    await put("gleam.toml", gleamToml(view));
    await put(".gitignore", "build/\n");
    const starters = ex.starterFiles.length > 0 ? ex.starterFiles : [{ path: learnerFile(meta), content: `// ${ex.title}\n` }];
    for (const f of starters) await putLearner(f.path, f.content);
    await put(join("test", `${packageName(ex.moduleName)}_test.gleam`), publicTestModule(view, locale));
  }
  return { dir, written, kept };
}

export async function readMeta(dir: string): Promise<ProjectMeta | null> {
  const file = join(dir, META_FILE);
  let text: string | null;
  try {
    text = await readIfExists(file);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOTDIR") return null;
    throw e;
  }
  if (text === null) return null;
  try {
    const meta = JSON.parse(text) as Partial<ProjectMeta>;
    if (typeof meta.exerciseId === "string" && typeof meta.moduleName === "string" && typeof meta.kind === "string") {
      return meta as ProjectMeta;
    }
  } catch {
    // fall through
  }
  throw new LocalizedError("errCorruptMeta", { path: file });
}

/** Finds the nearest project dir at or above `start` (so commands work from src/ or test/). */
export async function findProjectDir(start: string): Promise<{ dir: string; meta: ProjectMeta } | null> {
  let dir = resolve(start);
  for (;;) {
    const meta = await readMeta(dir);
    if (meta) return { dir, meta };
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export async function readLearnerCode(dir: string, meta: ProjectMeta): Promise<string> {
  const rel = learnerFile(meta);
  const text = await readIfExists(join(dir, rel));
  if (text === null) throw new LocalizedError("errLearnerFileMissing", { path: join(dir, rel) });
  return meta.kind === "predict" ? text.trim() : text;
}
