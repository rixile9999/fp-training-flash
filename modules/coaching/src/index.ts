/** Composition-root entry. Only apps/* and tools/* may import this file. */
import type { Clock, Db, Logger, Migration } from "@fp/kernel";
import type { ContentCatalog } from "@fp/content/contract";
import type { GradingService } from "@fp/grading/contract";
import type { LearnerModel } from "@fp/learner/contract";
import type { CoachingService } from "./contract/index.ts";
import { createAnthropicLlmClient, DEFAULT_COACH_MODEL, type LlmClient } from "./internal/llm.ts";
import { coachingMigrations } from "./internal/migrations.ts";
import { createCoachingService } from "./internal/service.ts";

export { DEFAULT_COACH_MODEL };

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

export const migrations: readonly Migration[] = coachingMigrations;

export function createCoachingModule(deps: CoachingModuleDeps): CoachingModule {
  const service = createCoachingService({
    db: deps.db,
    clock: deps.clock,
    logger: deps.logger,
    catalog: deps.catalog,
    grading: deps.grading,
    learner: deps.learner,
    llm: llmClientFor(deps.llm),
  });
  return { service };
}

function llmClientFor(config: LlmConfig): LlmClient | null {
  if (config.provider === "none") return null;
  return createAnthropicLlmClient({
    apiKey: config.apiKey,
    model: config.model || DEFAULT_COACH_MODEL,
    ...(config.maxOutputTokens !== undefined ? { maxOutputTokens: config.maxOutputTokens } : {}),
  });
}
