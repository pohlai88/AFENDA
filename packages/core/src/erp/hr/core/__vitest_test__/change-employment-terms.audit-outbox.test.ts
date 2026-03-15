import { describe, expect, it, vi } from "vitest";
import { changeEmploymentTerms } from "../services/change-employment-terms.service";
import { HRM_EVENTS } from "../../shared/events/hrm-events";

function makeSelectChain(resolveValue: unknown[]): Record<string, unknown> {
  const promise = Promise.resolve(resolveValue);
  const chain = {
    from: () => chain,
    where: () => ({
      for: () => promise,
      then: promise.then.bind(promise),
      catch: promise.catch.bind(promise),
    }),
  };
  return chain;
}

describe("Change employment terms write-path evidence", () => {
  it("returns error when no fteRatio, probationEndDate, or employmentType provided", async () => {
    const db: Record<string, unknown> = {
      select: vi.fn(),
      transaction: vi.fn(),
    };

    const result = await changeEmploymentTerms(
      db as never,
      "org-1",
      "actor-1",
      "corr-1",
      "2026-03-13T12:00:00Z",
      {
        employmentId: "emp-1",
        effectiveFrom: "2026-04-01",
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_INVALID_INPUT");
    }
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("returns error when employment not found", async () => {
    const tx = {
      select: vi.fn(() => makeSelectChain([])),
      insert: vi.fn(),
      update: vi.fn(() => ({ set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(undefined) })),
    };
    const db: Record<string, unknown> = {
      transaction: vi.fn(async (fn: (txArg: unknown) => Promise<unknown>) => fn(tx)),
    };

    const result = await changeEmploymentTerms(
      db as never,
      "org-1",
      "actor-1",
      "corr-1",
      "2026-03-13T12:00:00Z",
      {
        employmentId: "emp-999",
        effectiveFrom: "2026-04-01",
        fteRatio: "0.5000",
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_EMPLOYMENT_NOT_FOUND");
    }
    expect(db.transaction).toHaveBeenCalled();
  });

  it("returns error when probationEndDate < effectiveFrom", async () => {
    const db: Record<string, unknown> = { transaction: vi.fn() };

    const result = await changeEmploymentTerms(
      db as never,
      "org-1",
      "actor-1",
      "corr-1",
      "2026-03-13T12:00:00Z",
      {
        employmentId: "emp-1",
        effectiveFrom: "2026-06-01",
        probationEndDate: "2026-05-01",
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_INVALID_INPUT");
    }
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("writes audit and outbox with previousValues and newValues on FTE change", async () => {
    const employment = { id: "emp-1", status: "active", probationEndDate: null, employmentType: "permanent" };
    const assignment = {
      id: "wa-1",
      legalEntityId: "le-1",
      businessUnitId: null,
      departmentId: null,
      costCenterId: null,
      positionId: null,
      jobId: null,
      gradeId: null,
      managerEmployeeId: null,
      fteRatio: "1.0000",
    };

    let txSelectCallCount = 0;
    const txSelectMock = vi.fn(() => {
      txSelectCallCount += 1;
      if (txSelectCallCount === 1) return makeSelectChain([employment]);
      if (txSelectCallCount === 2) return makeSelectChain([assignment]);
      return makeSelectChain([]);
    });

    const auditValuesMock = vi.fn().mockResolvedValue(undefined);
    const outboxValuesMock = vi.fn().mockResolvedValue(undefined);

    let insertCount = 0;
    const insertMock = vi.fn(() => {
      insertCount += 1;
      if (insertCount === 1) {
        return { values: vi.fn().mockResolvedValue(undefined) };
      }
      if (insertCount === 2) return { values: auditValuesMock };
      return { values: outboxValuesMock };
    });
    // insert 3 = EMPLOYMENT_TERMS_CHANGED outbox, insert 4 = EMPLOYMENT_TERMS_IMPACT_ASSESSMENT_REQUIRED

    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
    };

    const tx: Record<string, unknown> = {
      select: txSelectMock,
      insert: insertMock,
      update: vi.fn(() => updateChain),
    };

    const db: Record<string, unknown> = {
      transaction: vi.fn(async (fn: (txArg: unknown) => Promise<unknown>) => fn(tx)),
    };

    const correlationId = "corr-terms-44444444-4444-4444-8444-444444444444";

    const result = await changeEmploymentTerms(
      db as never,
      "org-1",
      "actor-1",
      correlationId,
      "2026-03-13T12:00:00Z",
      {
        employmentId: "emp-1",
        effectiveFrom: "2026-04-01",
        fteRatio: "0.5000",
        changeReason: "Reduced hours",
      },
    );

    expect(result.ok).toBe(true);
    expect(auditValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: HRM_EVENTS.EMPLOYMENT_TERMS_CHANGED,
        entityType: "hrm_employment",
        entityId: "emp-1",
        correlationId,
        details: expect.objectContaining({
          employmentId: "emp-1",
          effectiveFrom: "2026-04-01",
          previousValues: expect.objectContaining({ fteRatio: "1.0000" }),
          newValues: expect.objectContaining({ fteRatio: "0.5000" }),
        }),
      }),
    );
    expect(outboxValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "HRM.EMPLOYMENT_TERMS_CHANGED",
        correlationId,
        payload: expect.objectContaining({
          employmentId: "emp-1",
          previousValues: expect.objectContaining({ fteRatio: "1.0000" }),
          newValues: expect.objectContaining({ fteRatio: "0.5000" }),
        }),
      }),
    );
    expect(outboxValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "HRM.EMPLOYMENT_TERMS_IMPACT_ASSESSMENT_REQUIRED",
        payload: expect.objectContaining({
          employmentId: "emp-1",
          fteRatioChanged: true,
        }),
      }),
    );
  });

  it("includes retroactive: true in audit when effectiveFrom < today", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const effectiveFrom = yesterday.toISOString().slice(0, 10);

    const employment = { id: "emp-1", status: "active", probationEndDate: null, employmentType: "permanent" };
    const assignment = {
      id: "wa-1",
      legalEntityId: "le-1",
      businessUnitId: null,
      departmentId: null,
      costCenterId: null,
      positionId: null,
      jobId: null,
      gradeId: null,
      managerEmployeeId: null,
      fteRatio: "1.0000",
    };

    let txSelectCallCount = 0;
    const txSelectMock = vi.fn(() => {
      txSelectCallCount += 1;
      if (txSelectCallCount === 1) return makeSelectChain([employment]);
      if (txSelectCallCount === 2) return makeSelectChain([assignment]);
      return makeSelectChain([]);
    });

    const auditValuesMock = vi.fn().mockResolvedValue(undefined);
    const outboxValuesMock = vi.fn().mockResolvedValue(undefined);

    let insertCount = 0;
    const insertMock = vi.fn(() => {
      insertCount += 1;
      if (insertCount === 1) return { values: vi.fn().mockResolvedValue(undefined) };
      if (insertCount === 2) return { values: auditValuesMock };
      return { values: outboxValuesMock };
    });

    const tx: Record<string, unknown> = {
      select: txSelectMock,
      insert: insertMock,
      update: vi.fn(() => ({ set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(undefined) })),
    };

    const db: Record<string, unknown> = {
      transaction: vi.fn(async (fn: (txArg: unknown) => Promise<unknown>) => fn(tx)),
    };

    const result = await changeEmploymentTerms(
      db as never,
      "org-1",
      "actor-1",
      "corr-retro",
      "2026-03-13T12:00:00Z",
      {
        employmentId: "emp-1",
        effectiveFrom,
        fteRatio: "0.5000",
      },
    );

    expect(result.ok).toBe(true);
    expect(auditValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        details: expect.objectContaining({
          retroactive: true,
        }),
      }),
    );
  });
});
