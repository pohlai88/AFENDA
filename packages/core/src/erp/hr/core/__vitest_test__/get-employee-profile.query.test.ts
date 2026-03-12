import { describe, expect, it, vi } from "vitest";
import { getEmployeeProfile } from "../queries/get-employee-profile.query";

function makeSelectChain(whereMock: any) {
  const chain: any = {
    from: () => chain,
    innerJoin: () => chain,
    leftJoin: () => chain,
    where: whereMock,
  };
  return chain;
}

describe("getEmployeeProfile", () => {
  it("enriches manager display fields when managerEmployeeId exists", async () => {
    const whereMock = vi
      .fn()
      .mockResolvedValueOnce([
        {
          employeeId: "emp-1",
          employeeCode: "E-001",
          personId: "person-1",
          displayName: "Alice Employee",
          legalName: "Alice Employee",
          personalEmail: "alice@example.com",
          mobilePhone: null,
          workerType: "employee",
          currentStatus: "active",
          employmentId: "employment-1",
          employmentNumber: "EMR-001",
          employmentStatus: "active",
          legalEntityId: "le-1",
          hireDate: "2026-01-01",
          startDate: "2026-01-01",
          terminationDate: null,
          workAssignmentId: "wa-1",
          departmentId: "dept-1",
          departmentName: "Engineering",
          positionId: "pos-1",
          positionTitle: "Engineer",
          jobId: "job-1",
          gradeId: "grade-1",
          managerEmployeeId: "mgr-1",
        },
      ])
      .mockResolvedValueOnce([
        {
          managerEmployeeCode: "M-001",
          managerDisplayName: "Manager One",
          managerLegalName: "Manager One",
        },
      ]);

    const db: any = {
      select: vi.fn(() => makeSelectChain(whereMock)),
    };

    const profile = await getEmployeeProfile(db, "org-1", "emp-1");

    expect(profile).not.toBeNull();
    expect(profile?.departmentName).toBe("Engineering");
    expect(profile?.positionTitle).toBe("Engineer");
    expect(profile?.managerEmployeeCode).toBe("M-001");
    expect(profile?.managerDisplayName).toBe("Manager One");
  });
});
