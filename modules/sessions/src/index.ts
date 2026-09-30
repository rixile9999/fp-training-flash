/** Composition-root entry. Only apps/* and tools/* may import this file. */
import type { Clock, Db, DomainEvent, EventBus, Logger } from "@fp/kernel";
import type { ContentCatalog } from "@fp/content/contract";
import { GRADING_EVENTS, type SubmissionEvaluatedPayload } from "@fp/grading/contract";
import type { LearnerModel } from "@fp/learner/contract";
import type { SessionService } from "./contract/index.ts";
import { createSessionService } from "./service.ts";

export { migrations } from "./migrations.ts";

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
  /** Removes the event subscription (tests, shutdown). */
  readonly dispose: () => void;
}

/** Also subscribes to `grading.submission_evaluated` to update session items. */
export function createSessionsModule(deps: SessionsModuleDeps): SessionsModule {
  const service = createSessionService(deps);
  const unsubscribe = deps.events.subscribe<DomainEvent<typeof GRADING_EVENTS.submissionEvaluated, SubmissionEvaluatedPayload>>(
    GRADING_EVENTS.submissionEvaluated,
    (event) => service.onSubmissionEvaluated(event),
  );
  const { onSubmissionEvaluated: _handler, ...publicService } = service;
  return { service: publicService, dispose: unsubscribe };
}
