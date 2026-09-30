/** Composition-root entry. Only apps/* and tools/* may import this file. */
import type { Clock, Db, EventBus, Logger, Migration } from "@fp/kernel";
import type { ContentCatalog } from "@fp/content/contract";
import type { LearnerModel } from "@fp/learner/contract";
import type { SessionService } from "./contract/index.ts";

export interface SessionsModuleDeps {
  readonly db: Db;
  readonly clock: Clock;
  readonly events: EventBus;
  readonly logger: Logger;
  readonly catalog: ContentCatalog;
  readonly learner: LearnerModel;
}

export interface SessionsModule {
  readonly service: SessionService;
}

export const migrations: readonly Migration[] = [];

/** Also subscribes to `grading.submission_evaluated` to update session items. */
export function createSessionsModule(_deps: SessionsModuleDeps): SessionsModule {
  throw new Error("not implemented");
}
