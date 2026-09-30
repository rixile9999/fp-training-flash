/** Composition-root entry. Only apps/* and tools/* may import this file. */
import type { Clock, Db, Logger, Migration } from "@fp/kernel";
import type { AccountsService } from "./contract/index.ts";

export interface AccountsModuleDeps {
  readonly db: Db;
  readonly clock: Clock;
  readonly logger: Logger;
}

export interface AccountsModule {
  readonly service: AccountsService;
}

export const migrations: readonly Migration[] = [];

export function createAccountsModule(_deps: AccountsModuleDeps): AccountsModule {
  throw new Error("not implemented");
}
