import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  tableRefs: {
    bankAccount: { name: "bankAccount" },
    liquiditySourceFeed: { name: "liquiditySourceFeed" },
    cashPositionSnapshot: { name: "cashPositionSnapshot" },
    cashPositionSnapshotLine: { name: "cashPositionSnapshotLine" },
    cashPositionSnapshotLineage: { name: "cashPositionSnapshotLineage" },
    outboxEvent: { name: "outboxEvent" },
  },
  activeTx: null as Record<string, unknown> | null,
  normalizeToBase: vi.fn(),
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

vi.mock("../fx-normalization.service", () => ({
  normalizeToBase: mockState.normalizeToBase,
}));

import {
  requestCashPositionSnapshot,
  supersedeCashPositionSnapshot,
} from "../cash-position-snapshot.service";

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
  let nextLineId = 1;
  const inserted: Array<{ table: unknown; values: unknown }> = [];

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
        if (table === mockState.tableRefs.cashPositionSnapshot) {
          return { returning: vi.fn(async () => [{ id: "snap-1" }]) };
        }
        if (table === mockState.tableRefs.cashPositionSnapshotLine) {
          const rows = Array.isArray(values) ? values : [values];
          return {
            returning: vi.fn(async () =>
              rows.map((row) => ({
                id: `line-${nextLineId++}`,
                sourceId: (row as { sourceId?: string }).sourceId ?? null,
              })),
            ),
          };
        }
        return { returning: vi.fn(async () => []) };
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(async () => []),
      })),
    })),
  };

  return { db, tx, inserted };
}

beforeEach(() => {
  mockState.activeTx = null;
  mockState.normalizeToBase.mockReset();
  mockState.normalizeToBase.mockImplementation(
    async (_db: unknown, params: { amountMinor: string; fromCurrencyCode: string; toCurrencyCode: string }) => ({
      ok: true,
      data: {
        normalizedMinor: params.amountMinor,
        fxRateSnapshotId: params.fromCurrencyCode === params.toCurrencyCode ? null : "fx-1",
      },
    }),
  );
});

describe("cash-position-snapshot service", () => {
  it("creates snapshot, feed lines, lineage rows, and outbox event", async () => {
    const { db, tx, inserted } = createDb([
      [{ id: "ba-1", currencyCode: "USD" }],
      [
        {
          id: "feed-1",
          sourceType: "ap_due_payment",
          bankAccountId: "ba-1",
          currencyCode: "USD",
          amountMinor: "125",
          dueDate: "2026-03-12",
          direction: "outflow",
        },
      ],
    ]);
    mockState.activeTx = tx;

    const result = await requestCashPositionSnapshot(
      db as never,
      { activeContext: { orgId: "org-1" } } as never,
      { principalId: "principal-1" } as never,
      "corr-1" as never,
      {
        snapshotDate: "2026-03-12",
        asOfAt: "2026-03-12T00:00:00.000Z",
        baseCurrencyCode: "USD",
        sourceVersion: "wave3",
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe("snap-1");
    }

    const lineageInsert = inserted.find((x) => x.table === mockState.tableRefs.cashPositionSnapshotLineage);
    expect(lineageInsert).toBeDefined();

    const outboxInsert = inserted.find((x) => x.table === mockState.tableRefs.outboxEvent);
    expect(outboxInsert).toBeDefined();
    expect((outboxInsert?.values as { type?: string }).type).toBe("TREAS.CASH_POSITION_SNAPSHOT_REQUESTED");
  });

  it("normalizes mixed-currency snapshot feeds into base currency", async () => {
    const { db, tx, inserted } = createDb([
      [{ id: "ba-1", currencyCode: "EUR" }],
      [
        {
          id: "feed-1",
          sourceType: "ar_expected_receipt",
          bankAccountId: null,
          currencyCode: "EUR",
          amountMinor: "100",
          dueDate: "2026-03-12",
          direction: "inflow",
        },
      ],
    ]);
    mockState.activeTx = tx;
    mockState.normalizeToBase.mockResolvedValueOnce({
      ok: true,
      data: { normalizedMinor: "110", fxRateSnapshotId: "fx-1" },
    });

    const result = await requestCashPositionSnapshot(
      db as never,
      { activeContext: { orgId: "org-1" } } as never,
      { principalId: "principal-1" } as never,
      "corr-1" as never,
      {
        snapshotDate: "2026-03-12",
        asOfAt: "2026-03-12T00:00:00.000Z",
        baseCurrencyCode: "USD",
        sourceVersion: "wave3",
      },
    );

    expect(result.ok).toBe(true);
    const snapshotInsert = inserted.find((entry) => entry.table === mockState.tableRefs.cashPositionSnapshot);
    expect(snapshotInsert).toBeDefined();
    expect((snapshotInsert?.values as { totalPendingInflowMinor?: string }).totalPendingInflowMinor).toBe("110");

    const lineValues = inserted
      .filter((entry) => entry.table === mockState.tableRefs.cashPositionSnapshotLine)
      .flatMap((entry) => (Array.isArray(entry.values) ? entry.values : [entry.values])) as Array<{
      amountMinor: string;
      currencyCode: string;
      sourceId?: string | null;
    }>;
    const feedLine = lineValues.find((line) => line.sourceId === "feed-1");
    expect(feedLine?.amountMinor).toBe("110");
    expect(feedLine?.currencyCode).toBe("USD");
  });

  it("returns not-found when FX rate snapshot is missing", async () => {
    const { db } = createDb([
      [{ id: "ba-1", currencyCode: "USD" }],
      [
        {
          id: "feed-1",
          sourceType: "ar_expected_receipt",
          bankAccountId: null,
          currencyCode: "EUR",
          amountMinor: "100",
          dueDate: "2026-03-12",
          direction: "inflow",
        },
      ],
    ]);
    mockState.normalizeToBase.mockResolvedValueOnce({
      ok: false,
      error: {
        code: "TREASURY_FX_RATE_SNAPSHOT_NOT_FOUND",
        message: "FX rate snapshot not found",
      },
    });

    const result = await requestCashPositionSnapshot(
      db as never,
      { activeContext: { orgId: "org-1" } } as never,
      { principalId: "principal-1" } as never,
      "corr-1" as never,
      {
        snapshotDate: "2026-03-12",
        asOfAt: "2026-03-12T00:00:00.000Z",
        baseCurrencyCode: "USD",
        sourceVersion: "wave3",
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TREASURY_FX_RATE_SNAPSHOT_NOT_FOUND");
    }
  });

  it("supersedes snapshot and emits superseded outbox event", async () => {
    const { db, tx, inserted } = createDb([[{ id: "snap-1", status: "calculated" }]]);
    mockState.activeTx = tx;

    const result = await supersedeCashPositionSnapshot(
      db as never,
      { activeContext: { orgId: "org-1" } } as never,
      { principalId: "principal-1" } as never,
      "corr-2" as never,
      { snapshotId: "snap-1" as never },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe("snap-1");
    }

    const outboxInsert = inserted.find((x) => x.table === mockState.tableRefs.outboxEvent);
    expect((outboxInsert?.values as { type?: string }).type).toBe("TREAS.CASH_POSITION_SNAPSHOT_SUPERSEDED");
  });
});
