/**
 * Turns an in-memory content tree into validated domain objects. Pure: no I/O, no DB.
 * Every problem is collected as a ContentIssue (path relative to the content root); nothing fails fast.
 */
import { asId, err, ok, type ExerciseId, type FamilyId, type Language, type Result } from "@fp/kernel";
import type {
  ConceptNote,
  ContentSource,
  ExerciseDetail,
  ExerciseSummary,
  FileContent,
  GradingSpec,
  Hint,
  PublicTestView,
  ReferenceMaterial,
  RubricItem,
  Skill,
  TheoryTopic,
} from "../contract/index.ts";
import { splitFrontMatter } from "./frontmatter.ts";
import { declaresPubFn, extractPubFnBody } from "./gleam.ts";
import type { NoteText, SkillText, Translations, VariantText } from "../i18n.ts";
import { findCycle } from "./graph.ts";
import { hashBundle, hashVariant } from "./hash.ts";
import { parseLessons, type ParsedLessonUnit } from "./lessons.ts";
import { parseRecall, type ParsedRecall } from "./recall.ts";
import {
  conceptFrontMatterSchema,
  exerciseSchema,
  familySchema,
  HINT_KINDS,
  KEBAB_ID,
  skillsFileSchema,
  theoryFrontMatterSchema,
  type ExerciseYaml,
  type FamilyYaml,
} from "./schemas.ts";
import { filesUnder, subdirs, type ContentTree, type TreeFile } from "./tree.ts";
import {
  isFamilyTranslationFile,
  isNoteTranslationFile,
  isVariantTranslationEntry,
  parseFamilyTranslations,
  parseNoteTranslations,
  parseSkillTranslations,
  parseVariantTranslations,
  type FamilyOverlay,
} from "./translations.ts";
import { parseYaml, validate, type AddIssue } from "./yaml.ts";

export interface ContentIssue {
  readonly path: string;
  readonly message: string;
}

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

/** A variant with everything but its version, which the importer assigns. */
export interface ParsedVariant {
  readonly familyId: FamilyId;
  readonly variantKey: string;
  readonly contentHash: string;
  readonly summary: Omit<ExerciseSummary, "id" | "version">;
  readonly detail: Omit<ExerciseDetail, keyof ExerciseSummary>;
  readonly grading: Omit<GradingSpec, "exerciseId">;
  readonly reference: Omit<ReferenceMaterial, "exerciseId">;
  /** en/zh texts; applied over the Korean objects by the catalog (src/i18n.ts). */
  readonly translations: Translations<VariantText>;
}

/** Translations of the unversioned content, keyed by id. */
export interface ParsedTranslations {
  readonly skills: ReadonlyMap<string, Translations<SkillText>>;
  readonly conceptNotes: ReadonlyMap<string, Translations<NoteText>>;
  readonly theoryTopics: ReadonlyMap<string, Translations<NoteText>>;
}

export interface ParsedContent {
  readonly contentHash: string;
  readonly skills: readonly Skill[];
  readonly conceptNotes: readonly ConceptNote[];
  readonly theoryTopics: readonly TheoryTopic[];
  readonly variants: readonly ParsedVariant[];
  readonly translations: ParsedTranslations;
  /** content/lessons, sorted by unit order (empty when the directory is absent). */
  readonly lessonUnits: readonly ParsedLessonUnit[];
  /** content/recall (no decks when the directory is absent). */
  readonly recall: ParsedRecall;
}

export interface MaterializedExercise {
  readonly id: ExerciseId;
  readonly summary: ExerciseSummary;
  readonly detail: ExerciseDetail;
  readonly grading: GradingSpec;
  readonly reference: ReferenceMaterial;
}

export function exerciseIdOf(familyId: string, variantKey: string, version: number): ExerciseId {
  return asId<ExerciseId>(`${familyId}/${variantKey}@${version}`);
}

