/** zod schemas for the authored files (see content/README.md). Unknown keys are rejected to catch typos. */
import { isLanguage } from "@fp/kernel";
import { z } from "zod";

export const KEBAB_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const SNAKE_NAME = /^[a-z][a-z0-9_]*$/;

const kebabId = z.string().regex(KEBAB_ID, "must be lowercase kebab-case ([a-z0-9]+(-[a-z0-9]+)*)");
const snakeName = z.string().regex(SNAKE_NAME, "must be a snake_case Gleam name");
const text = z.string().trim().min(1, "must not be empty");

export const sourceSchema = z
  .strictObject({
    kind: z.enum(["original", "exercism"]),
    license: text.optional(),
    url: text.optional(),
    upstream: text.optional(),
    notes: text.optional(),
  })
  .superRefine((s, ctx) => {
    if (s.kind === "original") return;
    if (!s.license) ctx.addIssue({ code: "custom", path: ["license"], message: "required for non-original content" });
    if (!s.upstream) ctx.addIssue({ code: "custom", path: ["upstream"], message: "required for non-original content" });
  });

const automatedCheckSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("forbid_pattern"), pattern: text, message: text }),
  z.strictObject({ kind: z.literal("require_pattern"), pattern: text, message: text }),
  z.strictObject({ kind: z.literal("max_function_lines"), max: z.number().int().positive() }),
]);

const rubricItemSchema = z.strictObject({
  id: text,
  title: text,
  description: text,
  automatedCheck: automatedCheckSchema.optional(),
});

export const skillsFileSchema = z.strictObject({
  skills: z.array(
    z.strictObject({
      id: kebabId,
      name: text,
      track: z.enum(["basics", "core", "algorithm"]),
      order: z.number().int(),
      description: text,
      prerequisites: z.array(kebabId).default([]),
    }),
  ),
});

/** Keys a family defines and a variant may override. */
const overridable = {
  title: text,
  primarySkill: kebabId,
  secondarySkills: z.array(kebabId),
  contextTags: z.array(text),
  source: sourceSchema,
  conceptNotes: z.array(kebabId),
  theoryTopics: z.array(kebabId),
  rubric: z.array(rubricItemSchema),
};

export const familySchema = z.strictObject({
  ...overridable,
  secondarySkills: overridable.secondarySkills.optional(),
  contextTags: overridable.contextTags.optional(),
  conceptNotes: overridable.conceptNotes.optional(),
  theoryTopics: overridable.theoryTopics.optional(),
  rubric: overridable.rubric.optional(),
});
export type FamilyYaml = z.infer<typeof familySchema>;

export const HINT_KINDS = ["question", "concept", "approach", "partial_code", "explanation"] as const;

export const exerciseSchema = z.strictObject({
  kind: z.enum(["implement", "fix", "refactor", "predict"]),
  format: z.enum(["drill", "challenge"]),
  module: snakeName.optional(),
  difficulty: z.number().int().min(0).max(4000),
  estimatedMinutes: z.number().int().positive(),
  limits: z
    .strictObject({
      timeMs: z.number().int().positive().default(10000),
      memoryMb: z.number().int().positive().default(256),
    })
    .optional(),
  tests: z
    .array(
      z.strictObject({
        fn: snakeName,
        name: text,
        visibility: z.enum(["public", "hidden"]),
        errorTag: text.optional(),
        requirements: z.array(text).optional(),
      }),
    )
    .optional(),
  requirements: z.array(z.strictObject({ id: text, description: text })).optional(),
  hints: z.array(z.strictObject({ level: z.number().int(), kind: z.enum(HINT_KINDS), text })),
  wrong: z
    .array(z.strictObject({ key: kebabId, mustFail: z.array(snakeName).min(1), errorTag: text.optional() }))
    .optional(),
  performance: z
    .strictObject({
      module: z.string().regex(/^[a-z][a-z0-9_]*(\/[a-z][a-z0-9_]*)*$/, "must be a Gleam module path"),
      sizes: z.array(z.number().int().positive()).min(1),
      maxCostRatio: z.number().positive(),
      referenceCost: z.array(z.number().nonnegative()).optional(),
    })
    .optional(),
  predict: z.strictObject({ code: text, acceptedAnswers: z.array(text).min(1) }).optional(),
  title: overridable.title.optional(),
  primarySkill: overridable.primarySkill.optional(),
  secondarySkills: overridable.secondarySkills.optional(),
  contextTags: overridable.contextTags.optional(),
  source: overridable.source.optional(),
  conceptNotes: overridable.conceptNotes.optional(),
  theoryTopics: overridable.theoryTopics.optional(),
  rubric: overridable.rubric.optional(),
});
export type ExerciseYaml = z.infer<typeof exerciseSchema>;

