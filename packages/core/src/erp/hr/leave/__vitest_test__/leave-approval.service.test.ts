import { describe, expect, it, vi } from "vitest";
import { approveLeaveRequest } from "../services/approve-leave-request.service";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";

function makeSelectChain(whereMock: any) {
  const chain: any = {
    from: () => chain,
    where: whereMock,
  };
  return chain;
}

describe("Leave approval invariants", () => {
  it("requires rejection reason when rejected", async () => {
    const db: any = {};

    const result = await approveLeaveRequest(db, "org-1", "actor-1", "corr-1", {
      leaveRequestId: "leave-1",
      approved: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(HRM_ERROR_CODES.INVALID_INPUT);
    }
  });

  it("blocks approval for finalized leave request", async () => {
    const whereMock = vi.fn().mockResolvedValueOnce([{ id: "leave-1", status: "approved" }]);

    const valuesMock = vi.fn().mockResolvedValue(undefined);
    const insertMock = vi.fn(() => ({ values: valuesMock }));
    const updateWhereMock = vi.fn().mockResolvedValue(undefined);
    const setMock = vi.fn(() => ({ where: updateWhereMock }));
    const updateMock = vi.fn(() => ({ set: setMock }));

    const tx: any = {
      select: vi.fn(() => makeSelectChain(whereMock)),
      update: updateMock,
      insert: insertMock,
    };

    const db: any = {
      transaction: vi.fn(async (fn: (txArg: unknown) => Promise<unknown>) => fn(tx)),
    };

    const result = await approveLeaveRequest(db, "org-1", "actor-1", "corr-1", {
      leaveRequestId: "leave-1",
      approved: true,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(HRM_ERROR_CODES.INVALID_EMPLOYMENT_STATE);
    }

    expect(updateWhereMock).not.toHaveBeenCalled();
    expect(valuesMock).not.toHaveBeenCalled();
  });
});
