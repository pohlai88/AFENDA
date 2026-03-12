import { describe, expect, it, vi } from "vitest";
import { getCandidatePipelineViewByCandidate } from "../queries/get-candidate-pipeline.query";

function makeSelectChain(whereMock: any) {
  const chain: any = {
    from: () => chain,
    innerJoin: () => chain,
    leftJoin: () => chain,
    where: whereMock,
  };
  return chain;
}

describe("Wave 5 recruitment read models", () => {
  it("returns candidate pipeline as grouped applications", async () => {
    const whereMock = vi.fn().mockResolvedValueOnce([
      {
        applicationId: "a1",
        requisitionId: "r1",
        candidateId: "c1",
        candidateCode: "CAN-001",
        fullName: "Taylor Case",
        candidateStatus: "active",
        applicationStage: "interview",
        appliedAt: "2026-03-01",
        interviewId: "i1",
        interviewType: "screen",
        interviewScheduledAt: "2026-03-03",
        interviewStatus: "scheduled",
        feedbackId: null,
        recommendation: null,
        offerId: "o1",
        offerNumber: "OFF-001",
        offerStatus: "issued",
      },
    ]);

    const db: any = {
      select: vi.fn(() => makeSelectChain(whereMock)),
    };

    const result = await getCandidatePipelineViewByCandidate(db, "org-1", "c1");

    expect(result).not.toBeNull();
    expect(result?.candidateId).toBe("c1");
    expect(result?.currentStatus).toBe("active");
    expect(result?.applications).toHaveLength(1);
    expect(result?.applications[0]?.interviews[0]?.interviewId).toBe("i1");
    expect(result?.applications[0]?.offers[0]?.offerId).toBe("o1");
  });
});