/** Stamps a parsed variant with its id and version. */
export function materialize(v: ParsedVariant, version: number): MaterializedExercise {
  const id = exerciseIdOf(v.familyId, v.variantKey, version);
  const summary: ExerciseSummary = { id, version, ...v.summary };
  return {
    id,
    summary,
    detail: { ...summary, ...v.detail },
    grading: { exerciseId: id, ...v.grading },
    reference: { exerciseId: id, ...v.reference },
  };
}

const VARIANT_TOP_FILES: readonly string[] = ["exercise.yaml", "prompt.md", "explanation.md"];
const CODE_SUBDIRS: readonly string[] = ["starter", "solution", "test", "support", "wrong"];
const DEFAULT_LIMITS = { timeMs: 10000, memoryMb: 256 } as const;
const LANGUAGE: Language = "gleam";

export function parseContent(tree: ContentTree): Result<ParsedContent, readonly ContentIssue[]> {
  const issues: ContentIssue[] = [];
  const add = (path: string, message: string) => issues.push({ path, message });

  const skills = parseSkills(tree, add);
  const skillIds = skills ? new Set<string>(skills.map((s) => s.id)) : null;

  const conceptIds = new Set<string>();
  const conceptNotes = parseNotes(tree, "concepts/", conceptIds, add, (fm, body, path) => {
    const note = validate(conceptFrontMatterSchema, fm, path, add);
    if (!note) return null;
    return {
      id: asId(note.id),
      language: note.language as Language,
      title: note.title,
      markdown: body,
      source: toSource(note.source),
    } satisfies ConceptNote;
  });

  const theoryIds = new Set<string>();
  const theoryTopics = parseNotes(tree, "theory/", theoryIds, add, (fm, body, path) => {
    const topic = validate(theoryFrontMatterSchema, fm, path, add);
    if (!topic) return null;
    if (skillIds) checkRefs(topic.relatedSkills, skillIds, "relatedSkills", "skill", path, add);
    return {
      id: asId(topic.id),
      title: topic.title,
      level: topic.level,
      markdown: body,
      relatedSkills: topic.relatedSkills.map((s) => asId(s)),
      furtherReading: topic.furtherReading.map((c) =>
        c.url === undefined ? { text: c.text, verified: c.verified } : { text: c.text, url: c.url, verified: c.verified },
      ),
    } satisfies TheoryTopic;
  });

  const translations: ParsedTranslations = {
    skills: parseSkillTranslations(tree, skills, add),
    conceptNotes: parseNoteTranslations(tree, "concepts/", conceptIds, add),
    theoryTopics: parseNoteTranslations(tree, "theory/", theoryIds, add),
  };

  const refs: Refs = { skillIds, conceptIds, theoryIds };
  const variants: ParsedVariant[] = [];
  const families = subdirs(tree, "exercises/");
  if (families.length === 0) add("exercises", "no exercise families found");
  for (const familyId of families) variants.push(...parseFamily(tree, familyId, refs, add));
  const lessonUnits = parseLessons(tree, skills, add);
  const recall = parseRecall(tree, add);

  if (issues.length > 0) return err(issues);
  return ok({
    contentHash: hashBundle([...tree.files.values()]),
    skills: skills ?? [],
    conceptNotes,
    theoryTopics,
    variants,
    translations,
    lessonUnits,
    recall,
  });
}

interface Refs {
  /** null when skills.yaml itself is invalid (skill references are then not checked). */
  readonly skillIds: ReadonlySet<string> | null;
  readonly conceptIds: ReadonlySet<string>;
  readonly theoryIds: ReadonlySet<string>;
}

function checkRefs(
  ids: readonly string[],
  known: ReadonlySet<string>,
  field: string,
  what: string,
  path: string,
  add: AddIssue,
): void {
  for (const id of ids) if (!known.has(id)) add(path, `${field}: unknown ${what} "${id}"`);
}