export const conceptFrontMatterSchema = z.strictObject({
  id: kebabId,
  title: text,
  language: z.string().refine(isLanguage, "unsupported language"),
  source: sourceSchema,
});

export const theoryFrontMatterSchema = z.strictObject({
  id: kebabId,
  title: text,
  level: z.enum(["basic", "advanced"]),
  relatedSkills: z.array(kebabId).default([]),
  furtherReading: z
    .array(z.strictObject({ text, url: text.optional(), verified: z.boolean().default(false) }))
    .default([]),
});

// Localization overlays (<name>.<locale>.<ext>). Keys of the records are checked against the Korean source.

const rubricTextSchema = z.strictObject({ title: text.optional(), description: text.optional(), message: text.optional() });
const textRecord = z.record(z.string(), text);

export const skillsOverlaySchema = z.strictObject({
  skills: z.record(z.string(), z.strictObject({ name: text.optional(), description: text.optional() })).default({}),
});

export const familyOverlaySchema = z.strictObject({
  title: text.optional(),
  rubric: z.record(z.string(), rubricTextSchema).optional(),
});
export type FamilyOverlayYaml = z.infer<typeof familyOverlaySchema>;

export const exerciseOverlaySchema = z.strictObject({
  title: text.optional(),
  tests: textRecord.optional(),
  requirements: textRecord.optional(),
  hints: textRecord.optional(),
  rubric: z.record(z.string(), rubricTextSchema).optional(),
});
export type ExerciseOverlayYaml = z.infer<typeof exerciseOverlaySchema>;

/** Front matter of a translated note: only the id (equal to the Korean note's) and the translated title. */
export const noteOverlayFrontMatterSchema = z.strictObject({ id: kebabId, title: text.optional() });

/** Formats zod issues as "a.b: message" lines. */
export function formatZodIssues(error: z.ZodError): string[] {
  return error.issues.map((i) => (i.path.length > 0 ? `${i.path.join(".")}: ${i.message}` : i.message));
}

// Lessons (content/lessons, docs/design/lessons.md).

export const unitSchema = z.strictObject({
  title: text,
  order: z.number().int(),
  level: z.number().int().min(1).max(4),
  skill: kebabId,
  prerequisites: z.array(kebabId).default([]),
  lessons: z.array(kebabId).min(1, "a unit needs at least one lesson"),
  source: sourceSchema,
});
export type UnitYaml = z.infer<typeof unitSchema>;

/** Keys of `feedback.choices` are choice indices ("0", "1", ...); YAML integer keys arrive as the same strings. */
const indexRecord = z.record(z.string().regex(/^(0|[1-9][0-9]*)$/, "must be a choice index (0, 1, ...)"), text);

const proseBlockSchema = z.strictObject({ prose: kebabId, markdown: text });
const exerciseBlockSchema = z.strictObject({
  exercise: kebabId,
  type: z.enum(["choice", "predict"]),
  prompt: text,
  code: text.optional(),
  choices: z.array(text).min(2, "an exercise needs at least two choices"),
  answer: z.number().int().nonnegative(),
  feedback: z.strictObject({ correct: text, choices: indexRecord.default({}) }),
});
export type ProseBlockYaml = z.infer<typeof proseBlockSchema>;
export type ExerciseBlockYaml = z.infer<typeof exerciseBlockSchema>;

/** A block is a prose block when it has a `prose` key, otherwise an exercise block (better error messages than a union). */
export const lessonBlockSchema = z.unknown().transform((raw, ctx): ProseBlockYaml | ExerciseBlockYaml => {
  const isProse = typeof raw === "object" && raw !== null && "prose" in raw;
  const r = (isProse ? proseBlockSchema : exerciseBlockSchema).safeParse(raw);
  if (r.success) return r.data;
  // Re-raise as-is (keeps "unrecognized_keys", so validate() can drop unknown keys and continue).
  for (const issue of r.error.issues) ctx.addIssue(issue as Parameters<typeof ctx.addIssue>[0]);
  return z.NEVER;
});

