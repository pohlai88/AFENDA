import { beforeEach, describe, expect, it, vi } from "vitest";

import { applyEventIfNotSeen } from "../idempotent-ingestion.js";

function createHelpers() {
  return {
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    withPgClient: vi.fn(),
    addJob: vi.fn(),
  };
}

describe("worker idempotent ingestion helper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies handler once for same entry id", async () => {
    const state = new Map<string, string>();

    const pgClient = {
      async query(sql: string, params?: unknown[]) {
        const key = String(params?.[0] ?? "");
        if (
          sql.includes("ON CONFLICT") &&
          sql.includes("DO NOTHING") &&
          sql.includes("RETURNING")
        ) {
          if (state.has(key)) {
            return { rows: [], rowCount: 0 };
          }
          state.set(key, JSON.stringify(null));
          return { rows: [{ entry_id: key }], rowCount: 1 };
        }

        if (sql.startsWith("SELECT")) {
          const raw = state.get(key);
          if (raw === undefined) {
            return { rows: [], rowCount: 0 };
          }
          return { rows: [{ result: JSON.parse(raw) }], rowCount: 1 };
        }

        if (sql.includes("DO UPDATE SET")) {
          state.set(key, JSON.stringify(params?.[1] ?? null));
          return { rows: [], rowCount: 1 };
        }

        if (sql.startsWith("DELETE")) {
          state.delete(key);
          return { rows: [], rowCount: 1 };
        }

        return { rows: [], rowCount: 0 };
      },
    };

    const helpers = createHelpers();
    helpers.withPgClient.mockImplementation(
      async (fn: (c: typeof pgClient) => Promise<unknown>) => {
        return fn(pgClient);
      },
    );

    let applied = 0;

    const first = await applyEventIfNotSeen(
      helpers as never,
      "comm.example.entry-0001",
      async () => {
        applied += 1;
        return { ok: true, applied };
      },
      { ttlSeconds: 60, pollIntervalMs: 1 },
    );

    const second = await applyEventIfNotSeen(
      helpers as never,
      "comm.example.entry-0001",
      async () => {
        applied += 1;
        return { ok: true, applied };
      },
      { ttlSeconds: 60, pollIntervalMs: 1 },
    );

    expect(applied).toBe(1);
    expect(first).toEqual(second);
  });
});
