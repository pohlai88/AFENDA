import { describe, expect, it } from "vitest";

import {
  applyIfNotSeen,
  createPostgresProcessedEntriesStore,
  createRedisIdempotencyStore,
  insertIfNotExists,
  upsertById,
  type QueryResult,
  type SqlClient,
} from "../idempotent-writes";
import { createInMemoryIdempotencyStore } from "../idempotency";

describe("shared idempotent-writes", () => {
  it("builds upsert SQL and returns final row", async () => {
    const seen: { sql: string; params: unknown[] | undefined }[] = [];
    const client: SqlClient = {
      async query(sql, params) {
        seen.push({ sql, params });
        return { rows: [{ id: "a1", amount_minor: "100" }], rowCount: 1 };
      },
    };

    const row = await upsertById<{ id: string; amount_minor: string }>(
      client,
      "ledger_entries",
      "id",
      { id: "a1", amount_minor: 100n, currency_code: "USD" },
      ["amount_minor", "currency_code"],
    );

    expect(row.id).toBe("a1");
    expect(seen[0]?.sql).toContain(
      "ON CONFLICT (id) DO UPDATE SET amount_minor = EXCLUDED.amount_minor",
    );
    expect(seen[0]?.params?.[0]).toBe("a1");
  });

  it("builds insert-if-not-exists SQL and returns row", async () => {
    const client: SqlClient = {
      async query(sql, params) {
        expect(sql).toContain("ON CONFLICT (id) DO NOTHING");
        expect(sql).toContain("WITH ins AS");
        return { rows: [{ id: "p1", amount_minor: "88" }], rowCount: 1 };
      },
    };

    const row = await insertIfNotExists<{ id: string; amount_minor: string }>(
      client,
      "payments",
      "id",
      { id: "p1", org_id: "o1", amount_minor: 88n },
    );

    expect(row.id).toBe("p1");
  });

  it("applyIfNotSeen executes handler once for same entryId", async () => {
    const store = createInMemoryIdempotencyStore();
    let called = 0;

    const first = await applyIfNotSeen(store, "entry-0001", async () => {
      called += 1;
      return { ok: true, n: 1 };
    });
    const second = await applyIfNotSeen(store, "entry-0001", async () => {
      called += 1;
      return { ok: true, n: 2 };
    });

    expect(called).toBe(1);
    expect(first).toEqual(second);
  });

  it("postgres processed-entries adapter maps get/set and dedupe", async () => {
    const calls: Array<{ sql: string; params?: unknown[] }> = [];
    const client: SqlClient = {
      async query(sql, params): Promise<QueryResult> {
        calls.push({ sql, params });
        if (sql.includes("DO NOTHING") && sql.includes("RETURNING")) {
          return { rows: [{ entry_id: "e1" }], rowCount: 1 };
        }
        if (sql.startsWith("SELECT")) {
          return { rows: [{ result: { status: "completed", result: { ok: true } } }], rowCount: 1 };
        }
        return { rows: [], rowCount: 1 };
      },
    };

    const store = createPostgresProcessedEntriesStore(client);
    const claimed = await store.setIfNotExists("e1", { status: "in-progress" });
    expect(claimed).toBe(true);

    const existing = await store.get("e1");
    expect(existing?.status).toBe("completed");
    await store.set("e1", { status: "completed", result: { ok: true } });

    expect(calls.some((c) => c.sql.includes("processed_entries"))).toBe(true);
  });

  it("redis adapter supports claim/get/set", async () => {
    const backing = new Map<string, string>();
    const redis = {
      async get(key: string) {
        return backing.get(key) ?? null;
      },
      async set(key: string, value: string, ...args: unknown[]) {
        const hasNx = args.includes("NX");
        if (hasNx && backing.has(key)) {
          return null;
        }
        backing.set(key, value);
        return "OK";
      },
      async del(key: string) {
        backing.delete(key);
        return 1;
      },
    };

    const store = createRedisIdempotencyStore(redis, { keyPrefix: "test" });
    const c1 = await store.setIfNotExists("k1", { status: "in-progress" }, 30);
    const c2 = await store.setIfNotExists("k1", { status: "in-progress" }, 30);
    expect(c1).toBe(true);
    expect(c2).toBe(false);

    await store.set("k1", { status: "completed", result: { id: 1 } }, 30);
    const got = await store.get("k1");
    expect(got).toEqual({ status: "completed", result: { id: 1 } });
  });
});
