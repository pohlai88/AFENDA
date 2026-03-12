import { describe, expect, it, vi } from "vitest";
import { createRosterAssignment } from "../services/create-roster-assignment.service";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";

function makeSelectChain(whereMock: any) {
  const chain: any = {
    from: () => chain,
    where: whereMock,
  };
  return chain;
}

describe("Roster assignment invariants", () => {
  it("blocks assignment when required fields are missing", async () => {
    const db: any = {
      transaction: vi.fn(),
    };

    const result = await createRosterAssignment(db, "org-1", "actor-1", "corr-1", {
      employmentId: "",
      shiftId: "",
      workDate: "",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(HRM_ERROR_CODES.INVALID_INPUT);
    }
  });

  it("blocks assignment overlap on the same work date", async () => {
    const whereMock = vi.fn().mockResolvedValueOnce([{ id: "existing-roster" }]);
    const tx: any = {
      select: vi.fn(() => makeSelectChain(whereMock)),
      insert: vi.fn(),
    };

    const db: any = {
      transaction: vi.fn(async (fn: (txArg: unknown) => Promise<unknown>) => fn(tx)),
    };

    const result = await createRosterAssignment(db, "org-1", "actor-1", "corr-1", {
      employmentId: "employment-1",
      shiftId: "shift-1",
      workDate: "2026-04-01",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(HRM_ERROR_CODES.ROSTER_ASSIGNMENT_OVERLAP);
    }
  });
});
