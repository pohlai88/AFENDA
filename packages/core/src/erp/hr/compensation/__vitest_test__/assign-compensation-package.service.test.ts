import { describe, expect, it, vi } from "vitest";
import { assignCompensationPackage } from "../services/assign-compensation-package.service";

const mockDb = {
  transaction: vi.fn(),
} as unknown as Parameters<typeof assignCompensationPackage>[0];

describe("assignCompensationPackage — invariants", () => {
  it("returns INVALID_INPUT when required fields are missing", async () => {
    const result = await assignCompensationPackage(mockDb, "org-1", "actor-1", "corr-1", {
      employmentId: "",
      compensationStructureId: "",
      salaryAmount: "",
      effectiveFrom: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_INVALID_INPUT");
    }
  });

  it("returns INVALID_INPUT when salaryAmount is zero or negative", async () => {
    const result = await assignCompensationPackage(mockDb, "org-1", "actor-1", "corr-1", {
      employmentId: "emp-uuid",
      compensationStructureId: "struct-uuid",
      salaryAmount: "-500",
      effectiveFrom: "2026-01-01",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_INVALID_INPUT");
      expect(result.error.message).toMatch(/positive/i);
    }
  });
});
