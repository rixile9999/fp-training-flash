import { afterEach, describe, expect, it } from "vitest";
import { InMemoryEventBus, createEvent, runMigrations, silentLogger, type Db } from "../src/index.ts";
import { createFixedClock, createTestDb } from "../src/testing/index.ts";

describe("runMigrations", () => {
  let db: Db | undefined;
  afterEach(async () => {
    await db?.close();
  });

  it("applies each migration once, in id order", async () => {
    db = await createTestDb();
    const migrations = [
      { id: "0002_add", sql: "insert into demo.t (v) values (2)" },
      { id: "0001_init", sql: "create schema demo; create table demo.t (v int)" },
    ];
    await runMigrations(db, "demo", migrations);
    await runMigrations(db, "demo", migrations);
    const rows = await db.query<{ v: number }>("select v from demo.t");
    expect(rows.rows).toEqual([{ v: 2 }]);
  });

  it("rolls back a failing transaction", async () => {
    db = await createTestDb();
    await db.exec("create table t (v int)");
    await expect(
      db.transaction(async (tx) => {
        await tx.query("insert into t values (1)");
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect((await db.query("select * from t")).rows).toEqual([]);
  });
});

describe("InMemoryEventBus", () => {
  it("delivers to subscribers and isolates handler failures", async () => {
    const bus = new InMemoryEventBus(silentLogger);
    const seen: string[] = [];
    bus.subscribe("x.happened", async () => {
      throw new Error("bad handler");
    });
    bus.subscribe("x.happened", async (e) => {
      seen.push(e.id);
    });
    const event = createEvent("x.happened", { n: 1 }, createFixedClock());
    await bus.publish(event);
    expect(seen).toEqual([event.id]);
  });
});
