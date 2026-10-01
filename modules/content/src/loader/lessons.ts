/**
 * Gleam basics lessons (content/lessons, docs/design/lessons.md): unit.yaml, <lesson>.yaml and their en/zh overlays
 * (unit.<l>.yaml, <lesson>.<l>.yaml). Pure; every problem becomes an issue. Lessons are not versioned.
 */
import { asId, DEFAULT_LOCALE, type Locale } from "@fp/kernel";
import type { ContentSource, Lesson, LessonBlock, Skill } from "../contract/index.ts";
import {
  TRANSLATED_LOCALES,
  type LessonBlockText,
  type LessonText,
  type StoredLessonAnswer,
  type StoredLessonUnit,
  type TranslatedLocale,
  type Translations,
  type UnitText,
} from "../i18n.ts";
import { findCycle } from "./graph.ts";
import {
  KEBAB_ID,
  lessonOverlaySchema,
  lessonSchema,
  unitOverlaySchema,
  unitSchema,
  type ExerciseBlockYaml,
  type LessonOverlayYaml,
  type UnitYaml,
} from "./schemas.ts";
import { checkLocale, defined, HANGUL, own } from "./translations.ts";
import { compareStrings, filesUnder, subdirs, type ContentTree, type TreeFile } from "./tree.ts";
import { parseYaml, validate, type AddIssue } from "./yaml.ts";

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

export const LESSONS_DIR = "lessons/";
/** A unit teaches a skill of track "basics", or one of these core skills it introduces (docs/design/lessons.md). */
const INTRO_SKILLS: ReadonlySet<string> = new Set(["explicit-failure"]);
const FILE_NAME = /^([^./]+)(?:\.([^./]+))?\.yaml$/;
const UNIT_FILES = "a unit directory holds only unit.yaml, <lesson>.yaml and their .<locale>.yaml translations";

/** Per translated locale, what a complete translation still lacks (empty = complete). */
export type TranslationGaps = Readonly<Record<TranslatedLocale, readonly string[]>>;

export interface ParsedLesson {
  /** Korean learner view (no answers, no feedback). */
  readonly lesson: Lesson;
  /** Exercise block id -> answer and Korean feedback. */
  readonly answers: Readonly<Record<string, StoredLessonAnswer>>;
  readonly translations: Translations<LessonText>;
  readonly gaps: TranslationGaps;
}

export interface ParsedLessonUnit {
  /** `locales`: "ko" + every locale with a unit title and every lesson complete. */
  readonly unit: StoredLessonUnit;
  readonly translations: Translations<UnitText>;
  readonly lessons: readonly ParsedLesson[];
  /** Gaps of the unit file itself (title); lesson gaps are on each lesson. */
  readonly gaps: TranslationGaps;
}

export interface LessonTranslationGap {
  /** Overlay path relative to the content root, e.g. lessons/u01-values/l01-values-let.en.yaml. */
  readonly path: string;
  readonly locale: TranslatedLocale;
  readonly missing: readonly string[];
}

/** Flat list of incomplete lesson translations (content CI report). */
export function lessonTranslationGaps(units: readonly ParsedLessonUnit[]): LessonTranslationGap[] {
  const out: LessonTranslationGap[] = [];
  for (const u of units) {
    const dir = `${LESSONS_DIR}${u.unit.id}/`;
    for (const locale of TRANSLATED_LOCALES) {
      if (u.gaps[locale].length > 0) out.push({ path: `${dir}unit.${locale}.yaml`, locale, missing: u.gaps[locale] });
      for (const l of u.lessons) {
        if (l.gaps[locale].length > 0) out.push({ path: `${dir}${l.lesson.id}.${locale}.yaml`, locale, missing: l.gaps[locale] });
      }
    }
  }
  return out;
}

