import { describe, expect, it, vi } from "vitest";
import { createGrievanceCase } from "../services/create-grievance-case.service.js";
import { createDisciplinaryAction } from "../services/create-disciplinary-action.service.js";
import { attachEvidence } from "../services/attach-evidence.service.js";
import { closeGrievanceCase } from "../services/close-grievance-case.service.js";
import { closeDisciplinaryAction } from "../services/close-disciplinary-action.service.js";

describe("Employee relations services invariants", () => {
  it("createGrievanceCase returns err when required fields are missing", async () => {
    const db = {} as any;
    const result = await createGrievanceCase(db, "org-1", "actor-1", "corr-1", {
      employmentId: "",
      caseType: "grievance",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_INVALID_INPUT");
    }
  });

  it("createDisciplinaryAction returns err when required fields are missing", async () => {
    const db = {} as any;
    const result = await createDisciplinaryAction(db, "org-1", "actor-1", "corr-1", {
      employmentId: "",
      actionType: "warning",
      effectiveDate: "2025-01-01",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_INVALID_INPUT");
    }
  });

  it("attachEvidence returns err when required fields are missing", async () => {
    const db = {} as any;
    const result = await attachEvidence(db, "org-1", "actor-1", "corr-1", {
      caseType: "grievance",
      caseId: "",
      evidenceType: "document",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_INVALID_INPUT");
    }
  });

  it("closeGrievanceCase returns err when grievanceCaseId is missing", async () => {
    const db = {} as any;
    const result = await closeGrievanceCase(db, "org-1", "actor-1", "corr-1", {
      grievanceCaseId: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_INVALID_INPUT");
    }
  });

  it("closeDisciplinaryAction returns err when required fields are missing", async () => {
    const db = {} as any;
    const result = await closeDisciplinaryAction(db, "org-1", "actor-1", "corr-1", {
      disciplinaryActionId: "",
      status: "active",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_INVALID_INPUT");
    }
  });

  it("closeGrievanceCase returns err when case is already closed", async () => {
    const whereMock = vi.fn().mockResolvedValueOnce([
      { id: "gc-1", status: "closed", employmentId: "emp-1" },
    ]);
    const db = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({ where: whereMock }),
      }),
      update: vi.fn(),
      insert: vi.fn(),
    } as any;
    const result = await closeGrievanceCase(db, "org-1", "actor-1", "corr-1", {
      grievanceCaseId: "gc-1",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_CONFLICT");
    }
  });
});
