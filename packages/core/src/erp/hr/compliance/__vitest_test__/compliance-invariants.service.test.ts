import { describe, expect, it, vi } from "vitest";
import { createPolicyDocument } from "../services/create-policy-document.service.js";
import { recordPolicyAcknowledgement } from "../services/record-policy-acknowledgement.service.js";
import { createComplianceCheck } from "../services/create-compliance-check.service.js";
import { recordWorkPermit } from "../services/record-work-permit.service.js";

describe("Compliance services invariants", () => {
  it("createPolicyDocument returns err when required fields are missing", async () => {
    const db = {} as any;
    const result = await createPolicyDocument(db, "org-1", "actor-1", "corr-1", {
      documentCode: "",
      documentName: "",
      version: "",
      effectiveFrom: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_INVALID_INPUT");
    }
  });

  it("recordPolicyAcknowledgement returns err when employmentId and policyDocumentId are missing", async () => {
    const db = {} as any;
    const result = await recordPolicyAcknowledgement(db, "org-1", "actor-1", "corr-1", {
      employmentId: "",
      policyDocumentId: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_INVALID_INPUT");
    }
  });

  it("createComplianceCheck returns err when required fields are missing", async () => {
    const db = {} as any;
    const result = await createComplianceCheck(db, "org-1", "actor-1", "corr-1", {
      employmentId: "",
      checkType: "",
      checkDate: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_INVALID_INPUT");
    }
  });

  it("recordWorkPermit returns err when required fields are missing", async () => {
    const db = {} as any;
    const result = await recordWorkPermit(db, "org-1", "actor-1", "corr-1", {
      employmentId: "",
      permitType: "",
      permitNumber: "",
      issuedDate: "",
      expiryDate: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_INVALID_INPUT");
    }
  });

  it("recordWorkPermit returns err when issuedDate > expiryDate", async () => {
    const db = {} as any;
    const result = await recordWorkPermit(db, "org-1", "actor-1", "corr-1", {
      employmentId: "emp-1",
      permitType: "work_visa",
      permitNumber: "WP-001",
      issuedDate: "2025-12-01",
      expiryDate: "2025-01-01",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_INVALID_INPUT");
    }
  });

  it("recordPolicyAcknowledgement returns err when duplicate for same document/employee", async () => {
    const whereMock = vi.fn()
      .mockResolvedValueOnce([{ id: "emp-1" }])
      .mockResolvedValueOnce([{ id: "doc-1" }])
      .mockResolvedValueOnce([{ id: "ack-1" }]);
    const db = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({ where: whereMock }),
      }),
      insert: vi.fn(),
    } as any;
    const result = await recordPolicyAcknowledgement(db, "org-1", "actor-1", "corr-1", {
      employmentId: "emp-1",
      policyDocumentId: "doc-1",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_POLICY_ACKNOWLEDGEMENT_ALREADY_EXISTS");
    }
  });
});
