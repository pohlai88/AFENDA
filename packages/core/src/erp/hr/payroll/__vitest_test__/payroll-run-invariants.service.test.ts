import { describe, expect, it, vi } from "vitest";
import { createPayrollRun } from "../services/create-payroll-run.service";
import { submitPayrollRun } from "../services/submit-payroll-run.service";
import { approvePayrollRun } from "../services/approve-payroll-run.service";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";

function makeSelectChain(whereMock: (args: unknown) => Promise<unknown[]>) {
  const chain: { from: () => unknown; where: (args: unknown) => Promise<unknown[]> } = {
    from: () => chain,
    where: whereMock,
  };
  return chain;
}

describe("Payroll run invariants", () => {
  it("blocks create run when payrollPeriodId is missing", async () => {
    const db: unknown = { select: vi.fn(), insert: vi.fn() };

    const result = await createPayrollRun(db as never, "org-1", "actor-1", "corr-1", {
      payrollPeriodId: "",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(HRM_ERROR_CODES.INVALID_INPUT);
    }
  });

  it("blocks create run when period does not exist", async () => {
    const whereMock = vi.fn().mockResolvedValueOnce([]);

    const db: unknown = {
      select: vi.fn(() => makeSelectChain(whereMock)),
      insert: vi.fn(),
    };

    const result = await createPayrollRun(db as never, "org-1", "actor-1", "corr-1", {
      payrollPeriodId: "period-missing",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(HRM_ERROR_CODES.PAYROLL_PERIOD_NOT_FOUND);
    }
  });

  it("blocks submit when run is not in draft", async () => {
    const whereMock = vi.fn().mockResolvedValueOnce([{ id: "run-1", status: "submitted" }]);

    const db: unknown = {
      select: vi.fn(() => makeSelectChain(whereMock)),
      update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })) })),
      insert: vi.fn(),
    };

    const result = await submitPayrollRun(db as never, "org-1", "actor-1", "corr-1", {
      payrollRunId: "run-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(HRM_ERROR_CODES.CONFLICT);
    }
  });

  it("blocks approve when run is not submitted", async () => {
    const whereMock = vi.fn().mockResolvedValueOnce([{ id: "run-1", status: "draft" }]);

    const db: unknown = {
      select: vi.fn(() => makeSelectChain(whereMock)),
      update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })) })),
      insert: vi.fn(),
    };

    const result = await approvePayrollRun(db as never, "org-1", "actor-1", "corr-1", {
      payrollRunId: "run-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(HRM_ERROR_CODES.CONFLICT);
    }
  });
});
