import { describe, expect, it, vi } from "vitest";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { scheduleInterview } from "../services/schedule-interview.service";
import { submitInterviewFeedback } from "../services/submit-interview-feedback.service";

function makeSelectChain(whereMock: any) {
  const chain: any = {
    from: () => chain,
    where: whereMock,
  };
  return chain;
}

describe("Wave 5 recruitment invariants", () => {
  it("blocks interview scheduling when application does not exist", async () => {
    const whereMock = vi.fn().mockResolvedValueOnce([]);

    const db: any = {
      select: vi.fn(() => makeSelectChain(whereMock)),
      transaction: vi.fn(),
    };

    const result = await scheduleInterview(db, "org-1", "actor-1", "corr-1", {
      applicationId: "app-missing",
      interviewType: "panel",
      scheduledAt: "2026-03-20",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(HRM_ERROR_CODES.APPLICATION_NOT_FOUND);
    }
  });

  it("blocks feedback submission when interview does not exist", async () => {
    const whereMock = vi.fn().mockResolvedValueOnce([]);

    const db: any = {
      select: vi.fn(() => makeSelectChain(whereMock)),
      transaction: vi.fn(),
    };

    const result = await submitInterviewFeedback(db, "org-1", "actor-1", "corr-1", {
      interviewId: "int-missing",
      feedbackText: "Good candidate",
      recommendation: "hire",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(HRM_ERROR_CODES.INTERVIEW_NOT_FOUND);
    }
  });
});