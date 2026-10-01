/**
 * Localization overlays (content/README.md, "Localization (en, zh)"): parsing, validation against the Korean
 * source, and completeness (ExerciseSummary.locales). Non-text fields always come from the Korean files.
 */
import { DEFAULT_LOCALE, type Locale } from "@fp/kernel";
import type { RubricItem, Skill } from "../contract/index.ts";
import {
  isTranslatedLocale,
  TRANSLATED_LOCALES,
  type NoteText,
  type RubricText,
  type SkillText,
  type TranslatedLocale,
  type Translations,
  type VariantText,
} from "../i18n.ts";
import { splitFrontMatter } from "./frontmatter.ts";
import { codeOnly } from "./gleam.ts";
import {
  exerciseOverlaySchema,
  familyOverlaySchema,
  noteOverlayFrontMatterSchema,
  skillsOverlaySchema,
  type ExerciseYaml,
  type FamilyYaml,
} from "./schemas.ts";
import { filesUnder, type ContentTree, type TreeFile } from "./tree.ts";
import { parseYaml, validate, type AddIssue } from "./yaml.ts";

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

/** Hangul jamo, compatibility jamo and syllables: Korean text left in a translation. */
export const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힯]/;
const VARIANT_OVERLAY_FILE = /^(exercise\.[^./]+\.yaml|prompt\.[^./]+\.md|explanation\.[^./]+\.md)$/;
const STARTER_DIR = /^starter\.([^./]+)$/;

/** Locale part of "<base>.<locale><ext>", or null when `name` has no locale part. */
export function localeOf(name: string, base: string, ext: string): string | null {
  if (!name.startsWith(`${base}.`) || !name.endsWith(ext)) return null;
  const loc = name.slice(base.length + 1, name.length - ext.length);
  return loc !== "" && !/[./]/.test(loc) ? loc : null;
}

export function checkLocale(loc: string, path: string, add: AddIssue): loc is TranslatedLocale {
  if (isTranslatedLocale(loc)) return true;
  add(path, `unsupported locale "${loc}": translations must be ${TRANSLATED_LOCALES.join(" or ")}`);
  return false;
}

/** True for a top-level file or directory name of a variant that belongs to a translation. */
export function isVariantTranslationEntry(name: string, isDirectory: boolean, isPredict: boolean): boolean {
  return isDirectory ? !isPredict && STARTER_DIR.test(name) : VARIANT_OVERLAY_FILE.test(name);
}

/** True for a family-directory file name of the form family.<locale>.yaml. */
export function isFamilyTranslationFile(name: string): boolean {
  return localeOf(name, "family", ".yaml") !== null;
}

/** True for a note file name of the form <id>.<locale>.md (Korean notes are <id>.md). */
export function isNoteTranslationFile(name: string): boolean {
  return /^[^./]+\.[^./]+\.md$/.test(name);
}

function setIn<T>(map: Map<string, Mutable<Translations<T>>>, id: string, loc: TranslatedLocale, value: T): void {
  const entry = map.get(id) ?? {};
  entry[loc] = value;
  map.set(id, entry);
}

/** Own-property lookup, so ids such as "constructor" never hit Object.prototype. */
export function own<T>(record: Readonly<Record<string, T>> | undefined, key: string): T | undefined {
  return record !== undefined && Object.hasOwn(record, key) ? record[key] : undefined;
}

/** Copies only the defined fields. */
export function defined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

/** skills.<locale>.yaml: { skills: { <skill-id>: { name?, description? } } }. */
export function parseSkillTranslations(
  tree: ContentTree,
  skills: readonly Skill[] | null,
  add: AddIssue,
): Map<string, Translations<SkillText>> {
  const out = new Map<string, Mutable<Translations<SkillText>>>();
  const ids = skills ? new Set<string>(skills.map((s) => s.id)) : null;
  for (const file of tree.files.values()) {
    const loc = file.path.includes("/") ? null : localeOf(file.path, "skills", ".yaml");
    if (loc === null || !checkLocale(loc, file.path, add)) continue;
    const raw = parseYaml(file, add);
    if (raw === undefined) continue;
    const data = validate(skillsOverlaySchema, raw, file.path, add);
    if (!data) continue;
    for (const [id, t] of Object.entries(data.skills)) {
      if (ids && !ids.has(id)) add(file.path, `skills: unknown skill "${id}"`);
      else setIn(out, id, loc, defined({ name: t.name, description: t.description }));
    }
  }
  return out;
}

