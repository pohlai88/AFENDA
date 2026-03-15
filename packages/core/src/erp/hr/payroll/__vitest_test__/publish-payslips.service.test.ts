import { describe, expect, it, vi } from "vitest";
import { publishPayslips } from "../services/publish-payslips.service";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";

function makeSelectChain(whereMock: (args: unknown) => Promise<unknown[]>) {
  const chain: { from: () => unknown; innerJoin?: (table: unknown, on: unknown) => unknown; where: (args: unknown) => Promise<unknown[]> } = {
    from: () => chain,
    innerJoin: () => chain,
    where: whereMock,
  };
  return chain;
}

describe("Publish payslips invariants", () => {
  it("blocks publish when payrollRunId is missing", async () => {
    const db: unknown = { select: vi.fn(), insert: vi.fn() };

    const result = await publishPayslips(db as never, "org-1", "actor-1", "corr-1", {
      payrollRunId: "",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(HRM_ERROR_CODES.INVALID_INPUT);
    }
  });

  it("blocks publish when run is not found", async () => {
    const whereMock = vi.fn().mockResolvedValueOnce([]);

    const db: unknown = {
      select: vi.fn(() => makeSelectChain(whereMock)),
      insert: vi.fn(),
    };

    const result = await publishPayslips(db as never, "org-1", "actor-1", "corr-1", {
      payrollRunId: "run-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(HRM_ERROR_CODES.PAYROLL_RUN_NOT_FOUND);
    }
  });

  it("blocks publish when run is not approved", async () => {
    const whereMock = vi.fn().mockResolvedValueOnce([{ id: "run-1", status: "submitted", runNumber: "RUN-1" }]);

    const db: unknown = {
      select: vi.fn(() => makeSelectChain(whereMock)),
      insert: vi.fn(),
    };

    const result = await publishPayslips(db as never, "org-1", "actor-1", "corr-1", {
      payrollRunId: "run-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(HRM_ERROR_CODES.CONFLICT);
    }
  });

  it("blocks publish when payslips already published", async () => {
    const whereMock = vi
      .fn()
      .mockResolvedValueOnce([{ id: "run-1", status: "approved", runNumber: "RUN-1" }])
      .mockResolvedValueOnce([{ id: "ps-1" }]);

    const db: unknown = {
      select: vi.fn(() => makeSelectChain(whereMock)),
      insert: vi.fn(),
    };

    const result = await publishPayslips(db as never, "org-1", "actor-1", "corr-1", {
      payrollRunId: "run-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(HRM_ERROR_CODES.PAYSLIPS_ALREADY_PUBLISHED);
    }
  });
});
