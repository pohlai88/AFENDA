import { describe, expect, it, vi } from "vitest";
import { getEmploymentTimeline } from "../queries/get-employment-timeline.query";

function makeWhereOnlySelectChain(result: any) {
  const chain: any = {
    from: () => chain,
    where: vi.fn().mockResolvedValue(result),
  };

  return chain;
}

function makeWhereThenOrderBySelectChain(result: any) {
  const chain: any = {
    from: () => chain,
    where: () => chain,
    orderBy: vi.fn().mockResolvedValue(result),
  };

  return chain;
}

describe("Wave 5 core read models", () => {
  it("returns timeline events sorted chronologically", async () => {
    const employmentRows = [
      {
        employmentId: "emp-1",
        employeeId: "person-1",
        employmentNumber: "EMP-001",
        employmentStatus: "active",
        hireDate: "2026-01-01",
        startDate: "2026-01-05",
        terminationDate: null,
        legalEntityId: "le-1",
      },
    ];

    const statusRows = [
      {
        changedAt: "2026-01-10T00:00:00.000Z",
        oldStatus: "pending",
        newStatus: "active",
        reasonCode: "CONFIRMED",
      },
    ];

    const assignmentRows = [
      {
        workAssignmentId: "wa-1",
        effectiveFrom: new Date("2026-01-08T00:00:00.000Z"),
        effectiveTo: null,
        changeReason: "INITIAL_ASSIGNMENT",
        legalEntityId: "le-1",
        departmentId: "dep-1",
        positionId: "pos-1",
        jobId: "job-1",
        gradeId: "grade-1",
        managerEmployeeId: "mgr-1",
        assignmentStatus: "active",
      },
    ];

    const db: any = {
      select: vi
        .fn()
        .mockImplementationOnce(() => makeWhereOnlySelectChain(employmentRows))
        .mockImplementationOnce(() => makeWhereThenOrderBySelectChain(statusRows))
        .mockImplementationOnce(() => makeWhereThenOrderBySelectChain(assignmentRows)),
    };

    const result = await getEmploymentTimeline(db, "org-1", "emp-1");

    expect(result).not.toBeNull();
    expect(result?.events).toHaveLength(2);
    expect(result?.events[0]).toMatchObject({ type: "assignment", workAssignmentId: "wa-1" });
    expect(result?.events[1]).toMatchObject({ type: "status", newStatus: "active" });
  });
});
