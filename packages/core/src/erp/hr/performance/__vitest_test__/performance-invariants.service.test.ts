import { describe, expect, it, vi } from "vitest";
import { createReviewCycle } from "../services/create-review-cycle.service";
import { submitSelfReview } from "../services/submit-self-review.service";
import { completeManagerReview } from "../services/complete-manager-review.service";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";

function makeSelectChain(whereMock: (args: unknown) => Promise<unknown[]>) {
  const chain: { from: () => unknown; where: (args: unknown) => Promise<unknown[]> } = {
    from: () => chain,
    where: whereMock,
  };
  return chain;
}

describe("Performance invariants", () => {
  it("blocks create review cycle when startDate > endDate", async () => {
    const whereMock = vi.fn().mockResolvedValueOnce([]);

    const db: unknown = {
      select: vi.fn(() => makeSelectChain(whereMock)),
      insert: vi.fn(),
    };

    const result = await createReviewCycle(
      db as never,
      "org-1",
      "actor-1",
      "corr-1",
      {
        cycleCode: "2026-Q1",
        cycleName: "Q1 2026",
        startDate: "2026-03-31",
        endDate: "2026-01-01",
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(HRM_ERROR_CODES.INVALID_INPUT);
    }
  });

  it("blocks submit self review when review is not draft", async () => {
    const whereMock = vi.fn().mockResolvedValueOnce([
      { id: "pr-1", status: "self_submitted" },
    ]);

    const db: unknown = {
      select: vi.fn(() => makeSelectChain(whereMock)),
      update: vi.fn(() => ({
        set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
      })),
      insert: vi.fn(),
    };

    const result = await submitSelfReview(db as never, "org-1", "actor-1", "corr-1", {
      performanceReviewId: "pr-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(HRM_ERROR_CODES.CONFLICT);
    }
  });

  it("blocks complete manager review when review is already completed", async () => {
    const whereMock = vi.fn().mockResolvedValueOnce([
      { id: "pr-1", status: "completed" },
    ]);

    const db: unknown = {
      select: vi.fn(() => makeSelectChain(whereMock)),
      update: vi.fn(),
      insert: vi.fn(),
    };

    const result = await completeManagerReview(db as never, "org-1", "actor-1", "corr-1", {
      performanceReviewId: "pr-1",
      overallRating: "exceeds",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(HRM_ERROR_CODES.CONFLICT);
    }
  });
});
