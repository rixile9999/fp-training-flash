/** Composition-root entry. Only apps/* and tools/* may import this file. */
import type { Clock, Db, Logger } from "@fp/kernel";
import type { ContentCatalog } from "@fp/content/contract";
import type { GradingService } from "@fp/grading/contract";
import type { RecallService } from "./contract/index.ts";
import { createRecallService } from "./internal/service.ts";

export { migrations } from "./internal/migrations.ts";

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

/** Publishes and consumes no events. Run `migrations` (schema "recall") before use. */
export function createRecallModule(deps: RecallModuleDeps): RecallModule {
  return { service: createRecallService(deps) };
}