interface UnitFiles {
  readonly unitFile: TreeFile | undefined;
  readonly unitOverlays: ReadonlyMap<TranslatedLocale, TreeFile>;
  /** Lesson id -> Korean file. */
  readonly lessons: ReadonlyMap<string, TreeFile>;
  /** Lesson id -> locale -> overlay file. */
  readonly overlays: ReadonlyMap<string, ReadonlyMap<TranslatedLocale, TreeFile>>;
}

export function parseLessons(tree: ContentTree, skills: readonly Skill[] | null, add: AddIssue): ParsedLessonUnit[] {
  for (const f of filesUnder(tree, LESSONS_DIR)) {
    if (!f.path.slice(LESSONS_DIR.length).includes("/")) add(f.path, "unexpected file; content/lessons holds only unit directories");
  }
  const skillById = skills ? new Map<string, Skill>(skills.map((s) => [s.id, s])) : null;
  const unitIds = subdirs(tree, LESSONS_DIR);
  const yamls = new Map<string, UnitYaml>();
  const units: ParsedLessonUnit[] = [];
  for (const unitId of unitIds) {
    const r = parseUnit(tree, unitId, skillById, add);
    if (r.yaml) yamls.set(unitId, r.yaml);
    if (r.unit) units.push(r.unit);
  }

  // Cross-unit checks: prerequisites and order.
  const known = new Set(unitIds);
  const byOrder = new Map<number, string>();
  for (const [id, y] of yamls) {
    const path = `${LESSONS_DIR}${id}/unit.yaml`;
    for (const p of y.prerequisites) {
      if (p === id) add(path, `prerequisites: unit "${id}" lists itself`);
      else if (!known.has(p)) add(path, `prerequisites: unknown unit "${p}"`);
    }
    const other = byOrder.get(y.order);
    if (other !== undefined) add(path, `order ${y.order} is also used by unit "${other}"`);
    else byOrder.set(y.order, id);
  }
  const cycle = findCycle(new Map([...yamls].map(([id, y]) => [id, y.prerequisites])));
  if (cycle) add(LESSONS_DIR.slice(0, -1), `unit prerequisite cycle: ${cycle.join(" -> ")}`);

  return units.sort((a, b) => a.unit.order - b.unit.order || compareStrings(a.unit.id, b.unit.id));
}

function classifyUnitFiles(tree: ContentTree, dir: string, add: AddIssue): UnitFiles {
  let unitFile: TreeFile | undefined;
  const unitOverlays = new Map<TranslatedLocale, TreeFile>();
  const lessons = new Map<string, TreeFile>();
  const overlays = new Map<string, Map<TranslatedLocale, TreeFile>>();
  for (const f of filesUnder(tree, dir)) {
    const m = FILE_NAME.exec(f.path.slice(dir.length));
    if (!m) {
      add(f.path, `unexpected file; ${UNIT_FILES}`);
      continue;
    }
    const base = m[1] ?? "";
    const loc = m[2];
    if (loc === undefined) {
      if (base === "unit") unitFile = f;
      else lessons.set(base, f);
      continue;
    }
    if (!checkLocale(loc, f.path, add)) continue;
    if (base === "unit") unitOverlays.set(loc, f);
    else {
      const byLoc = overlays.get(base) ?? new Map<TranslatedLocale, TreeFile>();
      byLoc.set(loc, f);
      overlays.set(base, byLoc);
    }
  }
  return { unitFile, unitOverlays, lessons, overlays };
}

function checkSkill(y: UnitYaml, skillById: ReadonlyMap<string, Skill> | null, path: string, add: AddIssue): void {
  if (!skillById) return; // skills.yaml itself is invalid (reported there)
  const skill = skillById.get(y.skill);
  if (!skill) add(path, `skill: unknown skill "${y.skill}"`);
  else if (skill.track !== "basics" && !INTRO_SKILLS.has(skill.id)) {
    add(path, `skill: "${y.skill}" has track "${skill.track}"; a unit teaches a basics skill or ${[...INTRO_SKILLS].join(", ")}`);
  }
}