function toSource(s: FamilyYaml["source"]): ContentSource {
  const out: Mutable<ContentSource> = { kind: s.kind };
  if (s.license !== undefined) out.license = s.license;
  if (s.url !== undefined) out.url = s.url;
  if (s.upstream !== undefined) out.upstream = s.upstream;
  if (s.notes !== undefined) out.notes = s.notes;
  return out;
}

function parseSkills(tree: ContentTree, add: AddIssue): Skill[] | null {
  const path = "skills.yaml";
  const file = tree.files.get(path);
  if (!file) {
    add(path, "missing skills.yaml");
    return null;
  }
  const raw = parseYaml(file, add);
  if (raw === undefined) return null;
  const data = validate(skillsFileSchema, raw, path, add);
  if (!data) return null;
  const ids = new Set<string>();
  let valid = true;
  for (const s of data.skills) {
    if (ids.has(s.id)) {
      add(path, `duplicate skill id "${s.id}"`);
      valid = false;
    }
    ids.add(s.id);
  }
  for (const s of data.skills) {
    for (const p of s.prerequisites) {
      if (!ids.has(p)) add(path, `skill "${s.id}": unknown prerequisite "${p}"`);
      else if (p === s.id) add(path, `skill "${s.id}" lists itself as a prerequisite`);
    }
  }
  const cycle = findCycle(new Map(data.skills.map((s) => [s.id, s.prerequisites])));
  if (cycle) add(path, `prerequisite cycle: ${cycle.join(" -> ")}`);
  if (!valid) return null;
  return data.skills.map((s) => ({
    id: asId(s.id),
    name: s.name,
    description: s.description,
    track: s.track,
    prerequisites: s.prerequisites.map((p) => asId(p)),
    order: s.order,
  }));
}

/** Parses `<dir>/<id>.md` notes. Ids (from file names) are recorded even when a note is invalid. */
function parseNotes<T>(
  tree: ContentTree,
  dir: string,
  ids: Set<string>,
  add: AddIssue,
  build: (frontMatter: Record<string, unknown>, body: string, path: string) => T | null,
): T[] {
  const out: T[] = [];
  for (const file of filesUnder(tree, dir)) {
    const name = file.path.slice(dir.length);
    if (isNoteTranslationFile(name)) continue; // <id>.<locale>.md, see translations.ts
    if (name.includes("/") || !name.endsWith(".md")) {
      add(file.path, `unexpected file; notes must be ${dir}<id>.md`);
      continue;
    }
    const id = name.slice(0, -3);
    ids.add(id);
    if (!KEBAB_ID.test(id)) add(file.path, `file name "${id}" is not a kebab-case id`);
    const doc = splitFrontMatter(file.text);
    if (!doc) {
      add(file.path, "missing YAML front matter (--- ... ---)");
      continue;
    }
    const fm = parseYaml({ ...file, text: doc.frontMatter }, add);
    if (fm === undefined) continue;
    if (typeof fm !== "object" || fm === null || Array.isArray(fm)) {
      add(file.path, "front matter must be a mapping");
      continue;
    }
    const record = fm as Record<string, unknown>;
    if (record["id"] !== id) add(file.path, `front matter id "${String(record["id"])}" must equal the file name "${id}"`);
    if (doc.body.trim() === "") add(file.path, "note body is empty");
    const built = build(record, doc.body, file.path);
    if (built) out.push(built);
  }
  return out;
}

