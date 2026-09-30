/** Composition-root entry. Only apps/* and tools/* may import this file. */
import type { Clock, Db, EventBus, Logger, Migration } from "@fp/kernel";
import type { ContentCatalog } from "@fp/content/contract";
import type { LearnerModel } from "./contract/index.ts";

export interface LearnerModuleDeps {
  readonly db: Db;
  readonly clock: Clock;
  readonly events: EventBus;
  readonly logger: Logger;
  readonly catalog: ContentCatalog;
}

export interface LearnerModule {
  readonly model: LearnerModel;
}

export const migrations: readonly Migration[] = [];

/** Also subscribes to `grading.submission_evaluated` on `deps.events`. */
export function createLearnerModule(_deps: LearnerModuleDeps): LearnerModule {
  throw new Error("not implemented");
}
