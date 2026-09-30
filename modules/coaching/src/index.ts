/** Composition-root entry. Only apps/* and tools/* may import this file. */
import type { Clock, Db, Logger, Migration } from "@fp/kernel";
import type { ContentCatalog } from "@fp/content/contract";
import type { GradingService } from "@fp/grading/contract";
import type { LearnerModel } from "@fp/learner/contract";
import type { CoachingService } from "./contract/index.ts";

export type LlmConfig =
  | { readonly provider: "anthropic"; readonly apiKey: string; readonly model: string; readonly maxOutputTokens?: number }
  | { readonly provider: "none" };

export interface CoachingModuleDeps {
  readonly db: Db;
  readonly clock: Clock;
  readonly logger: Logger;
  readonly catalog: ContentCatalog;
  readonly grading: GradingService;
  readonly learner: LearnerModel;
  readonly llm: LlmConfig;
}

export interface CoachingModule {
  readonly service: CoachingService;
}

export const migrations: readonly Migration[] = [];

export function createCoachingModule(_deps: CoachingModuleDeps): CoachingModule {
  throw new Error("not implemented");
}
