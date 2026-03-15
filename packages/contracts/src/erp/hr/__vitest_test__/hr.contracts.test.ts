import { describe, expect, it } from "vitest";
import {
  CreatePersonCommandSchema,
  HireEmployeeCommandSchema,
  CreateOrgUnitCommandSchema,
  ListRequisitionsResultSchema,
  StartOnboardingCommandSchema,
  SeparationCaseViewSchema,
  CreatePayrollRunCommandSchema,
  SubmitPayrollRunCommandSchema,
  HrmPayrollRunSchema,
} from "../index.js";

describe("hr contracts", () => {
  const idempotencyKey = "123e4567-e89b-12d3-a456-426614174000";
  const id = "123e4567-e89b-12d3-a456-426614174000";

  it("validates core create-person command", () => {
    const parsed = CreatePersonCommandSchema.parse({
      idempotencyKey,
      legalName: "Ada Lovelace",
      firstName: "Ada",
      lastName: "Lovelace",
    });

    expect(parsed.legalName).toBe("Ada Lovelace");
  });

  it("rejects invalid worker type in hire command", () => {
    const result = HireEmployeeCommandSchema.safeParse({
      idempotencyKey,
      personId: id,
      workerType: "freelancer",
      legalEntityId: id,
      employmentType: "permanent",
      hireDate: "2026-03-01",
      startDate: "2026-03-10",
    });

    expect(result.success).toBe(false);
  });

  it("validates organization create-org-unit command", () => {
    const parsed = CreateOrgUnitCommandSchema.parse({
      idempotencyKey,
      legalEntityId: id,
      orgUnitName: "Finance",
    });

    expect(parsed.orgUnitName).toBe("Finance");
  });

  it("validates recruitment list-requisitions result", () => {
    const parsed = ListRequisitionsResultSchema.parse({
      items: [
        {
          requisitionId: id,
          requisitionNumber: "REQ-1",
          requisitionTitle: "Senior Accountant",
          legalEntityId: id,
          orgUnitId: null,
          positionId: null,
          hiringManagerEmployeeId: null,
          requestedHeadcount: "1",
          requestedStartDate: null,
          status: "approved",
        },
      ],
      total: 1,
      limit: 25,
      offset: 0,
    });

    expect(parsed.total).toBe(1);
  });

  it("validates onboarding start command", () => {
    const parsed = StartOnboardingCommandSchema.parse({
      idempotencyKey,
      employmentId: id,
      tasks: [{ taskTitle: "Collect docs" }],
    });

    expect(parsed.tasks?.[0]?.taskTitle).toBe("Collect docs");
  });

  it("validates onboarding separation case view", () => {
    const parsed = SeparationCaseViewSchema.parse({
      caseNumber: "CASE-1",
      lastWorkingDate: "2026-03-31",
      noticeGivenAt: null,
      reasonCode: null,
      status: "open",
      clearanceItems: [],
      separationCaseId: id,
      employmentId: id,
      caseStatus: "open",
      separationType: null,
      initiatedAt: null,
      targetLastWorkingDate: null,
      closedAt: null,
      items: [],
    });

    expect(parsed.separationCaseId).toBe(id);
  });

  it("validates payroll run command and entity", () => {
    const command = CreatePayrollRunCommandSchema.parse({
      idempotencyKey,
      payrollPeriodId: id,
      runNumber: "PR-2026-03",
      runType: "regular",
    });

    const run = HrmPayrollRunSchema.parse({
      id,
      orgId: id,
      payrollPeriodId: id,
      runType: "regular",
      runNumber: command.runNumber ?? "PR-2026-03",
      status: "draft",
      submittedAt: null,
      submittedBy: null,
      approvedAt: null,
      approvedBy: null,
      createdAt: "2026-03-13T00:00:00.000Z",
      updatedAt: "2026-03-13T00:00:00.000Z",
    });

    expect(run.status).toBe("draft");
  });

  it("rejects payroll submit command without payrollRunId", () => {
    const result = SubmitPayrollRunCommandSchema.safeParse({ idempotencyKey });
    expect(result.success).toBe(false);
  });
});
