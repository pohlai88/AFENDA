import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  tableRefs: {
    treasuryFxExposureTable: { name: "treasuryFxExposureTable", id: "id" },
    treasuryHedgeDesignationTable: { name: "treasuryHedgeDesignationTable", id: "id" },
    revaluationEvent: { name: "revaluationEvent", id: "id" },
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

import { withAudit } from "../../../../kernel/governance/audit/audit";
import { createFxExposure, closeFxExposure } from "../fx-exposure.service";
import { createHedgeDesignation, updateHedgeDesignationStatus } from "../hedge-designation.service";
import { createRevaluationEvent, updateRevaluationEventStatus } from "../revaluation-event.service";

function makeWhereResult(rows: unknown[]) {
  const promise = Promise.resolve(rows);
  return {
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  } as Promise<unknown[]>;
}

function createDb(selectQueue: unknown[][] = []) {
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

        if (table === mockState.tableRefs.treasuryFxExposureTable) {
          return { returning: vi.fn(async () => [{ id: "fx-created-1" }]) };
        }
        if (table === mockState.tableRefs.treasuryHedgeDesignationTable) {
          return { returning: vi.fn(async () => [{ id: "hedge-created-1" }]) };
        }
        if (table === mockState.tableRefs.revaluationEvent) {
          return { returning: vi.fn(async () => [{ id: "reval-created-1" }]) };
        }

        return { returning: vi.fn(async () => []) };
      }),
    })),
    update: vi.fn((table: unknown) => ({
      set: vi.fn((values: unknown) => {
        updated.push({ table, values });

        if (table === mockState.tableRefs.treasuryFxExposureTable) {
          return {
            where: vi.fn(() => ({ returning: vi.fn(async () => [{ id: "fx-closed-1" }]) })),
          };
        }
        if (table === mockState.tableRefs.treasuryHedgeDesignationTable) {
          return {
            where: vi.fn(() => ({ returning: vi.fn(async () => [{ id: "hedge-updated-1" }]) })),
          };
        }
        if (table === mockState.tableRefs.revaluationEvent) {
          return {
            where: vi.fn(() => ({ returning: vi.fn(async () => [{ id: "reval-updated-1" }]) })),
          };
        }

        return { where: vi.fn(() => ({ returning: vi.fn(async () => []) })) };
      }),
    })),
  };

  return { db, tx, inserted, updated };
}

beforeEach(() => {
  mockState.activeTx = null;
  vi.clearAllMocks();
});

describe("Wave 5.1 FX management and revaluation services", () => {
  it("returns idempotent FX exposure id when matching record already exists", async () => {
    const { db } = createDb([[{ id: "fx-existing-1" }]]);

    const result = await createFxExposure(
      db as never,
      { activeContext: { orgId: "org-1" } } as never,
      { principalId: "principal-1" } as never,
      "corr-1" as never,
      {
        exposureNumber: "EXP-1001",
        exposureDate: "2026-03-13",
        valueDate: "2026-03-20",
        sourceType: "ap_invoice",
        sourceId: "src-1",
        baseCurrencyCode: "EUR",
        quoteCurrencyCode: "USD",
        direction: "sell-base",
        grossAmountMinor: "100000",
        sourceVersion: "v1",
      } as never,
    );

    expect(result).toEqual({ ok: true, data: { id: "fx-existing-1" } });
    expect(vi.mocked(withAudit)).not.toHaveBeenCalled();
  });

  it("rejects FX exposure when currency pair is invalid", async () => {
    const { db } = createDb([[]]);

    const result = await createFxExposure(
      db as never,
      { activeContext: { orgId: "org-1" } } as never,
      { principalId: "principal-1" } as never,
      "corr-2" as never,
      {
        exposureNumber: "EXP-1002",
        exposureDate: "2026-03-13",
        valueDate: "2026-03-20",
        sourceType: "ap_invoice",
        sourceId: "src-2",
        baseCurrencyCode: "USD",
        quoteCurrencyCode: "USD",
        direction: "buy-base",
        grossAmountMinor: "50000",
        sourceVersion: "v1",
      } as never,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TREAS_FX_EXPOSURE_INVALID_CURRENCY_PAIR");
    }
  });

  it("prevents closing FX exposure when status is not open", async () => {
    const { db } = createDb([[{ id: "fx-1", status: "closed" }]]);

    const result = await closeFxExposure(
      db as never,
      { activeContext: { orgId: "org-1" } } as never,
      { principalId: "principal-1" } as never,
      "corr-3" as never,
      { fxExposureId: "fx-1" } as never,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TREAS_FX_EXPOSURE_CANNOT_CLOSE");
    }
  });

  it("rejects hedge designation when active hedge already exists", async () => {
    const { db } = createDb([[{ id: "hedge-active-1" }]]);

    const result = await createHedgeDesignation(
      db as never,
      { activeContext: { orgId: "org-1" } } as never,
      { principalId: "principal-1" } as never,
      "corr-4" as never,
      {
        hedgeNumber: "HDG-1001",
        fxExposureId: "fx-1001",
        hedgeInstrumentType: "forward",
        hedgeRelationshipType: "cash-flow",
        designatedAmountMinor: "25000",
        startDate: "2026-03-13",
        endDate: null,
        designationMemo: null,
      } as never,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TREAS_HEDGE_ALREADY_ACTIVE");
    }
  });

  it("rejects invalid hedge status transition", async () => {
    const { db } = createDb([[{ id: "hedge-1", status: "de-designated" }]]);

    const result = await updateHedgeDesignationStatus(
      db as never,
      { activeContext: { orgId: "org-1" } } as never,
      { principalId: "principal-1" } as never,
      "corr-5" as never,
      { hedgeDesignationId: "hedge-1", reason: "retest" } as never,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TREAS_HEDGE_INVALID_STATUS_TRANSITION");
    }
  });

  it("rejects revaluation event when provided delta does not match computed delta", async () => {
    const { db } = createDb([[]]);

    const result = await createRevaluationEvent(
      db as never,
      { activeContext: { orgId: "org-1" } } as never,
      { principalId: "principal-1" } as never,
      "corr-6" as never,
      {
        fxExposureId: "fx-2001",
        hedgeDesignationId: null,
        valuationDate: "2026-03-13",
        priorRateSnapshotId: null,
        currentRateSnapshotId: "rate-1",
        carryingAmountMinor: "1000",
        revaluedAmountMinor: "1400",
        revaluationDeltaMinor: "300",
      } as never,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TREAS_REVALUATION_INVALID_DELTA");
    }
  });

  it("updates revaluation status for valid transition and emits outbox event", async () => {
    const { db, tx, inserted, updated } = createDb([[{ id: "reval-1", status: "pending" }]]);
    mockState.activeTx = tx;

    const result = await updateRevaluationEventStatus(
      db as never,
      { activeContext: { orgId: "org-1" } } as never,
      { principalId: "principal-1" } as never,
      "corr-7" as never,
      { revaluationEventId: "reval-1", status: "calculated" } as never,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe("reval-updated-1");
    }

    const updatedMain = updated.find((x) => x.table === mockState.tableRefs.revaluationEvent);
    expect(updatedMain).toBeDefined();

    const outboxInsert = inserted.find((x) => x.table === mockState.tableRefs.outboxEvent);
    expect((outboxInsert?.values as { type?: string }).type).toBe(
      "TREAS.REVALUATION_EVENT_STATUS_UPDATED",
    );
  });
});