function parseUnit(
  tree: ContentTree,
  unitId: string,
  skillById: ReadonlyMap<string, Skill> | null,
  addOuter: AddIssue,
): { yaml: UnitYaml | null; unit: ParsedLessonUnit | null } {
  let issueCount = 0;
  const add: AddIssue = (path, message) => {
    issueCount++;
    addOuter(path, message);
  };
  const dir = `${LESSONS_DIR}${unitId}/`;
  const path = `${dir}unit.yaml`;
  if (!KEBAB_ID.test(unitId)) add(dir.slice(0, -1), `unit id "${unitId}" is not kebab-case`);
  const files = classifyUnitFiles(tree, dir, add);
  if (!files.unitFile) {
    add(path, "missing unit.yaml");
    return { yaml: null, unit: null };
  }
  const raw = parseYaml(files.unitFile, add);
  const y = raw === undefined ? null : validate(unitSchema, raw, path, add);
  if (!y) return { yaml: null, unit: null };
  checkSkill(y, skillById, path, add);

  const listed: string[] = [];
  for (const id of y.lessons) {
    if (listed.includes(id)) add(path, `lessons: duplicate lesson "${id}"`);
    else listed.push(id);
    if (!files.lessons.has(id)) add(`${dir}${id}.yaml`, `missing lesson file for "${id}" (listed in unit.yaml)`);
  }
  for (const id of files.lessons.keys()) if (!listed.includes(id)) add(`${dir}${id}.yaml`, `lesson "${id}" is not listed in unit.yaml "lessons"`);
  for (const [id, byLoc] of files.overlays) {
    if (files.lessons.has(id)) continue;
    for (const f of byLoc.values()) add(f.path, `translation of unknown lesson "${id}" (missing ${dir}${id}.yaml)`);
  }

  const lessons: ParsedLesson[] = [];
  for (const id of listed) {
    const file = files.lessons.get(id);
    if (!file) continue;
    const l = parseLesson(file, unitId, id, files.overlays.get(id) ?? new Map(), add);
    if (l) lessons.push(l);
  }

  // unit.<l>.yaml: { title }
  const translations: Mutable<Translations<UnitText>> = {};
  const gaps = {} as Record<TranslatedLocale, string[]>;
  for (const loc of TRANSLATED_LOCALES) {
    gaps[loc] = [];
    const f = files.unitOverlays.get(loc);
    const ovRaw = f ? parseYaml(f, add) : undefined;
    const ov = f && ovRaw !== undefined ? validate(unitOverlaySchema, ovRaw, f.path, add) : null;
    if (ov?.title !== undefined) translations[loc] = { title: ov.title };
    if (ov?.title === undefined) gaps[loc].push(f ? "title" : `unit.${loc}.yaml`);
    else if (HANGUL.test(ov.title)) gaps[loc].push("title still contains Korean");
  }

  if (issueCount > 0) return { yaml: y, unit: null };
  const locales: Locale[] = [DEFAULT_LOCALE];
  for (const loc of TRANSLATED_LOCALES) {
    if (gaps[loc].length === 0 && lessons.every((l) => l.gaps[loc].length === 0)) locales.push(loc);
  }
  const unit: StoredLessonUnit = {
    id: unitId,
    title: y.title,
    order: y.order,
    level: y.level,
    skill: asId(y.skill),
    prerequisites: y.prerequisites,
    lessonIds: listed,
    locales,
    source: defined(y.source) as ContentSource,
  };
  return { yaml: y, unit: { unit, translations, lessons, gaps } };
}