export const lessonSchema = z.strictObject({
  title: text,
  tags: z.array(text).default([]),
  blocks: z.array(lessonBlockSchema).min(1, "a lesson needs at least one block"),
});
export type LessonYaml = z.infer<typeof lessonSchema>;

export const unitOverlaySchema = z.strictObject({ title: text.optional() });

export const lessonBlockOverlaySchema = z.strictObject({
  markdown: text.optional(),
  prompt: text.optional(),
  code: text.optional(),
  choices: z.array(text).optional(),
  feedback: z.strictObject({ correct: text.optional(), choices: indexRecord.optional() }).optional(),
  /** Never allowed; declared so the loader can report it with a clear message instead of "unknown key". */
  answer: z.unknown().optional(),
});
export type LessonBlockOverlayYaml = z.infer<typeof lessonBlockOverlaySchema>;

export const lessonOverlaySchema = z.strictObject({
  title: text.optional(),
  blocks: z.record(z.string(), lessonBlockOverlaySchema).default({}),
});
export type LessonOverlayYaml = z.infer<typeof lessonOverlaySchema>;

// Recall cards (content/recall, docs/design/recall.md).

export const recallDecksSchema = z.strictObject({
  decks: z.array(z.strictObject({ id: kebabId, title: text, description: text, order: z.number().int() })),
});
export type RecallDecksYaml = z.infer<typeof recallDecksSchema>;

export const recallDecksOverlaySchema = z.strictObject({
  decks: z.record(z.string(), z.strictObject({ title: text.optional(), description: text.optional() })).default({}),
});

/** Values are compared with `string.inspect` output, so they must be YAML strings ("6", not 6). */
const inspected = z.string("must be a string (quote it: \"6\")").trim().min(1, "must not be empty");
const code = z.string().trim().min(1, "must not be empty");

export const recallCardSchema = z.strictObject({
  title: text,
  topic: text,
  order: z.number().int(),
  summary: text,
  example: code,
  imports: z.array(text).default([]),
  definitions: code.optional(),
  signature: text.optional(),
  frequency: z.number().int().nonnegative().optional(),
  recognize: z.strictObject({
    prompt: text,
    choices: z.array(text).min(3, "recognize needs 3-4 choices").max(4, "recognize needs 3-4 choices"),
    answer: z.number().int().nonnegative(),
    feedback: z.strictObject({ correct: text, choices: indexRecord.default({}) }),
  }),
  cloze: z.strictObject({
    prompt: text,
    code,
    answers: z.array(z.string("must be a string").trim().min(1, "must not be empty")).min(1, "at least one accepted fill"),
    expected: inspected,
  }),
  predict: z.strictObject({ prompt: text, code, expected: inspected }).optional(),
  produce: z.strictObject({
    prompt: text,
    header: text,
    checks: code,
    expected: inspected,
    mustUse: z.array(text).default([]),
    reference: code,
    hint: text.optional(),
  }),
});
export type RecallCardYaml = z.infer<typeof recallCardSchema>;

/**
 * Keys that exist in a Korean card but are never translated. Declared so the loader reports them with a clear message
 * instead of "unknown key".
 */
const never = z.unknown().optional();

export const recallCardOverlaySchema = z.strictObject({
  title: text.optional(),
  summary: text.optional(),
  /** Same code as the Korean example; only comments differ. */
  example: code.optional(),
  definitions: code.optional(),
  recognize: z
    .strictObject({
      prompt: text.optional(),
      choices: z.array(text).optional(),
      feedback: z.strictObject({ correct: text.optional(), choices: indexRecord.optional() }).optional(),
      answer: never,
    })
    .optional(),
  cloze: z.strictObject({ prompt: text.optional(), code: never, answers: never, expected: never }).optional(),
  predict: z.strictObject({ prompt: text.optional(), code: never, expected: never }).optional(),
  produce: z
    .strictObject({
      prompt: text.optional(),
      hint: text.optional(),
      header: never,
      checks: never,
      expected: never,
      mustUse: never,
      reference: never,
    })
    .optional(),
  imports: never,
});
export type RecallCardOverlayYaml = z.infer<typeof recallCardOverlaySchema>;
