import { describe, expect, it, vi } from "vitest";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { transferEmployee } from "../services/transfer-employee.service";
import { assignPosition } from "../../organization/services/assign-position.service";

function makeSelectChain(whereMock: any) {
  const chain: any = {
    from: () => chain,
    where: whereMock,
  };
  return chain;
}

describe("Wave 5 core invariants", () => {
  it("blocks transfer when employment state is not transferable", async () => {
    const whereMock = vi.fn().mockResolvedValueOnce([{ id: "employment-1", status: "terminated" }]);

    const db: any = {
      select: vi.fn(() => makeSelectChain(whereMock)),
      transaction: vi.fn(),
    };

    const result = await transferEmployee(db, "org-1", "actor-1", "corr-1", {
      employmentId: "employment-1",
      effectiveFrom: "2026-04-01T00:00:00.000Z",
      legalEntityId: "le-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(HRM_ERROR_CODES.INVALID_EMPLOYMENT_STATE);
    }
  });

  it("blocks assign-position when position does not exist", async () => {
    const whereMock = vi.fn().mockResolvedValueOnce([]);

    const db: any = {
      select: vi.fn(() => makeSelectChain(whereMock)),
      transaction: vi.fn(),
    };

    const result = await assignPosition(db, "org-1", "actor-1", "corr-1", {
      employmentId: "employment-1",
      positionId: "position-missing",
      effectiveFrom: "2026-04-01T00:00:00.000Z",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(HRM_ERROR_CODES.POSITION_NOT_FOUND);
    }
  });
});