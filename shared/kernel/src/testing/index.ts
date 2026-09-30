import type { Clock } from "../clock.ts";
import { createPgliteDb, type Db } from "../db.ts";

/** Fresh in-memory PostgreSQL for one test. Call `close()` in afterEach. */
export function createTestDb(): Promise<Db> {
  return createPgliteDb();
}

export interface MutableClock extends Clock {
  set(date: Date | string): void;
  advance(ms: number): void;
}

export function createFixedClock(start: Date | string = "2026-09-30T00:00:00.000Z"): MutableClock {
  let current = new Date(start);
  return {
    now: () => new Date(current),
    set: (d) => {
      current = new Date(d);
    },
    advance: (ms) => {
      current = new Date(current.getTime() + ms);
    },
  };
}

export const DAY_MS = 24 * 60 * 60 * 1000;
