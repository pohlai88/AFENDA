import { describe, expect, it, vi } from "vitest";
import { openPayrollPeriod } from "../services/open-payroll-period.service";
import { lockPayrollPeriod } from "../services/lock-payroll-period.service";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";

function makeSelectChain(whereMock: (args: unknown) => Promise<unknown[]>) {
  const chain: { from: () => unknown; where: (args: unknown) => Promise<unknown[]> } = {
    from: () => chain,
    where: whereMock,
  };
  return chain;
}

describe("Payroll period invariants", () => {
  it("blocks open period when required fields are missing", async () => {
    const db: unknown = {
      select: vi.fn(),
      insert: vi.fn(),
    };

    const result = await openPayrollPeriod(
      db as never,
      "org-1",
      "actor-1",
      "corr-1",
      {
        periodCode: "",
        periodStartDate: "",
        periodEndDate: "",
        paymentDate: "",
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(HRM_ERROR_CODES.INVALID_INPUT);
    }
  });

  it("blocks open period when periodStartDate > periodEndDate", async () => {
    const db: unknown = {
      select: vi.fn(),
      insert: vi.fn(),
    };

    const result = await openPayrollPeriod(
      db as never,
      "org-1",
      "actor-1",
      "corr-1",
      {
        periodCode: "2026-01",
        periodStartDate: "2026-01-31",
        periodEndDate: "2026-01-01",
        paymentDate: "2026-02-05",
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(HRM_ERROR_CODES.INVALID_INPUT);
    }
  });

  it("blocks lock when period is not open", async () => {
    const whereMock = vi.fn().mockResolvedValueOnce([{ id: "period-1", periodStatus: "locked" }]);

    const db: unknown = {
      select: vi.fn(() => makeSelectChain(whereMock)),
      update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })) })),
      insert: vi.fn(),
    };

    const result = await lockPayrollPeriod(db as never, "org-1", "actor-1", "corr-1", {
      payrollPeriodId: "period-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(HRM_ERROR_CODES.CONFLICT);
    }
  });
});
