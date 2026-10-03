/** Composition-root entry. Only apps/* and tools/* may import this file. */
import type { Clock, Db, Logger, Migration } from "@fp/kernel";
import type { ContentCatalog } from "@fp/content/contract";
import type { GradingService } from "@fp/grading/contract";
import type { RecallService } from "./contract/index.ts";

export interface RecallModuleDeps {
  readonly db: Db;
  readonly clock: Clock;
  readonly logger: Logger;
  readonly catalog: ContentCatalog;
  /** evaluateSnippet grades cloze/predict/produce answers in the sandbox. */
  readonly grading: GradingService;
  readonly newCardsPerDay?: number;
}

export interface RecallModule {
  readonly service: RecallService;
}

export const migrations: readonly Migration[] = [];

export function createRecallModule(_deps: RecallModuleDeps): RecallModule {
  throw new Error("not implemented");
}
