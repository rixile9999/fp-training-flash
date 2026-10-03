/**
 * Per-locale text overlays and how the catalog applies them. Korean is the source: an overlay only holds the
 * translated fields, and every field it lacks falls back to Korean (content/README.md, "Localization").
 * Overlays are stored as JSON next to the Korean objects (column `translations`), keyed by locale.
 */
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from "@fp/kernel";
import type {
  ConceptNote,
  ContentSource,
  ExerciseDetail,
  ExerciseSummary,
  GradingSpec,
  Lesson,
  LessonAnswerKey,
  LessonBlock,
  LessonUnitSummary,
  RecallCard,
  RecallCardKey,
  RecallDeck,
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

// ---------- Lessons (content/lessons) ----------

/** A unit as stored (Korean). `lessonTitles` is derived from the lesson rows by the catalog. */
export interface StoredLessonUnit extends Omit<LessonUnitSummary, "lessonTitles"> {
  readonly source: ContentSource;
}

/** Answer and Korean feedback of one lesson exercise (column `answers`, keyed by exercise id). */
export interface StoredLessonAnswer {
  readonly answer: number;
  readonly correctFeedback: string;
  /** Wrong choice index ("0", "1", ...) -> explanation. */
  readonly choiceFeedback: Readonly<Record<string, string>>;
}

export interface UnitText {
  readonly title?: string;
}

/** Translated texts of one block (<lesson>.<l>.yaml `blocks.<id>`). `code` may differ from the Korean code. */
export interface LessonBlockText {
  readonly markdown?: string;
  readonly prompt?: string;
  readonly code?: string;
  /** Same length and order as the Korean choices (checked by the loader). */
  readonly choices?: readonly string[];
  readonly correctFeedback?: string;
  readonly choiceFeedback?: Readonly<Record<string, string>>;
}

export interface LessonText {
  readonly title?: string;
  /** Block id -> texts. */
  readonly blocks?: Readonly<Record<string, LessonBlockText>>;
}

export function localizeUnit(unit: StoredLessonUnit, t: UnitText | undefined, lessonTitles: readonly string[]): LessonUnitSummary {
  return {
    id: unit.id,
    title: t?.title ?? unit.title,
    order: unit.order,
    level: unit.level,
    skill: unit.skill,
    prerequisites: unit.prerequisites,
    lessonIds: unit.lessonIds,
    lessonTitles,
    locales: unit.locales,
  };
}

/** Learner view: rebuilt field by field, so nothing but the contract fields (no answers, no feedback) leaves. */
export function localizeLesson(lesson: Lesson, t: LessonText | undefined): Lesson {
  const block = (b: LessonBlock): LessonBlock => {
    const bt = own(t?.blocks, b.id);
    if (b.kind === "prose") return { kind: "prose", id: b.id, markdown: bt?.markdown ?? b.markdown };
    const code = bt?.code ?? b.code;
    const choices = bt?.choices?.length === b.choices.length ? bt.choices : b.choices;
    return {
      kind: "exercise",
      id: b.id,
      type: b.type,
      prompt: bt?.prompt ?? b.prompt,
      ...(code === undefined ? {} : { code }),
      choices,
    };
  };
  return { id: lesson.id, unitId: lesson.unitId, title: t?.title ?? lesson.title, tags: lesson.tags, blocks: lesson.blocks.map(block) };
}

export function localizeLessonAnswer(
  ids: { readonly unitId: string; readonly lessonId: string; readonly exerciseId: string },
  stored: StoredLessonAnswer,
  t: LessonText | undefined,
): LessonAnswerKey {
  const bt = own(t?.blocks, ids.exerciseId);
  const choiceFeedback: Record<number, string> = {};
  for (const [index, text] of Object.entries(stored.choiceFeedback)) choiceFeedback[Number(index)] = own(bt?.choiceFeedback, index) ?? text;
  return {
    unitId: ids.unitId,
    lessonId: ids.lessonId,
    exerciseId: ids.exerciseId,
    answer: stored.answer,
    correctFeedback: bt?.correctFeedback ?? stored.correctFeedback,
    choiceFeedback,
  };
}

// ---------- Recall cards (content/recall) ----------

/** A deck as stored (Korean). `cardCount` is derived from the card rows by the catalog. */
export type StoredRecallDeck = Omit<RecallDeck, "cardCount">;

export interface RecallDeckText {
  readonly title?: string;
  readonly description?: string;
}

/**
 * Translated texts of one card (<card-id>.<l>.yaml without the keys that are never translated). `example` and
 * `definitions` differ from the Korean code only in comments (checked by the loader).
 */
export interface RecallCardText {
  readonly title?: string;
  readonly summary?: string;
  readonly example?: string;
  readonly definitions?: string;
  readonly recognize?: {
    readonly prompt?: string;
    /** Same length and order as the Korean choices (checked by the loader). */
    readonly choices?: readonly string[];
    readonly feedback?: { readonly correct?: string; readonly choices?: Readonly<Record<string, string>> };
  };
  readonly cloze?: { readonly prompt?: string };
  readonly predict?: { readonly prompt?: string };
  readonly produce?: { readonly prompt?: string; readonly hint?: string };
}

export function localizeRecallDeck(deck: StoredRecallDeck, t: RecallDeckText | undefined, cardCount: number): RecallDeck {
  return {
    id: deck.id,
    title: t?.title ?? deck.title,
    description: t?.description ?? deck.description,
    order: deck.order,
    cardCount,
  };
}

/** Learner view: rebuilt field by field, so nothing but the contract fields (no answers, checks, reference) leaves. */
export function localizeRecallCard(card: RecallCard, t: RecallCardText | undefined): RecallCard {
  const choices = t?.recognize?.choices?.length === card.recognize.choices.length ? t.recognize.choices : card.recognize.choices;
  const definitions = card.definitions === undefined ? undefined : (t?.definitions ?? card.definitions);
  const hint = card.produce.hint === undefined ? undefined : (t?.produce?.hint ?? card.produce.hint);
  return {
    id: card.id,
    deckId: card.deckId,
    title: t?.title ?? card.title,
    topic: card.topic,
    summary: t?.summary ?? card.summary,
    example: t?.example ?? card.example,
    imports: card.imports,
    ...(definitions === undefined ? {} : { definitions }),
    ...(card.signature === undefined ? {} : { signature: card.signature }),
    ...(card.frequency === undefined ? {} : { frequency: card.frequency }),
    recognize: { prompt: t?.recognize?.prompt ?? card.recognize.prompt, choices },
    cloze: { prompt: t?.cloze?.prompt ?? card.cloze.prompt, code: card.cloze.code },
    ...(card.predict === undefined
      ? {}
      : { predict: { prompt: t?.predict?.prompt ?? card.predict.prompt, code: card.predict.code } }),
    produce: {
      prompt: t?.produce?.prompt ?? card.produce.prompt,
      header: card.produce.header,
      ...(hint === undefined ? {} : { hint }),
    },
    locales: card.locales,
  };
}

/** Answer key with feedback in the locale (per choice index, Korean fallback); answers and code never change. */
export function localizeRecallCardKey(key: RecallCardKey, t: RecallCardText | undefined): RecallCardKey {
  const choiceFeedback: Record<number, string> = {};
  for (const [index, text] of Object.entries(key.recognize.choiceFeedback)) {
    choiceFeedback[Number(index)] = own(t?.recognize?.feedback?.choices, index) ?? text;
  }
  return {
    cardId: key.cardId,
    recognize: {
      answer: key.recognize.answer,
      correctFeedback: t?.recognize?.feedback?.correct ?? key.recognize.correctFeedback,
      choiceFeedback,
    },
    cloze: { answers: key.cloze.answers, expected: key.cloze.expected },
    ...(key.predict === undefined ? {} : { predict: { expected: key.predict.expected } }),
    produce: {
      checks: key.produce.checks,
      expected: key.produce.expected,
      mustUse: key.produce.mustUse,
      reference: key.produce.reference,
    },
  };
}
