import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  tableRefs: {
    liquiditySourceFeed: { name: "liquiditySourceFeed", id: "id" },
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
    sql: Object.assign(
      vi.fn((_parts: TemplateStringsArray, ..._vals: unknown[]) => ({ __op: "sql" })),
      { raw: vi.fn((s: string) => s) },
    ),
  };
});

vi.mock("../../../../kernel/governance/audit/audit", () => ({
  withAudit: vi.fn(
    async (_db: unknown, _ctx: unknown, _entry: unknown, fn: (tx: unknown) => Promise<unknown>) =>
      fn(mockState.activeTx ?? _db),
  ),
}));

import { upsertLiquiditySourceFeed } from "../liquidity-source-feed.service";

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
        if (table === mockState.tableRefs.liquiditySourceFeed) {
          return { returning: vi.fn(async () => [{ id: "feed-inserted" }]) };
        }
        return { returning: vi.fn(async () => []) };
      }),
    })),
    update: vi.fn((table: unknown) => ({
      set: vi.fn((values: unknown) => {
        updated.push({ table, values });
        return {
          where: vi.fn(() => ({ returning: vi.fn(async () => [{ id: "feed-updated" }]) })),
        };
      }),
    })),
  };

  return { db, tx, inserted, updated };
}

beforeEach(() => {
  mockState.activeTx = null;
});

describe("liquidity-source-feed service", () => {
  it("inserts a new source feed and emits insert outbox mode", async () => {
    const { db, tx, inserted } = createDb([[]]);
    mockState.activeTx = tx;

    const result = await upsertLiquiditySourceFeed(
      db as never,
      { activeContext: { orgId: "org-1" } } as never,
      { principalId: "principal-1" } as never,
      "corr-1" as never,
      {
        sourceType: "ap_due_payment",
        sourceId: "ap-1",
        sourceDocumentNumber: "INV-100",
        bankAccountId: "ba-1",
        currencyCode: "USD",
        amountMinor: "999",
        dueDate: "2026-03-12",
        direction: "outflow",
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe("feed-inserted");
    }

    const outboxInsert = inserted.find((x) => x.table === mockState.tableRefs.outboxEvent);
    expect(outboxInsert).toBeDefined();
    expect((outboxInsert?.values as { payload?: { mode?: string } }).payload?.mode).toBe("insert");
  });

  it("updates existing source feed and emits update outbox mode", async () => {
    const { db, tx, inserted, updated } = createDb([[{ id: "feed-existing" }]]);
    mockState.activeTx = tx;

    const result = await upsertLiquiditySourceFeed(
      db as never,
      { activeContext: { orgId: "org-1" } } as never,
      { principalId: "principal-1" } as never,
      "corr-2" as never,
      {
        sourceType: "ar_expected_receipt",
        sourceId: "ar-1",
        currencyCode: "USD",
        amountMinor: "1200",
        dueDate: "2026-03-15",
        direction: "inflow",
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe("feed-updated");
    }

    expect(updated.length).toBe(1);

    const outboxInsert = inserted.find((x) => x.table === mockState.tableRefs.outboxEvent);
    expect((outboxInsert?.values as { payload?: { mode?: string } }).payload?.mode).toBe("update");
  });
});