function parseFamily(tree: ContentTree, familyId: string, refs: Refs, add: AddIssue): ParsedVariant[] {
  const dir = `exercises/${familyId}/`;
  const familyPath = `${dir}family.yaml`;
  if (!KEBAB_ID.test(familyId)) add(`exercises/${familyId}`, `family id "${familyId}" is not kebab-case`);
  const familyFile = tree.files.get(familyPath);
  let family: FamilyYaml | null = null;
  if (!familyFile) add(familyPath, "missing family.yaml");
  else {
    const raw = parseYaml(familyFile, add);
    if (raw !== undefined) {
      family = validate(familySchema, raw, familyPath, add);
    }
  }
  const familyTranslations = parseFamilyTranslations(tree, dir, family, add);
  const familyFiles = familyFile ? [familyFile, ...familyTranslations.files] : [...familyTranslations.files];
  const variantKeys = subdirs(tree, dir);
  for (const f of filesUnder(tree, dir)) {
    const rest = f.path.slice(dir.length);
    if (!rest.includes("/") && rest !== "family.yaml" && !isFamilyTranslationFile(rest)) {
      add(f.path, "unexpected file; a family directory holds family.yaml, family.<locale>.yaml and variant directories");
    }
  }
  if (variantKeys.length === 0) add(`exercises/${familyId}`, "family has no variants");
  const out: ParsedVariant[] = [];
  for (const key of variantKeys) {
    const v = parseVariant(tree, familyId, key, { files: familyFiles, family, overlays: familyTranslations.overlays }, refs, add);
    if (v) out.push(v);
  }
  return out;
}

interface FamilyInput {
  /** family.yaml and family.<locale>.yaml (all part of every variant's hash). */
  readonly files: readonly TreeFile[];
  readonly family: FamilyYaml | null;
  readonly overlays: Translations<FamilyOverlay>;
}

