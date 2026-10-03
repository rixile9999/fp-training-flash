/**
 * Content module contract: the problem DB (skills, exercises, notes, theory topics, grading specs).
 * Other modules may import only this file. Content is authored as files under /content and imported
 * as immutable, versioned bundles (see /content/README.md).
 */
import type {
  ConceptNoteId,
  ExerciseId,
  FamilyId,
  Language,
  Locale,
  SkillId,
  TheoryTopicId,
} from "@fp/kernel";

/** basics: Gleam language lessons (content/lessons); core: FP skills; algorithm: algorithm track. */
export type SkillTrack = "basics" | "core" | "algorithm";

export interface Skill {
  readonly id: SkillId;
  readonly name: string;
  readonly description: string;
  readonly track: SkillTrack;
  /** Skills that should reach a minimum rating before this one is recommended. */
  readonly prerequisites: readonly SkillId[];
  /** Order in the learning path; lower comes first. */
  readonly order: number;
}

/**
 * - implement: write code from a spec.
 * - fix: starter code contains a bug; make tests pass.
 * - refactor: starter passes tests; restructure to meet rubric/constraints (tests keep passing).
 * - predict: answer what an expression evaluates to (no code execution needed; graded by answer match).
 */
export type ExerciseKind = "implement" | "fix" | "refactor" | "predict";

/** focus: regular short drill. challenge: long, optional, outside the 15-minute session budget. */
export type ExerciseFormat = "drill" | "challenge";

export interface ContentSource {
  readonly kind: "original" | "exercism";
  /** Required for non-original content, e.g. "MIT, Copyright (c) 2021 Exercism". */
  readonly license?: string;
  readonly url?: string;
  /** Upstream identifier, e.g. Exercism slug and commit. */
  readonly upstream?: string;
  readonly notes?: string;
}

export interface ExerciseSummary {
  readonly id: ExerciseId;
  readonly familyId: FamilyId;
  readonly variantKey: string;
  readonly version: number;
  readonly language: Language;
  readonly kind: ExerciseKind;
  readonly format: ExerciseFormat;
  readonly title: string;
  readonly primarySkill: SkillId;
  readonly secondarySkills: readonly SkillId[];
  /** Initial difficulty on the Elo scale (roughly 800-2000, 1200 = entry level). */
  readonly difficulty: number;
  readonly estimatedMinutes: number;
  /** Business/context tags used to avoid repeating the same context, e.g. ["orders"]. */
  readonly contextTags: readonly string[];
  readonly source: ContentSource;
  /** Locales with a complete translation of this exercise (always includes "ko"). */
  readonly locales: readonly Locale[];
}

export type HintKind = "question" | "concept" | "approach" | "partial_code" | "explanation";

export interface Hint {
  /** 1..5, revealed in order. */
  readonly level: 1 | 2 | 3 | 4 | 5;
  readonly kind: HintKind;
  readonly markdown: string;
}

export interface RubricItem {
  /** Stable id such as "R-02"; coaching must cite these ids. */
  readonly id: string;
  readonly title: string;
  readonly description: string;
  /** Optional deterministic check performed by grading (no LLM). */
  readonly automatedCheck?: AutomatedCheck;
}

export type AutomatedCheck =
  | { readonly kind: "forbid_pattern"; readonly pattern: string; readonly message: string }
  | { readonly kind: "require_pattern"; readonly pattern: string; readonly message: string }
  | { readonly kind: "max_function_lines"; readonly max: number };

export interface PublicTestView {
  readonly id: string;
  readonly name: string;
  /** Gleam source of the test body, shown to the learner. */
  readonly code: string;
}

export interface FileContent {
  /** Path relative to the project root, e.g. "src/coupon.gleam". */
  readonly path: string;
  readonly content: string;
}

export interface PredictSpec {
  /** Code snippet the learner reads. */
  readonly code: string;
  /** Accepted answers after whitespace normalisation. */
  readonly acceptedAnswers: readonly string[];
}

/**
 * Learner-facing exercise. Never contains hidden tests or reference solutions.
 * It DOES contain every hint's markdown and, for predict exercises, `predict.acceptedAnswers`: whoever sends it to
 * a client (apps/api) must strip hints the learner has not revealed and the accepted answers.
 */
export interface ExerciseDetail extends ExerciseSummary {
  readonly promptMarkdown: string;
  /** Module name of the learner's file, e.g. "coupon" -> src/coupon.gleam. */
  readonly moduleName: string;
  readonly starterFiles: readonly FileContent[];
  readonly publicTests: readonly PublicTestView[];
  readonly hints: readonly Hint[];
  readonly rubric: readonly RubricItem[];
  readonly conceptNoteIds: readonly ConceptNoteId[];
  readonly theoryTopicIds: readonly TheoryTopicId[];
  readonly predict?: PredictSpec;
}

