import { describe, expect, it, vi } from "vitest";
import { assignPosition } from "../services/assign-position.service";
import { closePosition } from "../services/close-position.service";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";

function makeSelectChain(whereMock: any) {
  const chain: any = {
    from: () => chain,
    where: whereMock,
  };
  return chain;
}

describe("Organization position lifecycle invariants", () => {
  it("blocks assign-position when required fields are missing", async () => {
    const db: any = {
      select: vi.fn(),
      transaction: vi.fn(),
    };

    const result = await assignPosition(db, "org-1", "actor-1", "corr-1", {
      employmentId: "",
      positionId: "",
      effectiveFrom: "",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(HRM_ERROR_CODES.INVALID_INPUT);
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

  it("blocks close-position when required fields are missing", async () => {
    const db: any = {
      select: vi.fn(),
      transaction: vi.fn(),
    };

    const result = await closePosition(db, "org-1", "actor-1", "corr-1", {
      positionId: "",
      effectiveTo: "",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(HRM_ERROR_CODES.INVALID_INPUT);
    }
  });

  it("closes position and emits audit/outbox payload", async () => {
    const whereMock = vi.fn().mockResolvedValueOnce([{ id: "position-1", status: "open" }]);

    const updateWhereMock = vi.fn().mockResolvedValue(undefined);
    const setMock = vi.fn(() => ({ where: updateWhereMock }));
    const updateMock = vi.fn(() => ({ set: setMock }));

    const valuesMock = vi.fn().mockResolvedValue(undefined);
    const insertMock = vi.fn(() => ({ values: valuesMock }));

    const tx: any = {
      update: updateMock,
      insert: insertMock,
    };

    const db: any = {
      select: vi.fn(() => makeSelectChain(whereMock)),
      transaction: vi.fn(async (fn: (txArg: unknown) => Promise<unknown>) => fn(tx)),
    };

    const result = await closePosition(db, "org-1", "actor-1", "corr-1", {
      positionId: "position-1",
      effectiveTo: "2026-05-01T00:00:00.000Z",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.positionId).toBe("position-1");
      expect(result.data.previousStatus).toBe("open");
      expect(result.data.currentStatus).toBe("closed");
    }

    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(updateWhereMock).toHaveBeenCalledTimes(1);
    expect(valuesMock).toHaveBeenCalledTimes(2);
  });
});
