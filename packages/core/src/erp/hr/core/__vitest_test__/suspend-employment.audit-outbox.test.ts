import { describe, expect, it, vi } from "vitest";
import { suspendEmployment } from "../services/suspend-employment.service";
import { HRM_EVENTS } from "../../shared/events/hrm-events";

function makeSelectChain(whereMock: (...args: unknown[]) => Promise<unknown>) {
  const chain: Record<string, unknown> = {
    from: () => chain,
    where: whereMock,
  };
  return chain;
}

describe("Suspend employment write-path evidence", () => {
  it("returns error when employment is already suspended", async () => {
    const whereMock = vi.fn().mockResolvedValueOnce([
      { id: "emp-1", employeeId: "emp-profile-1", status: "suspended" },
    ]);

    const db: Record<string, unknown> = {
      select: vi.fn(() => makeSelectChain(whereMock)),
      transaction: vi.fn(),
    };

    const result = await suspendEmployment(
      db as never,
      "org-1",
      "actor-1",
      "corr-1",
      {
        employmentId: "emp-1",
        effectiveDate: "2026-03-15",
        reasonCode: "investigation",
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_EMPLOYMENT_ALREADY_SUSPENDED");
    }
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("writes audit and outbox entries on successful suspend", async () => {
    const selectWhereMock = vi.fn().mockResolvedValueOnce([
      { id: "emp-1", employeeId: "emp-profile-1", status: "active" },
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

    const correlationId = "corr-11111111-1111-4111-8111-111111111111";

    const result = await suspendEmployment(db as never, "org-1", "actor-1", correlationId, {
      employmentId: "emp-1",
      effectiveDate: "2026-03-15",
      reasonCode: "investigation",
    });

    expect(result.ok).toBe(true);
    expect(auditValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: HRM_EVENTS.EMPLOYEE_SUSPENDED,
        correlationId,
        entityType: "hrm_employment",
      }),
    );
    expect(outboxValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "HRM.EMPLOYEE_SUSPENDED",
        correlationId,
      }),
    );
  });
});
