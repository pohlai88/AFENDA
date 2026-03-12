import { describe, expect, it, vi } from "vitest";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { finalizeSeparation } from "../services/finalize-separation.service";

function makeSelectChain(whereMock: any) {
  const chain: any = {
    from: () => chain,
    where: whereMock,
  };
  return chain;
}

describe("Wave 4 onboarding invariants", () => {
  it("blocks separation finalization when mandatory clearance is pending", async () => {
    const whereMock = vi
      .fn()
      .mockResolvedValueOnce([{ id: "case-1", caseStatus: "open" }])
      .mockResolvedValueOnce([{ id: "item-1" }]);

    const db: any = {
      select: vi.fn(() => makeSelectChain(whereMock)),
      transaction: vi.fn(),
    };

    const result = await finalizeSeparation(db, "org-1", "actor-1", "corr-1", {
      separationCaseId: "case-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(HRM_ERROR_CODES.CONFLICT);
    }
  });
});
