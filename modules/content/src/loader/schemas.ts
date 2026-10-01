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