function parseLesson(
  file: TreeFile,
  unitId: string,
  lessonId: string,
  overlayFiles: ReadonlyMap<TranslatedLocale, TreeFile>,
  addOuter: AddIssue,
): ParsedLesson | null {
  let issueCount = 0;
  const add: AddIssue = (path, message) => {
    issueCount++;
    addOuter(path, message);
  };
  const path = file.path;
  const raw = parseYaml(file, add);
  const y = raw === undefined ? null : validate(lessonSchema, raw, path, add);
  if (!y) return null;

  const blocks: LessonBlock[] = [];
  const answers: Record<string, StoredLessonAnswer> = {};
  const ids = new Set<string>();
  y.blocks.forEach((b, i) => {
    const id = "prose" in b ? b.prose : b.exercise;
    if (ids.has(id)) add(path, `blocks.${i}: duplicate block id "${id}"`);
    ids.add(id);
    if ("prose" in b) {
      blocks.push({ kind: "prose", id, markdown: b.markdown });
      return;
    }
    checkExercise(b, `blocks.${i} (${id})`, path, add);
    blocks.push({ kind: "exercise", id, type: b.type, prompt: b.prompt, ...(b.code === undefined ? {} : { code: b.code }), choices: b.choices });
    answers[id] = { answer: b.answer, correctFeedback: b.feedback.correct, choiceFeedback: b.feedback.choices };
  });

  const translations: Mutable<Translations<LessonText>> = {};
  const gaps = {} as Record<TranslatedLocale, string[]>;
  for (const loc of TRANSLATED_LOCALES) {
    const f = overlayFiles.get(loc);
    if (!f) {
      gaps[loc] = [`${lessonId}.${loc}.yaml`];
      continue;
    }
    const ovRaw = parseYaml(f, add);
    const ov = ovRaw === undefined ? null : validate(lessonOverlaySchema, ovRaw, f.path, add);
    if (!ov) {
      gaps[loc] = ["valid overlay"];
      continue;
    }
    const r = buildLessonText(blocks, answers, ov, f.path, add);
    if (Object.keys(r.text).length > 0) translations[loc] = r.text;
    gaps[loc] = r.gaps;
  }

  if (issueCount > 0) return null;
  return { lesson: { id: lessonId, unitId, title: y.title, tags: y.tags, blocks }, answers, translations, gaps };
}

/** Answer in range, distinct choices, and exactly one explanation per wrong choice. */
function checkExercise(b: ExerciseBlockYaml, where: string, path: string, add: AddIssue): void {
  const n = b.choices.length;
  if (b.answer >= n) add(path, `${where}: answer ${b.answer} is out of range (0..${n - 1})`);
  const seen = new Set<string>();
  for (const c of b.choices) {
    if (seen.has(c)) add(path, `${where}: duplicate choice ${JSON.stringify(c)}`);
    seen.add(c);
  }
  for (const key of Object.keys(b.feedback.choices)) {
    const i = Number(key);
    if (i >= n) add(path, `${where}: feedback.choices.${key} is out of range (0..${n - 1})`);
    else if (i === b.answer) add(path, `${where}: feedback.choices.${key} is the answer; it is explained by feedback.correct`);
  }
  for (let i = 0; i < n; i++) {
    if (i !== b.answer && own(b.feedback.choices, String(i)) === undefined) add(path, `${where}: feedback.choices: missing explanation for wrong choice ${i}`);
  }
}

/**
 * Validates one <lesson>.<l>.yaml against the Korean lesson. Issues: unknown block ids, overlaid answers, fields of
 * the other block kind, code where the Korean block has none, a different number of choices, choices moved to
 * another index (the answer would change), unknown feedback indices. Gaps (incomplete, still served field by field):
 * missing title/blocks/fields, Korean code with Hangul but no localized code, Hangul left in a translated block.
 */
