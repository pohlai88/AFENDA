import { describe, expect, it, vi } from "vitest";
import { promoteEmployee } from "../services/promote-employee.service";
import { HRM_EVENTS } from "../../shared/events/hrm-events";

function makeSelectChain(whereMock: (...args: unknown[]) => Promise<unknown>) {
  const chain: Record<string, unknown> = {
    from: () => chain,
    where: whereMock,
  };
  return chain;
}

describe("Promote employee write-path evidence", () => {
  it("returns error when no grade/position/job change", async () => {
    const selectEmploymentMock = vi.fn().mockResolvedValueOnce([
      { id: "emp-1", status: "active" },
    ]);
    const selectAssignmentMock = vi.fn().mockResolvedValueOnce([
      {
        id: "wa-1",
        legalEntityId: "le-1",
        gradeId: "grade-3",
        positionId: "pos-11",
        jobId: "job-5",
        businessUnitId: null,
        departmentId: null,
        costCenterId: null,
        managerEmployeeId: null,
        fteRatio: "1.0000",
      },
    ]);

    let selectCallCount = 0;
    const selectMock = vi.fn(() => {
      selectCallCount += 1;
      if (selectCallCount === 1) return makeSelectChain(selectEmploymentMock);
      return makeSelectChain(selectAssignmentMock);
    });

    const db: Record<string, unknown> = {
      select: selectMock,
      transaction: vi.fn(),
    };

    const result = await promoteEmployee(
      db as never,
      "org-1",
      "actor-1",
      "corr-1",
      "2026-03-13T12:00:00Z",
      {
        employmentId: "emp-1",
        effectiveFrom: "2026-04-01",
        gradeId: "grade-3",
        positionId: "pos-11",
        jobId: "job-5",
        changeReason: "No change",
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_PROMOTION_NO_CHANGE");
    }
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("writes audit and outbox with EMPLOYEE_PROMOTED on successful promote", async () => {
    const selectEmploymentMock = vi.fn().mockResolvedValueOnce([
      { id: "emp-1", status: "active" },
    ]);
    const selectAssignmentMock = vi.fn().mockResolvedValueOnce([
      {
        id: "wa-1",
        legalEntityId: "le-1",
        gradeId: "grade-2",
        positionId: "pos-10",
        jobId: "job-5",
        businessUnitId: null,
        departmentId: null,
        costCenterId: null,
        managerEmployeeId: null,
        fteRatio: "1.0000",
      },
    ]);
    const selectOverlapMock = vi.fn().mockResolvedValueOnce([]);

    let selectCallCount = 0;
    const selectMock = vi.fn(() => {
      selectCallCount += 1;
      if (selectCallCount === 1) return makeSelectChain(selectEmploymentMock);
      if (selectCallCount === 2) return makeSelectChain(selectAssignmentMock);
      return makeSelectChain(selectOverlapMock);
    });

    const auditValuesMock = vi.fn().mockResolvedValue(undefined);
    const outboxValuesMock = vi.fn().mockResolvedValue(undefined);

    const newAssignmentReturning = vi.fn().mockResolvedValueOnce([
      { id: "wa-new-789" },
    ]);

    let insertCount = 0;
    const insertMock = vi.fn(() => {
      insertCount += 1;
      if (insertCount === 1) {
        return {
          values: vi.fn().mockReturnValue({
            returning: newAssignmentReturning,
          }),
        };
      }
      if (insertCount === 2) return { values: auditValuesMock };
      return { values: outboxValuesMock };
    });

    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
    };

    const tx: Record<string, unknown> = {
      select: vi.fn(() => makeSelectChain(() => Promise.resolve([]))),
      insert: insertMock,
      update: vi.fn(() => updateChain),
    };

    const db: Record<string, unknown> = {
      select: selectMock,
      transaction: vi.fn(async (fn: (txArg: unknown) => Promise<unknown>) => fn(tx)),
    };

    const correlationId = "corr-promote-123";

    const result = await promoteEmployee(
      db as never,
      "org-1",
      "actor-1",
      correlationId,
      "2026-03-13T12:00:00Z",
      {
        employmentId: "emp-1",
        effectiveFrom: "2026-04-01",
        gradeId: "grade-3",
        changeReason: "Merit promotion",
      },
    );

    expect(result.ok).toBe(true);
    expect(auditValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: HRM_EVENTS.EMPLOYEE_PROMOTED,
        correlationId,
        entityType: "hrm_employment",
      }),
    );
    expect(outboxValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "HRM.EMPLOYEE_PROMOTED",
        correlationId,
      }),
    );
  });
});
