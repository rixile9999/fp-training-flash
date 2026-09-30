/** Process entry: `node src/main.ts`. Reads env config, bootstraps, and shuts down on SIGINT/SIGTERM. */
import { createConsoleLogger } from "@fp/kernel";
import { bootstrap, ContentInvalidError } from "./bootstrap.ts";
import { loadConfig } from "./config.ts";

const logger = createConsoleLogger("api");

const config = loadConfig(process.env);
if (!config.ok) {
  logger.error("invalid configuration", { ...config.error.details });
  process.exit(1);
}

try {
  const runtime = await bootstrap(config.value, { logger });
  let stopping = false;
  const shutdown = (signal: string): void => {
    if (stopping) return;
    stopping = true;
    logger.info("shutting down", { signal });
    const force = setTimeout(() => {
      logger.error("shutdown timed out; exiting");
      process.exit(1);
    }, 10_000);
    force.unref();
    runtime.close().then(
      () => process.exit(0),
      (e: unknown) => {
        logger.error("shutdown failed", { error: e instanceof Error ? e.message : String(e) });
        process.exit(1);
      },
    );
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
} catch (e) {
  if (e instanceof ContentInvalidError) {
    logger.error("refusing to start: content is invalid", { issues: e.issues.length });
  } else {
    logger.error("startup failed", { error: e instanceof Error ? (e.stack ?? e.message) : String(e) });
  }
  process.exit(1);
}
