import { describe, expect, it, vi } from "vitest";
import { enrollBenefit } from "../services/enroll-benefit.service";

const mockDb = {
  transaction: vi.fn(),
} as unknown as Parameters<typeof enrollBenefit>[0];

describe("enrollBenefit — invariants", () => {
  it("returns INVALID_INPUT when required fields are missing", async () => {
    const result = await enrollBenefit(mockDb, "org-1", "actor-1", "corr-1", {
      employmentId: "",
      benefitPlanId: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_INVALID_INPUT");
    }
  });

  it("returns CONFLICT when enrollment already exists (mocked transaction)", async () => {
    const mockDbWithConflict = {
      transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => Promise.resolve([{ id: "existing-enrollment-id" }]),
              }),
            }),
          }),
          insert: vi.fn(),
        };
        return fn(tx);
      }),
    } as unknown as Parameters<typeof enrollBenefit>[0];

    const result = await enrollBenefit(mockDbWithConflict, "org-1", "actor-1", "corr-1", {
      employmentId: "emp-uuid",
      benefitPlanId: "plan-uuid",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_CONFLICT");
      expect(result.error.message).toMatch(/already.*enrolled/i);
    }
  });
});
