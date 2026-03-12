import { describe, expect, it, vi } from "vitest";
import { recalculateLeaveBalance } from "../services/recalculate-leave-balance.service";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";

function makeSelectChain(whereMock: any) {
  const chain: any = {
    from: () => chain,
    where: whereMock,
  };
  return chain;
}

describe("Leave balance recalculation invariants", () => {
  it("requires accrualPeriod in YYYY-MM format", async () => {
    const db: any = {};

    const result = await recalculateLeaveBalance(db, "org-1", "actor-1", "corr-1", {
      employmentId: "employment-1",
      leaveTypeId: "leave-type-1",
      accrualPeriod: "202603",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(HRM_ERROR_CODES.INVALID_INPUT);
    }
  });

  it("blocks negative leave balance", async () => {
    const whereMock = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ consumedAmount: "10" }]);

    const tx: any = {
      select: vi.fn(() => makeSelectChain(whereMock)),
      insert: vi.fn(),
    };

    const db: any = {
      transaction: vi.fn(async (fn: (txArg: unknown) => Promise<unknown>) => fn(tx)),
    };

    const result = await recalculateLeaveBalance(db, "org-1", "actor-1", "corr-1", {
      employmentId: "employment-1",
      leaveTypeId: "leave-type-1",
      accrualPeriod: "2026-03",
      openingBalance: "0",
      accruedAmount: "0",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(HRM_ERROR_CODES.CONFLICT);
    }

    expect(tx.insert).not.toHaveBeenCalled();
  });
});