export type TestVisibility = "public" | "hidden";

export interface TestCaseSpec {
  readonly id: string;
  /** Gleam function name in the test module, e.g. "keeps_other_orders_test". */
  readonly functionName: string;
  readonly name: string;
  readonly visibility: TestVisibility;
  /** Error tag recorded when this test fails, e.g. "drops_items_with_filter". */
  readonly errorTag?: string;
  /** Requirement ids this test evidences (see GradingSpec.requirements). */
  readonly requirementIds?: readonly string[];
}

export interface RequirementSpec {
  readonly id: string;
  readonly description: string;
}

export interface PerformanceSpec {
  /** Input sizes, ascending. */
  readonly sizes: readonly number[];
  /**
   * Module (in the test files) exposing `pub fn setup(size: Int) -> a` and `pub fn run(input: a) -> b`
   * where `run` calls the learner's code.
   */
  readonly perfModule: string;
  /** Allowed ratio of learner cost to reference cost at the largest size before "too_slow". */
  readonly maxCostRatio: number;
  /** Reference cost per size measured by content CI (BEAM reductions). Empty until measured. */
  readonly referenceCost: readonly number[];
}

/** Everything grading needs to evaluate a submission. Internal to grading; never sent to learners. */
export interface GradingSpec {
  readonly exerciseId: ExerciseId;
  readonly language: Language;
  readonly kind: ExerciseKind;
  readonly moduleName: string;
  /** Test modules and support modules placed under the project's test/ directory. */
  readonly testFiles: readonly FileContent[];
  /** Extra non-learner source files placed under src/ (e.g. shared types), may be empty. */
  readonly supportFiles: readonly FileContent[];
  readonly tests: readonly TestCaseSpec[];
  readonly requirements: readonly RequirementSpec[];
  readonly rubric: readonly RubricItem[];
  readonly performance?: PerformanceSpec;
  readonly predict?: PredictSpec;
  readonly limits: { readonly timeMs: number; readonly memoryMb: number };
}

export interface ConceptNote {
  readonly id: ConceptNoteId;
  readonly language: Language;
  readonly title: string;
  readonly markdown: string;
  readonly source: ContentSource;
}

export interface Citation {
  readonly text: string;
  readonly url?: string;
  /** False until a human confirmed the bibliographic data. */
  readonly verified: boolean;
}

export interface TheoryTopic {
  readonly id: TheoryTopicId;
  readonly title: string;
  readonly level: "basic" | "advanced";
  readonly markdown: string;
  readonly relatedSkills: readonly SkillId[];
  readonly furtherReading: readonly Citation[];
}

export interface WrongSolution {
  readonly key: string;
  readonly files: readonly FileContent[];
  /** Test ids this wrong answer must fail (content CI verifies). */
  readonly mustFail: readonly string[];
  readonly errorTag?: string;
}

/** Reference material for coaching and content CI only. Never shown to learners before they ask for the explanation. */
export interface ReferenceMaterial {
  readonly exerciseId: ExerciseId;
  readonly solutionFiles: readonly FileContent[];
  readonly explanationMarkdown: string;
  readonly wrongSolutions: readonly WrongSolution[];
}

export interface ExerciseFilter {
  readonly language?: Language;
  readonly skill?: SkillId;
  readonly kind?: ExerciseKind;
  readonly format?: ExerciseFormat;
  readonly familyId?: FamilyId;
}

export interface BundleInfo {
  readonly bundleId: string;
  readonly contentHash: string;
  readonly importedAt: string;
  readonly exerciseCount: number;
}

/**
 * Read API used by other modules. Returns only the latest version of each exercise unless an id pins one.
 * Every learner-facing text is returned in `locale` (default "ko"); a missing translation falls back to Korean
 * field by field. Code (starter, tests, solutions) is the same in every locale, except that a variant may provide
 * a localized starter whose comments are translated.
 */
