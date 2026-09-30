import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import type { ExerciseView } from "@fp/api-contract";

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
export function publicTestModule(view: ExerciseView): string {
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
  const header = "// 공개 테스트만 포함되어 있습니다. 제출 시에는 숨김 테스트도 함께 채점됩니다.";
  const main = "pub fn main() {\n  gleeunit.main()\n}";
  return [header, [...imports].join("\n"), main, ...bodies].join("\n\n") + "\n";
}

function fence(code: string): string {
  return "```gleam\n" + code.replace(/\n+$/, "") + "\n```";
}

export function promptMarkdown(view: ExerciseView): string {
  const ex = view.exercise;
  const out: string[] = [`# ${ex.title}`];
  out.push(`- 문제 ID: \`${ex.id}\`\n- 기술: ${ex.primarySkill} · 난이도: ${ex.difficulty} · 예상 ${ex.estimatedMinutes}분`);
  out.push(`## 문제\n\n${ex.promptMarkdown.trim()}`);
  if (ex.predict) out.push(`## 읽을 코드\n\n${fence(ex.predict.code)}\n\n답을 \`${ANSWER_FILE}\`에 적고 \`fp submit\`으로 제출하세요.`);
  if (ex.publicTests.length > 0) {
    out.push(`## 공개 테스트\n\n` + ex.publicTests.map((t) => `### ${t.name}\n\n${fence(t.code)}`).join("\n\n"));
  }
  if (ex.rubric.length > 0) out.push(`## 코드 품질 기준\n\n` + ex.rubric.map((r) => `- ${r.id} ${r.title}: ${r.description}`).join("\n"));
  if (view.revealedHints.length > 0) {
    out.push(`## 공개된 힌트\n\n` + view.revealedHints.map((h) => `**${h.level}단계**: ${h.markdown}`).join("\n\n"));
  }
  for (const n of view.conceptNotes) out.push(`## 개념 노트: ${n.title}\n\n${n.markdown.trim()}`);
  for (const t of view.theoryTopics) out.push(`## 이론: ${t.title}\n\n${t.markdown.trim()}`);
  out.push(
    [
      "## 사용법",
      "",
      `- \`${learnerFile({ kind: ex.kind, moduleName: ex.moduleName })}\`을(를) 수정하세요.`,
      "- `gleam test`: 로컬에서 공개 테스트 실행 (Gleam 설치 필요)",
      "- `fp run`: 서버에서 공개 테스트 실행 (기록되지 않음)",
      "- `fp submit`: 제출 (숨김 테스트 포함 채점, 레이팅 반영)",
      `- \`fp hint\`: 다음 힌트 (총 ${ex.hints.length}단계, 3단계부터는 레이팅 미반영)`,
    ].join("\n"),
  );
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
  if (!target.startsWith(resolve(dir) + sep)) throw new Error(`잘못된 파일 경로입니다: ${rel}`);
  return target;
}

export interface WriteOptions {
  readonly force?: boolean;
  readonly sessionId?: string;
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
  await put("PROMPT.md", promptMarkdown(view));

  if (ex.kind === "predict") {
    await putLearner(ANSWER_FILE, "");
  } else {
    await put("gleam.toml", gleamToml(view));
    await put(".gitignore", "build/\n");
    const starters = ex.starterFiles.length > 0 ? ex.starterFiles : [{ path: learnerFile(meta), content: `// ${ex.title}\n` }];
    for (const f of starters) await putLearner(f.path, f.content);
    await put(join("test", `${packageName(ex.moduleName)}_test.gleam`), publicTestModule(view));
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
  throw new Error(`문제 메타데이터가 손상되었습니다: ${file}. \`fp next --force\`로 다시 생성하세요.`);
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
  if (text === null) throw new Error(`학습자 파일이 없습니다: ${join(dir, rel)}`);
  return meta.kind === "predict" ? text.trim() : text;
}
