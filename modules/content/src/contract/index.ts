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
  SkillId,
  TheoryTopicId,
} from "@fp/kernel";

export type SkillTrack = "core" | "algorithm";

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

/** Read API used by other modules. Returns only the latest version of each exercise unless an id pins one. */
export interface ContentCatalog {
  listSkills(): Promise<readonly Skill[]>;
  getSkill(id: SkillId): Promise<Skill | null>;
  listExercises(filter?: ExerciseFilter): Promise<readonly ExerciseSummary[]>;
  /** Accepts any version id, including superseded ones (old submissions stay reproducible). */
  getExercise(id: ExerciseId): Promise<ExerciseDetail | null>;
  getGradingSpec(id: ExerciseId): Promise<GradingSpec | null>;
  getReferenceMaterial(id: ExerciseId): Promise<ReferenceMaterial | null>;
  getConceptNotes(ids: readonly ConceptNoteId[]): Promise<readonly ConceptNote[]>;
  getTheoryTopics(ids: readonly TheoryTopicId[]): Promise<readonly TheoryTopic[]>;
  listTheoryTopics(): Promise<readonly TheoryTopic[]>;
  currentBundle(): Promise<BundleInfo | null>;
}

export const CONTENT_EVENTS = {
  bundleImported: "content.bundle_imported",
} as const;

export interface BundleImportedPayload {
  readonly bundleId: string;
  readonly contentHash: string;
  readonly exerciseIds: readonly ExerciseId[];
}