export interface ContentCatalog {
  listSkills(locale?: Locale): Promise<readonly Skill[]>;
  getSkill(id: SkillId, locale?: Locale): Promise<Skill | null>;
  listExercises(filter?: ExerciseFilter, locale?: Locale): Promise<readonly ExerciseSummary[]>;
  /** Accepts any version id, including superseded ones (old submissions stay reproducible). */
  getExercise(id: ExerciseId, locale?: Locale): Promise<ExerciseDetail | null>;
  /** Test names, requirement descriptions and rubric texts in `locale`; test code is locale-independent. */
  getGradingSpec(id: ExerciseId, locale?: Locale): Promise<GradingSpec | null>;
  getReferenceMaterial(id: ExerciseId, locale?: Locale): Promise<ReferenceMaterial | null>;
  getConceptNotes(ids: readonly ConceptNoteId[], locale?: Locale): Promise<readonly ConceptNote[]>;
  getTheoryTopics(ids: readonly TheoryTopicId[], locale?: Locale): Promise<readonly TheoryTopic[]>;
  listTheoryTopics(locale?: Locale): Promise<readonly TheoryTopic[]>;
  listLessonUnits(locale?: Locale): Promise<readonly LessonUnitSummary[]>;
  getLesson(unitId: string, lessonId: string, locale?: Locale): Promise<Lesson | null>;
  /** Server-side only (lessons module): answer and feedback of one lesson exercise. */
  getLessonAnswer(unitId: string, lessonId: string, exerciseId: string, locale?: Locale): Promise<LessonAnswerKey | null>;
  listRecallDecks(locale?: Locale): Promise<readonly RecallDeck[]>;
  /** Cards of one deck (or all decks), in authoring order. */
  listRecallCards(deckId?: string, locale?: Locale): Promise<readonly RecallCard[]>;
  getRecallCard(cardId: string, locale?: Locale): Promise<RecallCard | null>;
  /** Server-side only (recall module). Feedback texts are localized; answers and code are locale-independent. */
  getRecallCardKey(cardId: string, locale?: Locale): Promise<RecallCardKey | null>;
  currentBundle(): Promise<BundleInfo | null>;
}

// ---------- Lessons (content/lessons, docs/design/lessons.md) ----------

export interface LessonUnitSummary {
  readonly id: string;
  readonly title: string;
  readonly order: number;
  /** 1-4 */
  readonly level: number;
  readonly skill: SkillId;
  /** Unit ids. */
  readonly prerequisites: readonly string[];
  readonly lessonIds: readonly string[];
  readonly lessonTitles: readonly string[];
  /** Locales with every lesson of the unit translated (always includes "ko"). */
  readonly locales: readonly Locale[];
}

export type LessonBlock =
  | { readonly kind: "prose"; readonly id: string; readonly markdown: string }
  | {
      readonly kind: "exercise";
      readonly id: string;
      /** choice: a question about a fact; predict: what does this code evaluate to. Both are answered by choice. */
      readonly type: "choice" | "predict";
      readonly prompt: string;
      readonly code?: string;
      readonly choices: readonly string[];
    };

/** Learner-facing lesson. Never contains answers or feedback (see getLessonAnswer). */
export interface Lesson {
  readonly id: string;
  readonly unitId: string;
  readonly title: string;
  readonly tags: readonly string[];
  readonly blocks: readonly LessonBlock[];
}

export interface LessonAnswerKey {
  readonly unitId: string;
  readonly lessonId: string;
  readonly exerciseId: string;
  readonly answer: number;
  readonly correctFeedback: string;
  /** Explanation per wrong choice index. */
  readonly choiceFeedback: Readonly<Record<number, string>>;
}

// ---------- Recall cards (content/recall, docs/design/recall.md) ----------

export type RecallStage = "recognize" | "cloze" | "produce";

export interface RecallDeck {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly order: number;
  readonly cardCount: number;
}

/** Learner-facing card. Never contains answers, expected values, checks or the reference body. */
export interface RecallCard {
  readonly id: string;
  readonly deckId: string;
  readonly title: string;
  /** Module (e.g. "gleam/list") or a syntax topic id. */
  readonly topic: string;
  readonly summary: string;
  /** One expression with a `// -> value` comment. */
  readonly example: string;
  readonly imports: readonly string[];
  readonly signature?: string;
  readonly frequency?: number;
  readonly recognize: { readonly prompt: string; readonly choices: readonly string[] };
  /** `code` contains exactly one "____" blank. */
  readonly cloze: { readonly prompt: string; readonly code: string };
  readonly predict?: { readonly prompt: string; readonly code: string };
  /** The learner writes the body of `header`. */
  readonly produce: { readonly prompt: string; readonly header: string; readonly hint?: string };
  /** Locales with a complete translation (always includes "ko"). */
  readonly locales: readonly Locale[];
}

/** Server-side answer key (recall module only). */
export interface RecallCardKey {
  readonly cardId: string;
  readonly recognize: {
    readonly answer: number;
    readonly correctFeedback: string;
    readonly choiceFeedback: Readonly<Record<number, string>>;
  };
  readonly cloze: { readonly answers: readonly string[]; readonly expected: string };
  readonly predict?: { readonly expected: string };
  readonly produce: {
    readonly checks: string;
    readonly expected: string;
    readonly mustUse: readonly string[];
    readonly reference: string;
  };
}

export const CONTENT_EVENTS = {
  bundleImported: "content.bundle_imported",
} as const;

export interface BundleImportedPayload {
  readonly bundleId: string;
  readonly contentHash: string;
  readonly exerciseIds: readonly ExerciseId[];
}
