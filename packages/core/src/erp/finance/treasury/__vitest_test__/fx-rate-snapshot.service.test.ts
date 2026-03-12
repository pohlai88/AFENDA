import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  tableRefs: {
    fxRateSnapshot: { name: "fxRateSnapshot", id: "id" },
    outboxEvent: { name: "outboxEvent" },
  },
  activeTx: null as Record<string, unknown> | null,
}));

vi.mock("@afenda/db", () => ({
  ...mockState.tableRefs,
}));

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    and: vi.fn((..._args: unknown[]) => ({ __op: "and" })),
    eq: vi.fn((_a: unknown, _b: unknown) => ({ __op: "eq" })),
  };
});

vi.mock("../../../../kernel/governance/audit/audit", () => ({
  withAudit: vi.fn(
    async (_db: unknown, _ctx: unknown, _entry: unknown, fn: (tx: unknown) => Promise<unknown>) =>
      fn(mockState.activeTx ?? _db),
  ),
}));

import { upsertFxRateSnapshot } from "../fx-rate-snapshot.service";

function makeWhereResult(rows: unknown[]) {
  const promise = Promise.resolve(rows);
  return {
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  } as Promise<unknown[]>;
}

function createDb(selectQueue: unknown[][]) {
  let selectIdx = 0;
  const inserted: Array<{ table: unknown; values: unknown }> = [];
  const updated: Array<{ table: unknown; values: unknown }> = [];

  const db = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => makeWhereResult((selectQueue[selectIdx++] ?? []) as unknown[])),
      })),
    })),
  } as Record<string, unknown>;

  const tx = {
    insert: vi.fn((table: unknown) => ({
      values: vi.fn((values: unknown) => {
        inserted.push({ table, values });
        if (table === mockState.tableRefs.fxRateSnapshot) {
          return { returning: vi.fn(async () => [{ id: "fx-inserted" }]) };
        }
        return { returning: vi.fn(async () => []) };
      }),
    })),
    update: vi.fn((table: unknown) => ({
      set: vi.fn((values: unknown) => {
        updated.push({ table, values });
        return {
          where: vi.fn(() => ({ returning: vi.fn(async () => [{ id: "fx-updated" }]) })),
        };
      }),
    })),
  };

  return { db, tx, inserted, updated };
}

beforeEach(() => {
  mockState.activeTx = null;
});

describe("fx-rate-snapshot service", () => {
  it("inserts new FX snapshot and emits insert outbox mode", async () => {
    const { db, tx, inserted } = createDb([[]]);
    mockState.activeTx = tx;

    const result = await upsertFxRateSnapshot(
      db as never,
      { activeContext: { orgId: "org-1" } } as never,
      { principalId: "principal-1" } as never,
      "corr-1" as never,
      {
        rateDate: "2026-03-12",
        fromCurrencyCode: "EUR",
        toCurrencyCode: "USD",
        rateScaled: "1100000",
        scale: 6,
        providerCode: "ECB",
        sourceVersion: "v1",
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe("fx-inserted");
    }

    const outboxInsert = inserted.find((x) => x.table === mockState.tableRefs.outboxEvent);
    expect((outboxInsert?.values as { payload?: { mode?: string } }).payload?.mode).toBe("insert");
  });

  it("updates existing FX snapshot and emits update outbox mode", async () => {
    const { db, tx, inserted, updated } = createDb([[{ id: "fx-existing" }]]);
    mockState.activeTx = tx;

    const result = await upsertFxRateSnapshot(
      db as never,
      { activeContext: { orgId: "org-1" } } as never,
      { principalId: "principal-1" } as never,
      "corr-2" as never,
      {
        rateDate: "2026-03-12",
        fromCurrencyCode: "EUR",
        toCurrencyCode: "USD",
        rateScaled: "1110000",
        scale: 6,
        providerCode: "ECB",
        sourceVersion: "v1",
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe("fx-updated");
    }

    expect(updated.length).toBe(1);
    const outboxInsert = inserted.find((x) => x.table === mockState.tableRefs.outboxEvent);
    expect((outboxInsert?.values as { payload?: { mode?: string } }).payload?.mode).toBe("update");
  });
});
