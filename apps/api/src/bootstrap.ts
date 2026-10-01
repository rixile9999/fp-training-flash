/**
 * Composition root: database, migrations, modules, content import, runner, HTTP server.
 * Module factories and migrations come from each module root (`@fp/<m>`); only apps may import them.
 */
import { mkdir } from "node:fs/promises";
import { serve } from "@hono/node-server";
import type { ServerType } from "@hono/node-server";
import { createConsoleLogger, createPgDb, createPgliteDb, InMemoryEventBus, runMigrations, systemClock } from "@fp/kernel";
import type { Clock, Db, Logger, Migration } from "@fp/kernel";
import { createAccountsModule, migrations as accountsMigrations } from "@fp/accounts";
import { createContentModule, migrations as contentMigrations } from "@fp/content";
import {
  createDockerGleamRunner,
  createGradingModule,
  createLocalGleamRunner,
  migrations as gradingMigrations,
} from "@fp/grading";
import type { CodeRunner } from "@fp/grading/contract";
import { createLearnerModule, migrations as learnerMigrations } from "@fp/learner";
import { createLessonsModule, migrations as lessonsMigrations } from "@fp/lessons";
import { createSessionsModule, migrations as sessionsMigrations } from "@fp/sessions";
import { createCoachingModule, migrations as coachingMigrations } from "@fp/coaching";
import type { BundleInfo } from "@fp/content/contract";
import { createApp } from "./app.ts";
import type { ApiApp, AppServices } from "./app.ts";
import { runnerLabel } from "./config.ts";
import type { ApiConfig, DbConfig, RunnerConfig } from "./config.ts";

/** Dependency order: a module's migrations run after those of the modules it depends on. */
export const MODULE_MIGRATIONS: readonly (readonly [string, readonly Migration[]])[] = [
  ["accounts", accountsMigrations],
  ["content", contentMigrations],
  ["grading", gradingMigrations],
  ["learner", learnerMigrations],
  ["lessons", lessonsMigrations],
  ["sessions", sessionsMigrations],
  ["coaching", coachingMigrations],
];

export class ContentInvalidError extends Error {
  readonly issues: readonly { readonly path: string; readonly message: string }[];
  constructor(issues: readonly { readonly path: string; readonly message: string }[]) {
    super(`content is invalid (${issues.length} issue(s))`);
    this.name = "ContentInvalidError";
    this.issues = issues;
  }
}

export async function openDb(config: DbConfig): Promise<Db> {
  if (config.kind === "postgres") return createPgDb(config.url);
  if (config.dataDir !== undefined) await mkdir(config.dataDir, { recursive: true });
  return createPgliteDb(config.dataDir);
}

export async function migrateAll(db: Db): Promise<void> {
  for (const [name, migrations] of MODULE_MIGRATIONS) await runMigrations(db, name, migrations);
}

export function createRunner(config: RunnerConfig): CodeRunner {
  return config.kind === "docker"
    ? createDockerGleamRunner({ image: config.image })
    : createLocalGleamRunner({ templateDir: config.templateDir });
}

export interface Runtime {
  readonly app: ApiApp;
  readonly services: AppServices;
  readonly db: Db;
  readonly bundle: BundleInfo;
  /** Stops the HTTP server (if started) and closes the database. Idempotent. */
  close(): Promise<void>;
}

export interface BootstrapOptions {
  readonly clock?: Clock;
  /** Base logger for the api; modules get their own scoped console loggers unless `moduleLogger` is set. */
  readonly logger?: Logger;
  readonly moduleLogger?: (scope: string) => Logger;
  /** Start listening on config.port. Default true. */
  readonly listen?: boolean;
}

/** Builds everything and (by default) starts the HTTP server. Throws when content is invalid. */
export async function bootstrap(config: ApiConfig, opts: BootstrapOptions = {}): Promise<Runtime> {
  const clock = opts.clock ?? systemClock;
  const logger = opts.logger ?? createConsoleLogger("api");
  const scoped = opts.moduleLogger ?? ((scope: string) => createConsoleLogger(scope));

  const db = await openDb(config.db);
  let server: ServerType | undefined;
  let closed = false;
  const close = async (): Promise<void> => {
    if (closed) return;
    closed = true;
    if (server !== undefined) {
      const s = server;
      await new Promise<void>((resolve) => s.close(() => resolve()));
    }
    await db.close();
  };

  try {
    await migrateAll(db);
    logger.info("migrations applied", { db: config.db.kind });

    const events = new InMemoryEventBus(scoped("events"));
    const accounts = createAccountsModule({ db, clock, logger: scoped("accounts") });
    const content = createContentModule({ db, clock, events, logger: scoped("content") });

    const loaded = await content.admin.loadDirectory(config.contentDir);
    if (!loaded.ok) {
      for (const issue of loaded.error) logger.error("content issue", { path: issue.path, message: issue.message });
      throw new ContentInvalidError(loaded.error);
    }
    const imported = await content.admin.importBundle(loaded.value);
    if (!imported.ok) throw new Error(`content import failed: ${imported.error.code}: ${imported.error.message}`);
    const bundle = imported.value;
    logger.info("content imported", { bundleId: bundle.bundleId, exercises: bundle.exerciseCount });

    const runner = createRunner(config.runner);
    const grading = createGradingModule({
      db,
      clock,
      events,
      logger: scoped("grading"),
      catalog: content.catalog,
      runner,
    });
    const learner = createLearnerModule({ db, clock, events, logger: scoped("learner"), catalog: content.catalog });
    const sessions = createSessionsModule({
      db,
      clock,
      events,
      logger: scoped("sessions"),
      catalog: content.catalog,
      learner: learner.model,
    });
    const lessons = createLessonsModule({
      db,
      clock,
      events,
      logger: scoped("lessons"),
      catalog: content.catalog,
      learner: learner.model,
    });
    const coaching = createCoachingModule({
      db,
      clock,
      logger: scoped("coaching"),
      catalog: content.catalog,
      grading: grading.service,
      learner: learner.model,
      llm: config.llm,
    });

    // Learner and sessions are subscribed by now, so recovered system-error events reach them (they ignore them).
    const recovered = await grading.recoverInterrupted();
    if (recovered > 0) logger.warn("interrupted submissions recovered as system errors", { count: recovered });

    const services: AppServices = {
      accounts: accounts.service,
      catalog: content.catalog,
      grading: grading.service,
      learner: learner.model,
      lessons: lessons.service,
      sessions: sessions.service,
      coaching: coaching.service,
    };
    const app = createApp(services, {
      clock,
      logger,
      webOrigin: config.webOrigin,
      runner: runnerLabel(config.runner),
      llm: config.llm.provider,
    });

    if (opts.listen ?? true) {
      server = serve({ fetch: app.fetch, port: config.port }, (info) => {
        logger.info("listening", {
          port: info.port,
          runner: runnerLabel(config.runner),
          llm: config.llm.provider,
          webOrigin: config.webOrigin,
        });
      });
    }

    return { app, services, db, bundle, close };
  } catch (e) {
    await close();
    throw e;
  }
}