/** <dir><id>.<locale>.md: front matter with only id (= the Korean note's id) and title; translated body. */
export function parseNoteTranslations(
  tree: ContentTree,
  dir: string,
  noteIds: ReadonlySet<string>,
  add: AddIssue,
): Map<string, Translations<NoteText>> {
  const out = new Map<string, Mutable<Translations<NoteText>>>();
  for (const file of filesUnder(tree, dir)) {
    const name = file.path.slice(dir.length);
    if (!isNoteTranslationFile(name)) continue;
    const [id = "", loc = ""] = name.slice(0, -3).split(".");
    if (!checkLocale(loc, file.path, add)) continue;
    if (!noteIds.has(id)) add(file.path, `translation of unknown note "${id}" (missing ${dir}${id}.md)`);
    const doc = splitFrontMatter(file.text);
    if (!doc) {
      add(file.path, "missing YAML front matter (--- ... ---)");
      continue;
    }
    const fm = parseYaml({ ...file, text: doc.frontMatter }, add);
    if (fm === undefined) continue;
    const meta = validate(noteOverlayFrontMatterSchema, fm, file.path, add);
    if (!meta) continue;
    if (meta.id !== id) add(file.path, `front matter id "${meta.id}" must equal the note id "${id}"`);
    if (doc.body.trim() === "") add(file.path, "note body is empty");
    setIn(out, id, loc, defined({ title: meta.title, markdown: doc.body }));
  }
  return out;
}

export interface FamilyOverlay {
  readonly title?: string;
  readonly rubric: Readonly<Record<string, RubricText>>;
}

/** Checks overlay rubric ids against the Korean rubric; `message` needs an automatedCheck with a message. */
function checkRubricOverlay(
  overlay: Readonly<Record<string, RubricText>> | undefined,
  rubric: readonly { readonly id: string; readonly automatedCheck?: { readonly kind: string } | undefined }[],
  path: string,
  add: AddIssue,
): void {
  for (const [id, t] of Object.entries(overlay ?? {})) {
    const item = rubric.find((r) => r.id === id);
    if (!item) add(path, `rubric: unknown rubric id "${id}"`);
    else if (t.message !== undefined && (!item.automatedCheck || item.automatedCheck.kind === "max_function_lines")) {
      add(path, `rubric ${id}: message translates automatedCheck.message, but this item has none`);
    }
  }
}

/** family.<locale>.yaml files of one family directory (`dir` ends with "/"). */
export function parseFamilyTranslations(
  tree: ContentTree,
  dir: string,
  family: FamilyYaml | null,
  add: AddIssue,
): { readonly overlays: Translations<FamilyOverlay>; readonly files: readonly TreeFile[] } {
  const overlays: Mutable<Translations<FamilyOverlay>> = {};
  const files: TreeFile[] = [];
  for (const file of filesUnder(tree, dir)) {
    const name = file.path.slice(dir.length);
    const loc = name.includes("/") ? null : localeOf(name, "family", ".yaml");
    if (loc === null) continue;
    files.push(file);
    if (!checkLocale(loc, file.path, add)) continue;
    const raw = parseYaml(file, add);
    if (raw === undefined) continue;
    const data = validate(familyOverlaySchema, raw, file.path, add);
    if (!data) continue;
    if (family) checkRubricOverlay(data.rubric, family.rubric ?? [], file.path, add);
    overlays[loc] = defined({ title: data.title, rubric: data.rubric ?? {} });
  }
  return { overlays, files };
}

export interface VariantTranslationInput {
  readonly dir: string;
  readonly ex: ExerciseYaml;
  readonly variantFiles: readonly TreeFile[];
  readonly familyOverlays: Translations<FamilyOverlay>;
  /** Merged Korean rubric (variant rubric if present, else the family's). */
  readonly rubric: readonly RubricItem[];
  /** Korean learner module source (starter/<module>.gleam), null for predict or when missing. */
  readonly starter: string | null;
}

export interface VariantTranslations {
  readonly translations: Translations<VariantText>;
  /** "ko" plus every locale whose translation is complete (rule 4), in SUPPORTED_LOCALES order. */
  readonly locales: readonly Locale[];
}

interface LocaleFiles {
  exercise?: TreeFile;
  prompt?: TreeFile;
  explanation?: TreeFile;
  starter: TreeFile[];
}

/** Translation files of one variant: overlay, prompt, explanation and localized starter per locale. */
export function parseVariantTranslations(input: VariantTranslationInput, add: AddIssue): VariantTranslations {
  const { dir, ex } = input;
  const byLocale = new Map<TranslatedLocale, LocaleFiles>();
  const bucket = (loc: TranslatedLocale): LocaleFiles => {
    const b = byLocale.get(loc) ?? { starter: [] };
    byLocale.set(loc, b);
    return b;
  };
  for (const f of input.variantFiles) {
    const rest = f.path.slice(dir.length);
    const slash = rest.indexOf("/");
    if (slash >= 0) {
      const m = STARTER_DIR.exec(rest.slice(0, slash));
      if (!m || ex.kind === "predict") continue;
      const loc = m[1] ?? "";
      if (checkLocale(loc, f.path, add)) bucket(loc).starter.push(f);
      continue;
    }
    for (const [key, base, ext] of [
      ["exercise", "exercise", ".yaml"],
      ["prompt", "prompt", ".md"],
      ["explanation", "explanation", ".md"],
    ] as const) {
      const loc = localeOf(rest, base, ext);
      if (loc !== null && checkLocale(loc, f.path, add)) bucket(loc)[key] = f;
    }
  }

  const translations: Mutable<Translations<VariantText>> = {};
  const locales: Locale[] = [DEFAULT_LOCALE];
  for (const loc of TRANSLATED_LOCALES) {
    const files = byLocale.get(loc);
    const famOv = input.familyOverlays[loc];
    if (!files && !famOv) continue;
    const r = buildVariantText(input, loc, files ?? { starter: [] }, famOv, add);
    if (Object.keys(r.text).length > 0) translations[loc] = r.text;
    if (r.complete) locales.push(loc);
  }
  return { translations, locales };
}