function parseVariant(
  tree: ContentTree,
  familyId: string,
  variantKey: string,
  fam: FamilyInput,
  refs: Refs,
  addOuter: AddIssue,
): ParsedVariant | null {
  let issueCount = 0;
  const add: AddIssue = (path, message) => {
    issueCount++;
    addOuter(path, message);
  };
  const { family } = fam;
  const dir = `exercises/${familyId}/${variantKey}/`;
  const exPath = `${dir}exercise.yaml`;
  const familyPath = `exercises/${familyId}/family.yaml`;
  if (!KEBAB_ID.test(variantKey)) add(`exercises/${familyId}/${variantKey}`, `variant key "${variantKey}" is not kebab-case`);

  const exFile = tree.files.get(exPath);
  if (!exFile) {
    add(exPath, "missing exercise.yaml");
    return null;
  }
  const raw = parseYaml(exFile, add);
  if (raw === undefined) return null;
  const ex: ExerciseYaml | null = validate(exerciseSchema, raw, exPath, add);
  if (!ex) return null;
  if (!family) return null; // family.yaml issues already reported

  const origin = (key: keyof ExerciseYaml) => (ex[key] !== undefined ? exPath : familyPath);
  const merged = {
    title: ex.title ?? family.title,
    primarySkill: ex.primarySkill ?? family.primarySkill,
    secondarySkills: ex.secondarySkills ?? family.secondarySkills ?? [],
    contextTags: ex.contextTags ?? family.contextTags ?? [],
    source: ex.source ?? family.source,
    conceptNotes: ex.conceptNotes ?? family.conceptNotes ?? [],
    theoryTopics: ex.theoryTopics ?? family.theoryTopics ?? [],
    rubric: ex.rubric ?? family.rubric ?? [],
  };

  // Cross references.
  if (refs.skillIds) {
    checkRefs([merged.primarySkill], refs.skillIds, "primarySkill", "skill", origin("primarySkill"), add);
    checkRefs(merged.secondarySkills, refs.skillIds, "secondarySkills", "skill", origin("secondarySkills"), add);
  }
  checkRefs(merged.conceptNotes, refs.conceptIds, "conceptNotes", "concept note", origin("conceptNotes"), add);
  checkRefs(merged.theoryTopics, refs.theoryIds, "theoryTopics", "theory topic", origin("theoryTopics"), add);
  checkRubric(merged.rubric, origin("rubric"), add);
  const hints = checkHints(ex, exPath, add);

  // Files.
  const variantFiles = filesUnder(tree, dir);
  const isPredict = ex.kind === "predict";
  for (const f of variantFiles) {
    const rest = f.path.slice(dir.length);
    const slash = rest.indexOf("/");
    const allowed = slash < 0 ? VARIANT_TOP_FILES : isPredict ? [] : CODE_SUBDIRS;
    const name = slash < 0 ? rest : rest.slice(0, slash);
    if (!allowed.includes(name) && !isVariantTranslationEntry(name, slash >= 0, isPredict)) add(f.path, `unexpected ${slash < 0 ? "file" : "directory"} "${name}" in a ${ex.kind} variant`);
  }
  const text = (rel: string): string | null => tree.files.get(dir + rel)?.text ?? null;
  const prompt = text("prompt.md");
  if (prompt === null || prompt.trim() === "") add(`${dir}prompt.md`, "missing or empty prompt.md");
  const explanation = text("explanation.md");
  if (explanation === null || explanation.trim() === "") add(`${dir}explanation.md`, "missing or empty explanation.md");

  if (isPredict && !ex.predict) add(exPath, "predict: required for predict exercises");
  if (!isPredict && ex.predict) add(exPath, "predict: only allowed for predict exercises");

  let code: CodeParts | null = null;
  if (!isPredict) code = checkCodeExercise(ex, dir, exPath, variantFiles, add);

  const rubric: RubricItem[] = merged.rubric.map((item) =>
    item.automatedCheck === undefined ? { id: item.id, title: item.title, description: item.description } : { ...item },
  );
  const i18n = parseVariantTranslations(
    {
      dir,
      ex,
      variantFiles,
      familyOverlays: fam.overlays,
      rubric,
      starter: code?.starter[0]?.content ?? null,
    },
    add,
  );

  if (issueCount > 0) return null;

  const summary: ParsedVariant["summary"] = {
    familyId: asId(familyId),
    variantKey,
    language: LANGUAGE,
    kind: ex.kind,
    format: ex.format,
    title: merged.title,
    primarySkill: asId(merged.primarySkill),
    secondarySkills: merged.secondarySkills.map((s) => asId(s)),
    difficulty: ex.difficulty,
    estimatedMinutes: ex.estimatedMinutes,
    contextTags: merged.contextTags,
    source: toSource(merged.source),
    locales: i18n.locales,
  };
  const predict = ex.predict ? { code: ex.predict.code, acceptedAnswers: ex.predict.acceptedAnswers } : undefined;
  const moduleName = ex.module ?? "";

  const detail: Mutable<ParsedVariant["detail"]> = {
    promptMarkdown: prompt ?? "",
    moduleName,
    starterFiles: code ? [...code.starter, ...code.support] : [],
    publicTests: code?.publicTests ?? [],
    hints,
    rubric,
    conceptNoteIds: merged.conceptNotes.map((n) => asId(n)),
    theoryTopicIds: merged.theoryTopics.map((t) => asId(t)),
  };
  if (predict) detail.predict = predict;

  const grading: Mutable<ParsedVariant["grading"]> = {
    language: LANGUAGE,
    kind: ex.kind,
    moduleName,
    testFiles: code?.testFiles ?? [],
    supportFiles: code?.support ?? [],
    tests: (ex.tests ?? []).map((t) => {
      const spec: Mutable<GradingSpec["tests"][number]> = {
        id: t.fn,
        functionName: t.fn,
        name: t.name,
        visibility: t.visibility,
      };
      if (t.errorTag !== undefined) spec.errorTag = t.errorTag;
      if (t.requirements !== undefined) spec.requirementIds = t.requirements;
      return spec;
    }),
    requirements: ex.requirements ?? [],
    rubric,
    limits: { ...DEFAULT_LIMITS, ...ex.limits },
  };
  if (ex.performance) {
    grading.performance = {
      sizes: ex.performance.sizes,
      perfModule: ex.performance.module,
      maxCostRatio: ex.performance.maxCostRatio,
      referenceCost: ex.performance.referenceCost ?? [],
    };
  }
  if (predict) grading.predict = predict;

  return {
    familyId: asId(familyId),
    variantKey,
    contentHash: hashVariant(fam.files, `exercises/${familyId}/`, variantFiles, dir),
    summary,
    detail,
    grading,
    reference: {
      solutionFiles: code?.solution ?? [],
      explanationMarkdown: explanation ?? "",
      wrongSolutions: code?.wrong ?? [],
    },
    translations: i18n.translations,
  };
}

