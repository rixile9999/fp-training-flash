/**
 * Minimal database port. Production uses PostgreSQL (`createPgDb`); dev and tests use in-process
 * PGlite (`createPgliteDb`). Each module owns exactly one PostgreSQL schema named after the module
 * and must not read or write another module's schema.
 */
export interface Db {
  query<R = Record<string, unknown>>(sql: string, params?: readonly unknown[]): Promise<{ rows: R[] }>;
  /** Runs one or more statements without parameters (DDL, migrations). */
  exec(sql: string): Promise<void>;
  /** Runs `fn` in a transaction. Nested calls reuse the outer transaction. */
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export interface Migration {
  /** Stable, sortable id such as `0001_init`. Never edit an applied migration; add a new one. */
  readonly id: string;
  readonly sql: string;
}

export async function runMigrations(db: Db, moduleName: string, migrations: readonly Migration[]): Promise<void> {
  await db.exec(`create table if not exists public.fp_migrations (
    module text not null,
    id text not null,
    applied_at timestamptz not null default now(),
    primary key (module, id)
  )`);
  const applied = await db.query<{ id: string }>("select id from public.fp_migrations where module = $1", [moduleName]);
  const done = new Set(applied.rows.map((r) => r.id));
  const ordered = [...migrations].sort((a, b) => a.id.localeCompare(b.id));
  for (const m of ordered) {
    if (done.has(m.id)) continue;
    await db.transaction(async (tx) => {
      await tx.exec(m.sql);
      await tx.query("insert into public.fp_migrations (module, id) values ($1, $2)", [moduleName, m.id]);
    });
  }
}

interface PgliteLike {
  query<R>(sql: string, params?: unknown[]): Promise<{ rows: R[] }>;
  exec(sql: string): Promise<unknown>;
  transaction<T>(fn: (tx: PgliteTxLike) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
interface PgliteTxLike {
  query<R>(sql: string, params?: unknown[]): Promise<{ rows: R[] }>;
  exec(sql: string): Promise<unknown>;
}

function wrapPgliteTx(tx: PgliteTxLike): Db {
  const self: Db = {
    query: async <R>(sql: string, params?: readonly unknown[]) => {
      const r = await tx.query<R>(sql, params ? [...params] : undefined);
      return { rows: r.rows };
    },
    exec: async (sql) => {
      await tx.exec(sql);
    },
    transaction: async (fn) => fn(self),
    close: async () => {},
  };
  return self;
}

/** In-process PostgreSQL (WASM). `dataDir` undefined means in-memory. */
export async function createPgliteDb(dataDir?: string): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const pg = (dataDir ? new PGlite(dataDir) : new PGlite()) as unknown as PgliteLike;
  return {
    query: async <R>(sql: string, params?: readonly unknown[]) => {
      const r = await pg.query<R>(sql, params ? [...params] : undefined);
      return { rows: r.rows };
    },
    exec: async (sql) => {
      await pg.exec(sql);
    },
    transaction: (fn) => pg.transaction((tx) => fn(wrapPgliteTx(tx))),
    close: () => pg.close(),
  };
}

/** Real PostgreSQL via node-postgres. */
export async function createPgDb(connectionString: string): Promise<Db> {
  const pgMod = await import("pg");
  const pool = new pgMod.default.Pool({ connectionString });
  const clientDb = (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }): Db => {
    const self: Db = {
      query: async <R>(sql: string, params?: readonly unknown[]) => {
        const r = await client.query(sql, params ? [...params] : undefined);
        return { rows: r.rows as R[] };
      },
      exec: async (sql) => {
        await client.query(sql);
      },
      transaction: async (fn) => fn(self),
      close: async () => {},
    };
    return self;
  };
  return {
    query: async <R>(sql: string, params?: readonly unknown[]) => {
      const r = await pool.query(sql, params ? [...params] : undefined);
      return { rows: r.rows as R[] };
    },
    exec: async (sql) => {
      await pool.query(sql);
    },
    transaction: async (fn) => {
      const client = await pool.connect();
      try {
        await client.query("begin");
        const out = await fn(clientDb(client));
        await client.query("commit");
        return out;
      } catch (e) {
        await client.query("rollback");
        throw e;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}
