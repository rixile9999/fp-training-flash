import { randomUUID } from "node:crypto";

/** Nominal typing helper. `Brand<string, "UserId">` is a string that cannot be mixed with other ids. */
export type Brand<T, B extends string> = T & { readonly __brand: B };

export type UserId = Brand<string, "UserId">;
export type SkillId = Brand<string, "SkillId">;
export type FamilyId = Brand<string, "FamilyId">;
/** Immutable exercise version id: `<familyId>/<variantKey>@<version>`, e.g. `orders-apply-coupon/base@1`. */
export type ExerciseId = Brand<string, "ExerciseId">;
export type ConceptNoteId = Brand<string, "ConceptNoteId">;
export type TheoryTopicId = Brand<string, "TheoryTopicId">;
export type SubmissionId = Brand<string, "SubmissionId">;
export type SessionId = Brand<string, "SessionId">;

export function newId(): string {
  return randomUUID();
}

export function asId<T extends Brand<string, string>>(value: string): T {
  return value as T;
}
