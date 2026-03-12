import { describe, expect, it, vi } from "vitest";
import { scheduleInterview } from "../services/schedule-interview.service";
import { submitInterviewFeedback } from "../services/submit-interview-feedback.service";

function makeSelectChain(whereMock: any) {
  const chain: any = {
    from: () => chain,
    where: whereMock,
  };
  return chain;
}

describe("Wave 5 recruitment write compatibility", () => {
  it("rejects schedule interview when scheduledAt is missing", async () => {
    const whereMock = vi.fn().mockResolvedValueOnce([{ id: "app-1" }]);
    const db: any = {
      select: vi.fn(() => makeSelectChain(whereMock)),
      transaction: vi.fn(),
    };

    const result = await scheduleInterview(db, "org-1", "actor-1", "corr-1", {
      applicationId: "app-1",
      interviewType: "screen",
      scheduledAt: "",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_INVALID_INPUT");
    }
  });

  it("prefers feedbackText over comments and returns Wave 5 output aliases", async () => {
    const whereMock = vi.fn().mockResolvedValueOnce([{ id: "int-1" }]);
    const insertPayloads: unknown[] = [];

    const tx: any = {
      insert: vi.fn(() => ({
        values: (value: unknown) => {
          insertPayloads.push(value);
          return {
            returning: async () => [{ id: "fb-1" }],
          };
        },
      })),
    };

    const db: any = {
      select: vi.fn(() => makeSelectChain(whereMock)),
      transaction: vi.fn(async (fn: any) => fn(tx)),
    };

    const result = await submitInterviewFeedback(db, "org-1", "actor-1", "corr-1", {
      interviewId: "int-1",
      feedbackText: "wave5-text",
      comments: "legacy-comments",
      recommendation: "hire",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.feedbackId).toBe("fb-1");
      expect(result.data.interviewFeedbackId).toBe("fb-1");
      expect(result.data.interviewId).toBe("int-1");
    }

    const firstInsert = insertPayloads[0] as { comments?: string } | undefined;
    expect(firstInsert?.comments).toBe("wave5-text");
  });
});
