/** Composition-root entry. Only apps/* and tools/* may import this file. */
import type { Clock, Db, EventBus, Logger } from "@fp/kernel";
import type { ContentCatalog } from "@fp/content/contract";
import type { CodeRunner, GradingService } from "./contract/index.ts";
import { createGradingService } from "./service/service.ts";

export { migrations } from "./service/migrations.ts";
export { createDockerGleamRunner, type DockerGleamRunnerOptions } from "./runner/docker.ts";
export {
  createLocalGleamRunner,
  GLEAM_RUNNER_DIR,
  GLEAM_TEMPLATE_DIR,
  type LocalGleamRunnerOptions,
} from "./runner/local.ts";
export { buildRunJob } from "./grading/run-job.ts";
export { staticChecks } from "./grading/static-checks.ts";
export { interpretRunOutput } from "./grading/interpret.ts";
export { rubricChecks } from "./grading/rubric.ts";
export { normalizeAnswer } from "./grading/predict.ts";

/** Default Docker image tag built by runners/gleam/build-image.sh. */
export const DEFAULT_GLEAM_IMAGE = "fp-gleam-runner:1.18.1";

export interface GradingModuleDeps {
  readonly db: Db;
  readonly clock: Clock;
  readonly events: EventBus;
  readonly logger: Logger;
  readonly catalog: ContentCatalog;
  readonly runner: CodeRunner;
  /** Max concurrent runner jobs (default 2). */
  readonly concurrency?: number;
}

export interface GradingModule {
  readonly service: GradingService;
  /**
   * Call once at startup, before serving requests: completes submissions left "running" by a crashed process as
   * system errors (never counted as learning failures) and publishes their events. Returns how many were recovered.
   */
  recoverInterrupted(): Promise<number>;
}

/** Run `migrations` (schema "grading") before using the service. */
export function createGradingModule(deps: GradingModuleDeps): GradingModule {
  const service = createGradingService(deps);
  return { service, recoverInterrupted: () => service.recoverInterrupted() };
}