function checkRubric(rubric: FamilyYaml["rubric"] & object, path: string, add: AddIssue): void {
  const ids = new Set<string>();
  for (const item of rubric) {
    if (ids.has(item.id)) add(path, `rubric: duplicate id "${item.id}"`);
    ids.add(item.id);
    const check = item.automatedCheck;
    if (check && (check.kind === "forbid_pattern" || check.kind === "require_pattern")) {
      try {
        new RegExp(check.pattern);
      } catch (e) {
        add(path, `rubric ${item.id}: invalid pattern: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
}

function checkHints(ex: ExerciseYaml, path: string, add: AddIssue): Hint[] {
  const levels = ex.hints.map((h) => h.level);
  const sorted = [...levels].sort((a, b) => a - b);
  if (sorted.join(",") !== "1,2,3,4,5") {
    add(path, `hints: must contain exactly levels 1..5 once each (found [${levels.join(", ")}])`);
    return [];
  }
  const hints = [...ex.hints].sort((a, b) => a.level - b.level);
  for (const h of hints) {
    const expected = HINT_KINDS[h.level - 1];
    if (h.kind !== expected) add(path, `hints: level ${h.level} must have kind "${expected}" (found "${h.kind}")`);
  }
  return hints.map((h) => ({ level: h.level as Hint["level"], kind: h.kind, markdown: h.text }));
}

interface CodeParts {
  readonly starter: FileContent[];
  readonly support: FileContent[];
  readonly solution: FileContent[];
  readonly testFiles: FileContent[];
  readonly publicTests: PublicTestView[];
  readonly wrong: ReferenceMaterial["wrongSolutions"][number][];
}

/** Checks for implement/fix/refactor exercises: module files, tests, wrong answers, performance. */
function checkCodeExercise(
  ex: ExerciseYaml,
  dir: string,
  exPath: string,
  variantFiles: readonly TreeFile[],
  add: AddIssue,
): CodeParts | null {
  const mod = ex.module;
  if (!mod) {
    add(exPath, "module: required for implement/fix/refactor exercises");
    return null;
  }
  const moduleFile = `${mod}.gleam`;
  const rel = (f: TreeFile) => f.path.slice(dir.length);
  const inDir = (sub: string) => variantFiles.filter((f) => rel(f).startsWith(`${sub}/`));

  const exactModuleDir = (sub: string): FileContent[] => {
    const files = inDir(sub);
    if (!files.some((f) => rel(f) === `${sub}/${moduleFile}`)) add(`${dir}${sub}/${moduleFile}`, `missing ${sub}/${moduleFile} (module "${mod}")`);
    for (const f of files) if (rel(f) !== `${sub}/${moduleFile}`) add(f.path, `unexpected file; ${sub}/ must contain only ${moduleFile}`);
    return files.filter((f) => rel(f) === `${sub}/${moduleFile}`).map((f) => ({ path: `src/${moduleFile}`, content: f.text }));
  };
  const starter = exactModuleDir("starter");
  const solution = exactModuleDir("solution");

  const support: FileContent[] = [];
  for (const f of inDir("support")) {
    const name = rel(f).slice("support/".length);
    if (!/^[a-z][a-z0-9_]*(\/[a-z][a-z0-9_]*)*\.gleam$/.test(name)) add(f.path, "support files must be snake_case .gleam modules");
    else if (name === moduleFile) add(f.path, `support module must not shadow the learner module "${mod}"`);
    else support.push({ path: `src/${name}`, content: f.text });
  }

  const testTree = inDir("test");
  const testFiles = testTree.map((f) => ({ path: rel(f), content: f.text }));
  const gleamTests = testTree.filter((f) => f.path.endsWith(".gleam"));
  const mainTest = `test/${mod}_test.gleam`;
  if (!testTree.some((f) => rel(f) === mainTest)) add(dir + mainTest, `missing ${mainTest}`);

  // Tests and their functions.
  const tests = ex.tests ?? [];
  if (tests.length === 0) add(exPath, "tests: at least one test is required");
  const reqIds = new Set<string>();
  for (const req of ex.requirements ?? []) {
    if (reqIds.has(req.id)) add(exPath, `requirements: duplicate id "${req.id}"`);
    reqIds.add(req.id);
  }
  const fns = new Set<string>();
  const publicTests: PublicTestView[] = [];
  // Search the main test file first so its definitions win over helpers with the same name.
  const ordered = [...gleamTests].sort((a, b) => Number(rel(b) === mainTest) - Number(rel(a) === mainTest));
  for (const t of tests) {
    if (fns.has(t.fn)) add(exPath, `tests: duplicate fn "${t.fn}"`);
    fns.add(t.fn);
    const file = ordered.find((f) => declaresPubFn(f.text, t.fn));
    if (!file) {
      add(exPath, `tests: fn "${t.fn}" is not declared as "pub fn ${t.fn}(" in any test file`);
      continue;
    }
    for (const r of t.requirements ?? []) if (!reqIds.has(r)) add(exPath, `tests: ${t.fn} references unknown requirement "${r}"`);
    if (t.visibility !== "public") continue;
    const body = extractPubFnBody(file.text, t.fn);
    if (body === null) add(file.path, `could not extract the body of public test "${t.fn}"`);
    else publicTests.push({ id: t.fn, name: t.name, code: body });
  }
  if (tests.length > 0 && !tests.some((t) => t.visibility === "public")) {
    add(exPath, "tests: at least one public test is required");
  }

  // Wrong answers.
  const wrongEntries = ex.wrong ?? [];
  if ((ex.kind === "implement" || ex.kind === "fix") && wrongEntries.length === 0) {
    add(exPath, "wrong: at least one wrong answer is required for implement/fix exercises");
  }
  const wrongKeys = new Set<string>();
  const wrong: CodeParts["wrong"] = [];
  const wrongDirs = new Set(inDir("wrong").map((f) => rel(f).split("/")[1] ?? ""));
  for (const w of wrongEntries) {
    if (wrongKeys.has(w.key)) add(exPath, `wrong: duplicate key "${w.key}"`);
    wrongKeys.add(w.key);
    for (const fn of w.mustFail) if (!fns.has(fn)) add(exPath, `wrong ${w.key}: mustFail references unknown test "${fn}"`);
    if (!wrongDirs.has(w.key)) {
      add(`${dir}wrong/${w.key}`, `missing directory for wrong answer "${w.key}"`);
      continue;
    }
    const files = exactModuleDir(`wrong/${w.key}`);
    const ws: Mutable<CodeParts["wrong"][number]> = { key: w.key, files, mustFail: w.mustFail };
    if (w.errorTag !== undefined) ws.errorTag = w.errorTag;
    wrong.push(ws);
  }
  for (const d of wrongDirs) if (!wrongKeys.has(d)) add(`${dir}wrong/${d}`, `directory has no matching "wrong" entry in exercise.yaml`);

  // Performance.
  const perf = ex.performance;
  if (perf) {
    const perfFile = `test/${perf.module}.gleam`;
    if (!testTree.some((f) => rel(f) === perfFile)) add(exPath, `performance.module: missing ${perfFile}`);
    for (let i = 1; i < perf.sizes.length; i++) {
      if ((perf.sizes[i] ?? 0) <= (perf.sizes[i - 1] ?? 0)) {
        add(exPath, "performance.sizes: must be strictly ascending");
        break;
      }
    }
    if (perf.referenceCost && perf.referenceCost.length !== perf.sizes.length) {
      add(exPath, "performance.referenceCost: must have one entry per size");
    }
  }

  return { starter, support, solution, testFiles, publicTests, wrong };
}
