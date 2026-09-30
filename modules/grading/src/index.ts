/** Composition-root entry. Only apps/* and tools/* may import this file. */
import type { Clock, Db, EventBus, Logger, Migration } from "@fp/kernel";
import type { ContentCatalog, FileContent, GradingSpec } from "@fp/content/contract";
import type { CodeRunner, Evaluation, GradingService, RunJob, RunOutput } from "./contract/index.ts";

export interface GradingModuleDeps {
  readonly db: Db;
  readonly clock: Clock;
  readonly events: EventBus;
  readonly logger: Logger;
  readonly catalog: ContentCatalog;
  readonly runner: CodeRunner;
  /** Max concurrent runner jobs. */
  readonly concurrency?: number;
}

export interface GradingModule {
  readonly service: GradingService;
}

export const migrations: readonly Migration[] = [];

export function createGradingModule(_deps: GradingModuleDeps): GradingModule {
  throw new Error("not implemented");
}

export interface DockerGleamRunnerOptions {
  /** Docker image tag built from runners/gleam/Dockerfile. */
  readonly image: string;
  readonly cpus?: number;
}

/** Production runner: no network, read-only root, tmpfs work dir, memory/pids/cpu limits, non-root user. */
export function createDockerGleamRunner(_opts: DockerGleamRunnerOptions): CodeRunner {
  throw new Error("not implemented");
}

export interface LocalGleamRunnerOptions {
  /** Directory with the pre-built template project (deps downloaded). */
  readonly templateDir: string;
  readonly workRoot?: string;
}

/** DEVELOPMENT ONLY: runs learner code as the current OS user without a sandbox. */
export function createLocalGleamRunner(_opts: LocalGleamRunnerOptions): CodeRunner {
  throw new Error("not implemented");
}

/** Build the runner job for learner files. `includeHidden=false` for trial runs. */
export function buildRunJob(_spec: GradingSpec, _sourceFiles: readonly FileContent[], _includeHidden: boolean): RunJob {
  throw new Error("not implemented");
}

/** Static pre-checks (e.g. @external, forbidden imports). Returns rejection reasons; empty means OK. */
export function staticChecks(_spec: GradingSpec, _sourceFiles: readonly FileContent[]): readonly string[] {
  throw new Error("not implemented");
}

/** Pure mapping from runner output to an Evaluation. */
export function interpretRunOutput(_spec: GradingSpec, _output: RunOutput, _evaluatedAt: string): Evaluation {
  throw new Error("not implemented");
}
