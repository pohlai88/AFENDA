import { describe, expect, it } from "vitest";
import { createTalentProfile } from "../services/create-talent-profile.service.js";
import { createSuccessionPlan } from "../services/create-succession-plan.service.js";
import { nominateSuccessor } from "../services/nominate-successor.service.js";

describe("Talent services invariants", () => {
  it("createTalentProfile returns err when employmentId is missing", async () => {
    const db = {} as any;
    const result = await createTalentProfile(db, "org-1", "actor-1", "corr-1", {
      employmentId: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_INVALID_INPUT");
    }
  });

  it("createSuccessionPlan returns err when positionId is missing", async () => {
    const db = {} as any;
    const result = await createSuccessionPlan(db, "org-1", "actor-1", "corr-1", {
      positionId: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_INVALID_INPUT");
    }
  });

  it("nominateSuccessor returns err when required fields are missing", async () => {
    const db = {} as any;
    const result = await nominateSuccessor(db, "org-1", "actor-1", "corr-1", {
      successionPlanId: "",
      employmentId: "",
      readinessLevel: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_INVALID_INPUT");
    }
  });
});
