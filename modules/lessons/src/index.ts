/** Composition-root entry. Only apps/* and tools/* may import this file. */
import type { Clock, Db, EventBus, Logger, Migration } from "@fp/kernel";
import type { ContentCatalog } from "@fp/content/contract";
import type { LearnerModel } from "@fp/learner/contract";
import type { LessonService } from "./contract/index.ts";

export interface LessonsModuleDeps {
  readonly db: Db;
  readonly clock: Clock;
  readonly events: EventBus;
  readonly logger: Logger;
  readonly catalog: ContentCatalog;
  readonly learner: LearnerModel;
}

export interface LessonsModule {
  readonly service: LessonService;
}

export const migrations: readonly Migration[] = [];

export function createLessonsModule(_deps: LessonsModuleDeps): LessonsModule {
  throw new Error("not implemented");
}
