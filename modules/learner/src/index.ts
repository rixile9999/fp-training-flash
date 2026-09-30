/** Composition-root entry. Only apps/* and tools/* may import this file. */
import type { Clock, Db, DomainEvent, EventBus, Logger, Migration } from "@fp/kernel";
import type { ContentCatalog } from "@fp/content/contract";
import { GRADING_EVENTS, type SubmissionEvaluatedPayload } from "@fp/grading/contract";
import type { LearnerModel } from "./contract/index.ts";
import { learnerMigrations } from "./migrations.ts";
import { createLearnerModel } from "./model.ts";

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

export const migrations: readonly Migration[] = learnerMigrations;

/** Also subscribes to `grading.submission_evaluated` on `deps.events`. */
export function createLearnerModule(deps: LearnerModuleDeps): LearnerModule {
  const model = createLearnerModel(deps);
  deps.events.subscribe<DomainEvent<typeof GRADING_EVENTS.submissionEvaluated, SubmissionEvaluatedPayload>>(
    GRADING_EVENTS.submissionEvaluated,
    (event) => model.handleSubmissionEvaluated(event),
  );
  return { model };
}
