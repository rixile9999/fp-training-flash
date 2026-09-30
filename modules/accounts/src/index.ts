/** Composition-root entry. Only apps/* and tools/* may import this file. */
import type { Clock, Db, Logger, Migration } from "@fp/kernel";
import type { AccountsService } from "./contract/index.ts";
import { migrations as schemaMigrations } from "./schema.ts";
import { createAccountsService } from "./service.ts";

export interface AccountsModuleDeps {
  readonly db: Db;
  readonly clock: Clock;
  readonly logger: Logger;
}

export interface AccountsModule {
  readonly service: AccountsService;
}

/** Apply with `runMigrations(db, "accounts", migrations)` before using the service. */
export const migrations: readonly Migration[] = schemaMigrations;

export function createAccountsModule(deps: AccountsModuleDeps): AccountsModule {
  return { service: createAccountsService(deps) };
}
