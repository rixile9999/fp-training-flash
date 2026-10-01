/**
 * Per-locale text overlays and how the catalog applies them. Korean is the source: an overlay only holds the
 * translated fields, and every field it lacks falls back to Korean (content/README.md, "Localization").
 * Overlays are stored as JSON next to the Korean objects (column `translations`), keyed by locale.
 */
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from "@fp/kernel";
import type {
  ConceptNote,
  ExerciseDetail,
  ExerciseSummary,
  GradingSpec,
  ReferenceMaterial,
  RubricItem,
  Skill,
  TheoryTopic,
} from "./contract/index.ts";

/** Locales that are translated from Korean (every supported locale except the default). */
export type TranslatedLocale = Exclude<Locale, "ko">;
export const TRANSLATED_LOCALES: readonly TranslatedLocale[] = SUPPORTED_LOCALES.filter(
  (l): l is TranslatedLocale => l !== DEFAULT_LOCALE,
);

export function isTranslatedLocale(value: string): value is TranslatedLocale {
  return (TRANSLATED_LOCALES as readonly string[]).includes(value);
}

/** One overlay per translated locale; a missing locale means "everything in Korean". */
export type Translations<T> = Partial<Record<TranslatedLocale, T>>;

export interface SkillText {
  readonly name?: string;
  readonly description?: string;
}

export interface NoteText {
  readonly title?: string;
  readonly markdown?: string;
}

export interface RubricText {
  readonly title?: string;
  readonly description?: string;
  /** Translates `automatedCheck.message`. */
  readonly message?: string;
}

/** Translated texts of one exercise variant, already merged from family.<l>.yaml and the variant files. */
export interface VariantText {
  readonly title?: string;
  readonly promptMarkdown?: string;
  readonly explanationMarkdown?: string;
  /** Test function name -> test name. */
  readonly testNames?: Readonly<Record<string, string>>;
  /** Requirement id -> description. */
  readonly requirements?: Readonly<Record<string, string>>;
  /** Hint level ("1".."5") -> markdown. */
  readonly hints?: Readonly<Record<string, string>>;
  /** Rubric id -> texts. */
  readonly rubric?: Readonly<Record<string, RubricText>>;
  /** Learner module source with translated comments (starter.<l>/<module>.gleam). */
  readonly starter?: string;
}

/** Own-property lookup, so ids such as "constructor" never hit Object.prototype. */
function own<T>(record: Readonly<Record<string, T>> | undefined, key: string): T | undefined {
  return record !== undefined && Object.hasOwn(record, key) ? record[key] : undefined;
}

/** The overlay for `locale`, or undefined for Korean, unknown locales and missing translations. */
export function overlayFor<T>(translations: Translations<T> | null | undefined, locale: Locale | undefined): T | undefined {
  if (!translations || locale === undefined || !isTranslatedLocale(locale)) return undefined;
  return own(translations as Readonly<Record<string, T>>, locale);
}

export function localizeSkill(skill: Skill, t: SkillText | undefined): Skill {
  if (!t) return skill;
  return { ...skill, name: t.name ?? skill.name, description: t.description ?? skill.description };
}

export function localizeConceptNote(note: ConceptNote, t: NoteText | undefined): ConceptNote {
  if (!t) return note;
  return { ...note, title: t.title ?? note.title, markdown: t.markdown ?? note.markdown };
}

export function localizeTheoryTopic(topic: TheoryTopic, t: NoteText | undefined): TheoryTopic {
  if (!t) return topic;
  return { ...topic, title: t.title ?? topic.title, markdown: t.markdown ?? topic.markdown };
}

/** Rows written before localization existed have no `locales`; they were Korean only. */
export function withLocales<S extends Omit<ExerciseSummary, "locales"> & { readonly locales?: readonly Locale[] }>(
  summary: S,
): S & { readonly locales: readonly Locale[] } {
  return { ...summary, locales: summary.locales ?? [DEFAULT_LOCALE] };
}

export function localizeSummary(summary: ExerciseSummary, t: VariantText | undefined): ExerciseSummary {
  const s = withLocales(summary);
  return t?.title === undefined ? s : { ...s, title: t.title };
}

function localizeRubric(rubric: readonly RubricItem[], t: VariantText | undefined): readonly RubricItem[] {
  if (!t?.rubric) return rubric;
  return rubric.map((item) => {
    const r = own(t.rubric, item.id);
    if (!r) return item;
    const out: RubricItem = { ...item, title: r.title ?? item.title, description: r.description ?? item.description };
    const check = item.automatedCheck;
    if (check && check.kind !== "max_function_lines" && r.message !== undefined) {
      return { ...out, automatedCheck: { ...check, message: r.message } };
    }
    return out;
  });
}

export function localizeDetail(detail: ExerciseDetail, t: VariantText | undefined): ExerciseDetail {
  const d = withLocales(detail);
  if (!t) return d;
  const starterPath = `src/${d.moduleName}.gleam`;
  return {
    ...d,
    title: t.title ?? d.title,
    promptMarkdown: t.promptMarkdown ?? d.promptMarkdown,
    starterFiles:
      t.starter === undefined
        ? d.starterFiles
        : d.starterFiles.map((f) => (f.path === starterPath ? { ...f, content: t.starter ?? f.content } : f)),
    publicTests: d.publicTests.map((p) => ({ ...p, name: own(t.testNames, p.id) ?? p.name })),
    hints: d.hints.map((h) => ({ ...h, markdown: own(t.hints, String(h.level)) ?? h.markdown })),
    rubric: localizeRubric(d.rubric, t),
  };
}

export function localizeGrading(spec: GradingSpec, t: VariantText | undefined): GradingSpec {
  if (!t) return spec;
  return {
    ...spec,
    tests: spec.tests.map((c) => ({ ...c, name: own(t.testNames, c.functionName) ?? c.name })),
    requirements: spec.requirements.map((r) => ({ ...r, description: own(t.requirements, r.id) ?? r.description })),
    rubric: localizeRubric(spec.rubric, t),
  };
}

export function localizeReference(reference: ReferenceMaterial, t: VariantText | undefined): ReferenceMaterial {
  if (t?.explanationMarkdown === undefined) return reference;
  return { ...reference, explanationMarkdown: t.explanationMarkdown };
}
