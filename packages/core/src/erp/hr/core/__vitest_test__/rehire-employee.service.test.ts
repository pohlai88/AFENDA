import { describe, expect, it, vi } from "vitest";
import { rehireEmployee } from "../services/rehire-employee.service";

function makeSelectChain(whereMock: any) {
  const chain: any = {
    from: () => chain,
    innerJoin: () => chain,
    leftJoin: () => chain,
    where: whereMock,
    limit: () => chain,
    offset: () => chain,
  };
  return chain;
}

describe("rehireEmployee", () => {
  it("returns EMPLOYEE_NOT_FOUND when employee profile is missing", async () => {
    const whereMock = vi.fn().mockResolvedValueOnce([]);
    const db: any = {
      select: vi.fn(() => makeSelectChain(whereMock)),
      transaction: vi.fn(),
    };

    const result = await rehireEmployee(db, "org-1", "actor-1", "corr-1", {
      employeeId: "emp-1",
      legalEntityId: "le-1",
      employmentType: "permanent",
      hireDate: "2026-03-01",
      startDate: "2026-03-01",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_EMPLOYEE_NOT_FOUND");
    }
  });

  it("returns EMPLOYMENT_ALREADY_ACTIVE when active employment exists", async () => {
    const whereMock = vi
      .fn()
      .mockResolvedValueOnce([{ id: "emp-1" }])
      .mockResolvedValueOnce([{ id: "active-employment" }]);
    const db: any = {
      select: vi.fn(() => makeSelectChain(whereMock)),
      transaction: vi.fn(),
    };

    const result = await rehireEmployee(db, "org-1", "actor-1", "corr-1", {
      employeeId: "emp-1",
      legalEntityId: "le-1",
      employmentType: "permanent",
      hireDate: "2026-03-01",
      startDate: "2026-03-01",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_EMPLOYMENT_ALREADY_ACTIVE");
    }
  });

  it("returns success and contractId when contract payload is provided", async () => {
    const whereMock = vi
      .fn()
      .mockResolvedValueOnce([{ id: "emp-1" }])
      .mockResolvedValueOnce([]);

    const returningQueue: Array<Array<{ id: string }>> = [
      [{ id: "employment-1" }],
      [{ id: "assignment-1" }],
      [{ id: "contract-1" }],
    ];

    const tx: any = {
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(async () => returningQueue.shift() ?? []),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({ where: vi.fn(async () => undefined) })),
      })),
    };

    const db: any = {
      select: vi.fn(() => makeSelectChain(whereMock)),
      transaction: vi.fn(async (fn: any) => fn(tx)),
    };

    const result = await rehireEmployee(db, "org-1", "actor-1", "corr-1", {
      employeeId: "emp-1",
      legalEntityId: "le-1",
      employmentType: "permanent",
      hireDate: "2026-03-01",
      startDate: "2026-03-01",
      contract: {
        contractType: "permanent",
        contractStartDate: "2026-03-01",
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.employmentId).toBe("employment-1");
      expect(result.data.workAssignmentId).toBe("assignment-1");
      expect(result.data.contractId).toBe("contract-1");
    }
  });
});
