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
