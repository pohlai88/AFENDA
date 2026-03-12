import { describe, expect, it, vi } from "vitest";
import { recordProbationReview } from "../services/record-probation-review.service";

function makeSelectChain(whereMock: any) {
  const chain: any = {
    from: () => chain,
    where: whereMock,
  };
  return chain;
}

describe("Wave 5 probation write compatibility", () => {
  it("accepts reviewDueDate/reviewStatus and returns normalized output", async () => {
    const whereMock = vi.fn().mockResolvedValueOnce([{ id: "employment-1" }]);

    const tx: any = {
      insert: vi.fn(() => ({
        values: () => ({
          returning: async () => [{ id: "pr-1" }],
        }),
      })),
    };

    const db: any = {
      select: vi.fn(() => makeSelectChain(whereMock)),
      transaction: vi.fn(async (fn: any) => fn(tx)),
    };

    const result = await recordProbationReview(db, "org-1", "actor-1", "corr-1", {
      employmentId: "employment-1",
      reviewDueDate: "2026-04-01",
      reviewStatus: "confirmed",
      decisionCode: "PASS",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.probationReviewId).toBe("pr-1");
      expect(result.data.employmentId).toBe("employment-1");
      expect(result.data.reviewStatus).toBe("confirmed");
    }
  });
});
