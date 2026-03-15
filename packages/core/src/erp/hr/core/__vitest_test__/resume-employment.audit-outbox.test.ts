import { describe, expect, it, vi } from "vitest";
import { resumeEmployment } from "../services/resume-employment.service";
import { HRM_EVENTS } from "../../shared/events/hrm-events";

function makeSelectChain(whereMock: (...args: unknown[]) => Promise<unknown>) {
  const chain: Record<string, unknown> = {
    from: () => chain,
    where: whereMock,
  };
  return chain;
}

describe("Resume employment write-path evidence", () => {
  it("returns error when employment is not suspended", async () => {
    const whereMock = vi.fn().mockResolvedValueOnce([
      { id: "emp-1", employeeId: "emp-profile-1", status: "active" },
    ]);

    const db: Record<string, unknown> = {
      select: vi.fn(() => makeSelectChain(whereMock)),
      transaction: vi.fn(),
    };

    const result = await resumeEmployment(
      db as never,
      "org-1",
      "actor-1",
      "corr-1",
      {
        employmentId: "emp-1",
        effectiveDate: "2026-03-15",
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_EMPLOYMENT_NOT_SUSPENDED");
    }
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("writes audit and outbox entries on successful resume", async () => {
    const selectWhereMock = vi.fn().mockResolvedValueOnce([
      { id: "emp-1", employeeId: "emp-profile-1", status: "suspended" },
    ]);

    const auditValuesMock = vi.fn().mockResolvedValue(undefined);
    const outboxValuesMock = vi.fn().mockResolvedValue(undefined);

    let insertCount = 0;
    const insertMock = vi.fn(() => {
      insertCount += 1;
      if (insertCount === 1) {
        return { values: vi.fn().mockResolvedValue(undefined) };
      }
      if (insertCount === 2) {
        return { values: auditValuesMock };
      }
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
      select: vi.fn(() => makeSelectChain(selectWhereMock)),
      transaction: vi.fn(async (fn: (txArg: unknown) => Promise<unknown>) => fn(tx)),
    };

    const correlationId = "corr-resume-22222222-2222-4222-8222-222222222222";

    const result = await resumeEmployment(db as never, "org-1", "actor-1", correlationId, {
      employmentId: "emp-1",
      effectiveDate: "2026-03-15",
    });

    expect(result.ok).toBe(true);
    expect(auditValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: HRM_EVENTS.EMPLOYEE_RESUMED,
        correlationId,
        entityType: "hrm_employment",
        entityId: "emp-1",
      }),
    );
    expect(outboxValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "HRM.EMPLOYEE_RESUMED",
        correlationId,
        payload: expect.objectContaining({
          employmentId: "emp-1",
          resumedAt: "2026-03-15",
        }),
      }),
    );
  });
});
