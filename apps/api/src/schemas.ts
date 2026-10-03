/** zod request schemas mirroring the DTOs in @fp/api-contract. */
import { z } from "zod";
import { asId, isLanguage, isLocale, SUPPORTED_LOCALES } from "@fp/kernel";
import type { ExerciseId, FamilyId, Language, Locale, SessionId, SkillId, SubmissionId } from "@fp/kernel";
import type { ApiMessageId } from "./messages.ts";

export const MAX_CODE_CHARS = 100_000;
export const MAX_CHAT_MESSAGES = 40;
export const MAX_CHAT_MESSAGE_CHARS = 8_000;

const idString = z.string().trim().min(1).max(300);
export const exerciseIdSchema = idString.transform((v) => asId<ExerciseId>(v));
const sessionIdSchema = idString.transform((v) => asId<SessionId>(v));
const submissionIdSchema = idString.transform((v) => asId<SubmissionId>(v));
const skillIdSchema = idString.transform((v) => asId<SkillId>(v));
const familyIdSchema = idString.transform((v) => asId<FamilyId>(v));

/** Custom-check params read by `zodErrorMap` in http.ts, which renders the message in the request locale. */
const messageParams = (messageId: ApiMessageId, messageParams: Record<string, string> = {}) => ({
  params: { messageId, messageParams },
});

export const languageSchema = z.custom<Language>(
  (v) => typeof v === "string" && isLanguage(v),
  messageParams("unsupportedLanguage"),
);

export const localeSchema = z.custom<Locale>(
  (v) => typeof v === "string" && isLocale(v),
  messageParams("unsupportedLocale", { supported: SUPPORTED_LOCALES.join(", ") }),
);

const code = z.string().max(MAX_CODE_CHARS);

export const devLoginSchema = z.object({
  displayName: z.string().trim().min(1).max(40),
  locale: localeSchema.optional(),
});

export const updateMeSchema = z.object({ locale: localeSchema });

export const issueTokenSchema = z.object({
  label: z.string().trim().min(1).max(80),
});

export const trialRunSchema = z.object({ code });

export const submitSchema = z.object({
  exerciseId: exerciseIdSchema,
  code,
  idempotencyKey: z.string().trim().min(1).max(200),
  sessionId: sessionIdSchema.optional(),
});

export const revealHintSchema = z.object({
  level: z.number().int().min(1).max(5),
});

export const noteOpenedSchema = z.object({
  kind: z.enum(["concept", "theory"]),
  noteId: idString,
});

export const chatSchema = z.object({
  exerciseId: exerciseIdSchema,
  code: code.optional(),
  submissionId: submissionIdSchema.optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(MAX_CHAT_MESSAGE_CHARS),
      }),
    )
    .min(1)
    .max(MAX_CHAT_MESSAGES),
});

export const startSessionSchema = z.object({
  language: languageSchema,
  targetMinutes: z.number().int().min(5).max(120),
  focusSkill: skillIdSchema.optional(),
  includeChallenge: z.boolean().optional(),
});

export const exerciseFilterSchema = z.object({
  language: languageSchema.optional(),
  skill: skillIdSchema.optional(),
  kind: z.enum(["implement", "fix", "refactor", "predict"]).optional(),
  format: z.enum(["drill", "challenge"]).optional(),
  familyId: familyIdSchema.optional(),
});

export const languageQuerySchema = z.object({ language: languageSchema });

export const recommendQuerySchema = z.object({
  language: languageSchema,
  skill: skillIdSchema.optional(),
});

// ---------- lessons (course, checkpoints, placement) ----------

export const MAX_PATH_ID_CHARS = 128;
export const MAX_CHOICE_INDEX = 31;
export const MAX_QUIZ_ANSWERS = 100;

/** Unit, lesson, lesson-exercise and quiz ids: one path segment (letters, digits, ".", "_", "-"). */
const PATH_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
export const pathIdSchema = z
  .string()
  .refine((v) => v.length <= MAX_PATH_ID_CHARS && PATH_SEGMENT.test(v), messageParams("invalidPathId"));

export const unitParamsSchema = z.object({ unitId: pathIdSchema });
export const lessonParamsSchema = z.object({ unitId: pathIdSchema, lessonId: pathIdSchema });
export const quizParamsSchema = z.object({ quizId: pathIdSchema });

const choiceIndex = z.number().int().min(0).max(MAX_CHOICE_INDEX);

export const lessonAnswerSchema = z.object({
  exerciseId: pathIdSchema,
  choice: choiceIndex.nullable(),
  giveUp: z.boolean().optional(),
});

/** Quiz item ids may embed exercise ids ("/", "@"), so keys only get a length bound. zod drops "__proto__" keys. */
const quizItemKey = z.string().min(1).max(300);

export const quizSubmitSchema = z.object({
  answers: z
    .record(quizItemKey, choiceIndex.nullable())
    .refine(
      (a) => Object.keys(a).length <= MAX_QUIZ_ANSWERS,
      messageParams("tooManyAnswers", { max: String(MAX_QUIZ_ANSWERS) }),
    ),
});

// ---------- recall (spaced-repetition memorization) ----------

export const MAX_RECALL_MINUTES = 60;
export const MAX_RECALL_DECKS = 20;
export const MAX_RECALL_TEXT_CHARS = 2_000;
export const MAX_RECALL_BODY_CHARS = 20_000;
/** Longer answer times are clamped: a tab left open overnight is still just "slow". */
export const MAX_RECALL_ELAPSED_MS = 24 * 60 * 60 * 1000;

/** Recall session ids (uuid) and deck ids are single path segments. */
export const recallSessionParamsSchema = z.object({ sessionId: pathIdSchema });
export const recallDeckParamsSchema = z.object({ deckId: pathIdSchema });

export const startRecallSchema = z.object({
  minutes: z.number().int().min(1).max(MAX_RECALL_MINUTES).optional(),
  deckIds: z.array(pathIdSchema).min(1).max(MAX_RECALL_DECKS).optional(),
});

const recallResponseSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("choice"), choice: choiceIndex }),
  z.object({ kind: z.literal("text"), text: z.string().max(MAX_RECALL_TEXT_CHARS) }),
  z.object({ kind: z.literal("code"), body: z.string().max(MAX_RECALL_BODY_CHARS) }),
]);

export const recallAnswerSchema = z.object({
  /** Item ids are opaque (module-generated); only a length bound. */
  itemId: z.string().min(1).max(300),
  response: recallResponseSchema,
  elapsedMs: z
    .number()
    .min(0)
    .transform((v) => Math.min(Math.round(v), MAX_RECALL_ELAPSED_MS)),
});
