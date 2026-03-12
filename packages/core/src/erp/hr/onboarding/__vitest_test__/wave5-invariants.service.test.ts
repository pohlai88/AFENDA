import { describe, expect, it, vi } from "vitest";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { recordProbationReview } from "../services/record-probation-review.service";

function makeSelectChain(whereMock: any) {
  const chain: any = {
    from: () => chain,
    where: whereMock,
  };
  return chain;
}

describe("Wave 5 onboarding invariants", () => {
  it("blocks probation review when employment does not exist", async () => {
    const whereMock = vi.fn().mockResolvedValueOnce([]);

    const db: any = {
      select: vi.fn(() => makeSelectChain(whereMock)),
      transaction: vi.fn(),
    };

    const result = await recordProbationReview(db, "org-1", "actor-1", "corr-1", {
      employmentId: "employment-missing",
      reviewDueDate: "2026-04-01",
      reviewStatus: "confirmed",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(HRM_ERROR_CODES.EMPLOYMENT_NOT_FOUND);
    }
  });

  it("blocks probation review when required review fields are absent", async () => {
    const whereMock = vi.fn().mockResolvedValueOnce([{ id: "employment-1" }]);

    const db: any = {
      select: vi.fn(() => makeSelectChain(whereMock)),
      transaction: vi.fn(),
    };

    const result = await recordProbationReview(db, "org-1", "actor-1", "corr-1", {
      employmentId: "employment-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(HRM_ERROR_CODES.INVALID_INPUT);
    }
  });
});