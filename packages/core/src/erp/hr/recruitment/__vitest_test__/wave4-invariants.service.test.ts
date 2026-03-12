import { describe, expect, it, vi } from "vitest";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { acceptOffer } from "../services/accept-offer.service";
import { submitApplication } from "../services/submit-application.service";

function makeSelectChain(whereMock: any) {
  const chain: any = {
    from: () => chain,
    where: whereMock,
  };
  return chain;
}

describe("Wave 4 recruitment invariants", () => {
  it("blocks application submission when requisition is not approved", async () => {
    const whereMock = vi
      .fn()
      .mockResolvedValueOnce([{ id: "candidate-1" }])
      .mockResolvedValueOnce([{ id: "req-1", status: "draft" }]);

    const db: any = {
      select: vi.fn(() => makeSelectChain(whereMock)),
      transaction: vi.fn(),
    };

    const result = await submitApplication(db, "org-1", "actor-1", "corr-1", {
      candidateId: "candidate-1",
      requisitionId: "req-1",
      applicationDate: "2026-03-11",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(HRM_ERROR_CODES.CONFLICT);
    }
  });

  it("blocks duplicate application for same candidate and requisition", async () => {
    const whereMock = vi
      .fn()
      .mockResolvedValueOnce([{ id: "candidate-1" }])
      .mockResolvedValueOnce([{ id: "req-1", status: "approved" }])
      .mockResolvedValueOnce([{ id: "application-1" }]);

    const db: any = {
      select: vi.fn(() => makeSelectChain(whereMock)),
      transaction: vi.fn(),
    };

    const result = await submitApplication(db, "org-1", "actor-1", "corr-1", {
      candidateId: "candidate-1",
      requisitionId: "req-1",
      applicationDate: "2026-03-11",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(HRM_ERROR_CODES.CONFLICT);
    }
  });

  it("blocks accepting an offer twice", async () => {
    const whereMock = vi.fn().mockResolvedValueOnce([{ id: "offer-1", offerStatus: "accepted" }]);

    const db: any = {
      select: vi.fn(() => makeSelectChain(whereMock)),
      transaction: vi.fn(),
    };

    const result = await acceptOffer(db, "org-1", "actor-1", "corr-1", {
      offerId: "offer-1",
      acceptedAt: "2026-03-11",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(HRM_ERROR_CODES.CONFLICT);
    }
  });
});