function buildLessonText(
  blocks: readonly LessonBlock[],
  answers: Readonly<Record<string, StoredLessonAnswer>>,
  ov: LessonOverlayYaml,
  path: string,
  add: AddIssue,
): { text: LessonText; gaps: string[] } {
  const byId = new Map(blocks.map((b) => [b.id, b]));
  const out: Record<string, LessonBlockText> = {};
  for (const [id, o] of Object.entries(ov.blocks)) {
    const kb = byId.get(id);
    if (!kb) {
      add(path, `blocks: unknown block "${id}"`);
      continue;
    }
    const at = `blocks.${id}`;
    if (Object.hasOwn(o, "answer")) add(path, `${at}.answer: answers are never translated; they come from the Korean lesson`);
    if (kb.kind === "prose") {
      for (const k of ["prompt", "code", "choices", "feedback"] as const) {
        if (o[k] !== undefined) add(path, `${at}.${k}: a prose block translates only "markdown"`);
      }
      if (o.markdown !== undefined) out[id] = { markdown: o.markdown };
      continue;
    }
    if (o.markdown !== undefined) add(path, `${at}.markdown: an exercise block translates prompt, code, choices and feedback`);
    if (o.code !== undefined && kb.code === undefined) add(path, `${at}.code: the Korean block has no code`);
    const known = answers[id]?.choiceFeedback ?? {};
    for (const key of Object.keys(o.feedback?.choices ?? {})) {
      if (own(known, key) === undefined) add(path, `${at}.feedback.choices.${key}: unknown choice explanation (not in the Korean lesson)`);
    }
    if (o.choices !== undefined) checkChoiceOrder(kb.choices, o.choices, at, path, add);
    out[id] = defined({
      prompt: o.prompt,
      code: o.code,
      choices: o.choices,
      correctFeedback: o.feedback?.correct,
      choiceFeedback: o.feedback?.choices,
    });
  }
  return { text: defined({ title: ov.title, blocks: Object.keys(out).length > 0 ? out : undefined }), gaps: lessonGaps(blocks, answers, ov) };
}

/** Same count; a language-neutral Korean choice found at another index means the order (and the answer) changed. */
function checkChoiceOrder(ko: readonly string[], tr: readonly string[], at: string, path: string, add: AddIssue): void {
  if (tr.length !== ko.length) {
    add(path, `${at}.choices: has ${tr.length} entries; the Korean block has ${ko.length} (same order, answers never change)`);
    return;
  }
  ko.forEach((choice, i) => {
    if (HANGUL.test(choice) || tr[i] === choice) return;
    const j = tr.indexOf(choice);
    if (j >= 0) add(path, `${at}.choices: ${JSON.stringify(choice)} moved from index ${i} to ${j}; keep the Korean order (answers never change)`);
  });
}

function lessonGaps(blocks: readonly LessonBlock[], answers: Readonly<Record<string, StoredLessonAnswer>>, ov: LessonOverlayYaml): string[] {
  const gaps: string[] = [];
  if (ov.title === undefined) gaps.push("title");
  else if (HANGUL.test(ov.title)) gaps.push("title still contains Korean");
  for (const b of blocks) {
    const o = own(ov.blocks, b.id);
    if (!o) {
      gaps.push(`block ${b.id}`);
      continue;
    }
    const missing: string[] = [];
    if (b.kind === "prose") {
      if (o.markdown === undefined) missing.push("markdown");
    } else {
      if (o.prompt === undefined) missing.push("prompt");
      if (o.choices === undefined) missing.push("choices");
      if (o.feedback?.correct === undefined) missing.push("feedback.correct");
      for (const key of Object.keys(answers[b.id]?.choiceFeedback ?? {})) {
        if (own(o.feedback?.choices, key) === undefined) missing.push(`feedback.choices.${key}`);
      }
      if (b.code !== undefined && HANGUL.test(b.code) && o.code === undefined) missing.push("code (the Korean code contains Korean)");
    }
    const { answer: _ignored, ...texts } = o;
    if (HANGUL.test(JSON.stringify(texts))) missing.push("still contains Korean");
    if (missing.length > 0) gaps.push(`block ${b.id}: ${missing.join(", ")}`);
  }
  return gaps;
}
