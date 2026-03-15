import { describe, expect, it } from "vitest";
import { createWorkforcePlan } from "../services/create-workforce-plan.service.js";
import { createScenario } from "../services/create-scenario.service.js";
import { setPositionBudget } from "../services/set-position-budget.service.js";
import { createHiringForecast } from "../services/create-hiring-forecast.service.js";

describe("Workforce planning services invariants", () => {
  it("createWorkforcePlan returns err when required fields are missing", async () => {
    const db = {} as any;
    const result = await createWorkforcePlan(db, "org-1", "actor-1", "corr-1", {
      planCode: "",
      planName: "",
      planYear: 2025,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_INVALID_INPUT");
    }
  });

  it("createScenario returns err when required fields are missing", async () => {
    const db = {} as any;
    const result = await createScenario(db, "org-1", "actor-1", "corr-1", {
      workforcePlanId: "",
      scenarioName: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_INVALID_INPUT");
    }
  });

  it("setPositionBudget returns err when required fields are missing", async () => {
    const db = {} as any;
    const result = await setPositionBudget(db, "org-1", "actor-1", "corr-1", {
      orgUnitId: "",
      positionId: "",
      planYear: 2025,
      approvedHeadcount: 1,
      budgetAmount: BigInt(100000),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_INVALID_INPUT");
    }
  });

  it("setPositionBudget returns err when approvedHeadcount is negative", async () => {
    const db = {} as any;
    const result = await setPositionBudget(db, "org-1", "actor-1", "corr-1", {
      orgUnitId: "ou-1",
      positionId: "pos-1",
      planYear: 2025,
      approvedHeadcount: -1,
      budgetAmount: BigInt(100000),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_INVALID_INPUT");
    }
  });

  it("createHiringForecast returns err when required fields are missing", async () => {
    const db = {} as any;
    const result = await createHiringForecast(db, "org-1", "actor-1", "corr-1", {
      workforcePlanId: "",
      positionId: "",
      quarter: "2025-Q1",
      plannedHires: 2,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_INVALID_INPUT");
    }
  });

  it("createHiringForecast returns err when plannedHires is negative", async () => {
    const db = {} as any;
    const result = await createHiringForecast(db, "org-1", "actor-1", "corr-1", {
      workforcePlanId: "plan-1",
      positionId: "pos-1",
      quarter: "2025-Q1",
      plannedHires: -1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_INVALID_INPUT");
    }
  });
});
