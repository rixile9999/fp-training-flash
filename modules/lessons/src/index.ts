/** Composition-root entry. Only apps/* and tools/* may import this file. */
import type { Clock, Db, EventBus, Logger } from "@fp/kernel";
import type { ContentCatalog } from "@fp/content/contract";
import type { LearnerModel } from "@fp/learner/contract";
import type { LessonService } from "./contract/index.ts";
import { createLessonService } from "./service.ts";

export { migrations } from "./migrations.ts";

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

/** Consumes no events. Run `migrations` (schema "lessons") before use. */
export function createLessonsModule(deps: LessonsModuleDeps): LessonsModule {
  return { service: createLessonService(deps) };
}