function buildVariantText(
  input: VariantTranslationInput,
  loc: TranslatedLocale,
  files: LocaleFiles,
  famOv: FamilyOverlay | undefined,
  add: AddIssue,
): { text: VariantText; complete: boolean } {
  const { dir, ex } = input;
  const text: Mutable<VariantText> = {};
  const missing: string[] = [];

  // exercise.<loc>.yaml
  let overlay = null;
  if (files.exercise) {
    const raw = parseYaml(files.exercise, add);
    if (raw !== undefined) overlay = validate(exerciseOverlaySchema, raw, files.exercise.path, add);
  }
  const ovPath = files.exercise?.path ?? `${dir}exercise.${loc}.yaml`;
  const testFns = (ex.tests ?? []).map((t) => t.fn);
  if (overlay) {
    const reqIds = new Set((ex.requirements ?? []).map((r) => r.id));
    for (const fn of Object.keys(overlay.tests ?? {})) if (!testFns.includes(fn)) add(ovPath, `tests: unknown test fn "${fn}"`);
    for (const id of Object.keys(overlay.requirements ?? {})) if (!reqIds.has(id)) add(ovPath, `requirements: unknown requirement "${id}"`);
    for (const level of Object.keys(overlay.hints ?? {})) {
      if (!["1", "2", "3", "4", "5"].includes(level)) add(ovPath, `hints: unknown hint level "${level}" (levels are 1..5)`);
    }
    checkRubricOverlay(overlay.rubric, input.rubric, ovPath, add);
    if (overlay.tests) text.testNames = overlay.tests;
    if (overlay.requirements) text.requirements = overlay.requirements;
    if (overlay.hints) text.hints = overlay.hints;
  } else missing.push(`exercise.${loc}.yaml`);

  // Title: a variant that overrides the Korean title needs its own translation.
  const title = overlay?.title ?? (ex.title === undefined ? famOv?.title : undefined);
  if (title !== undefined) text.title = title;
  if (!famOv?.title) missing.push(`title in family.${loc}.yaml`);
  if (ex.title !== undefined && overlay?.title === undefined) missing.push(`title in exercise.${loc}.yaml`);

  // Rubric texts: the variant overlay wins; family overlay texts apply only to the family's rubric.
  const fromFamily = ex.rubric === undefined;
  const rubric: Record<string, RubricText> = {};
  for (const item of input.rubric) {
    const v = own(overlay?.rubric, item.id);
    const f = fromFamily ? own(famOv?.rubric, item.id) : undefined;
    const merged = defined({
      title: v?.title ?? f?.title,
      description: v?.description ?? f?.description,
      message: v?.message ?? f?.message,
    });
    if (Object.keys(merged).length > 0) rubric[item.id] = merged;
  }
  if (Object.keys(rubric).length > 0) text.rubric = rubric;

  // prompt / explanation
  for (const [key, field] of [
    ["prompt", "promptMarkdown"],
    ["explanation", "explanationMarkdown"],
  ] as const) {
    const f = files[key];
    if (!f) missing.push(`${key}.${loc}.md`);
    else if (f.text.trim() === "") add(f.path, "translation is empty");
    else text[field] = f.text;
  }

  // Completeness of test names and hints.
  for (const fn of testFns) if (overlay && !own(overlay.tests, fn)) missing.push(`test name ${fn}`);
  for (const level of ["1", "2", "3", "4", "5"]) if (overlay && !own(overlay.hints, level)) missing.push(`hint ${level}`);

  // starter.<loc>/<module>.gleam
  const mod = ex.module;
  const moduleFile = `${mod}.gleam`;
  const starterDir = `${dir}starter.${loc}/`;
  for (const f of files.starter) {
    if (!mod || input.starter === null) continue; // module/starter problems are reported by the Korean checks
    if (f.path !== `${starterDir}${moduleFile}`) {
      add(f.path, `unexpected file; starter.${loc}/ must contain only ${moduleFile}`);
      continue;
    }
    if (codeOnly(f.text) !== codeOnly(input.starter)) {
      add(f.path, `code differs from starter/${moduleFile}; a localized starter may change only comments`);
      continue;
    }
    text.starter = f.text;
  }
  if (input.starter !== null && HANGUL.test(input.starter) && text.starter === undefined) {
    missing.push(`starter.${loc}/${moduleFile}`);
  }

  return { text, complete: missing.length === 0 };
}
