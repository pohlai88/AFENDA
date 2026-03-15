import { describe, expect, it, vi } from "vitest";
import { buildPayrollGlMapping } from "../services/build-payroll-gl-mapping.service";
import { postPayrollToGl } from "../services/post-payroll-to-gl.service";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";

function makeSelectChain(whereMock: (args: unknown) => Promise<unknown[]>, innerJoinMock?: () => unknown) {
  const chain: {
    from: () => unknown;
    innerJoin: (a: unknown, b: unknown) => unknown;
    where: (args: unknown) => Promise<unknown[]>;
  } = {
    from: () => chain,
    innerJoin: innerJoinMock ?? (() => chain),
    where: whereMock,
  };
  return chain;
}

describe("Payroll GL posting invariants", () => {
  it("returns error when no run employees found", async () => {
    const whereMock = vi.fn().mockResolvedValueOnce([]);

    const db: unknown = {
      select: vi.fn(() => makeSelectChain(whereMock)),
    };

    const result = await buildPayrollGlMapping(db as never, {
      orgId: "org-1",
      payrollRunId: "run-1",
      payrollPayableAccountCode: "2100",
    });

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.code).toBe("HRM_PAYROLL_RUN_NOT_FOUND");
    }
  });

  it("returns error when element has no glMappingCode", async () => {
    const whereMock = vi
      .fn()
      .mockResolvedValueOnce([{ id: "re-1", netAmount: "100", currencyCode: "USD" }])
      .mockResolvedValueOnce([
        {
          calculatedAmount: "100",
          currencyCode: "USD",
          elementCategory: "earning",
          glMappingCode: null,
        },
      ]);

    const db: unknown = {
      select: vi.fn(() => makeSelectChain(whereMock)),
    };

    const result = await buildPayrollGlMapping(db as never, {
      orgId: "org-1",
      payrollRunId: "run-1",
      payrollPayableAccountCode: "2100",
    });

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.code).toBe("HRM_PAYROLL_GL_MAPPING_INCOMPLETE");
    }
  });

  it("returns error when account not found for glMappingCode", async () => {
    const whereMock = vi
      .fn()
      .mockResolvedValueOnce([{ id: "re-1", netAmount: "100", currencyCode: "USD" }])
      .mockResolvedValueOnce([
        {
          calculatedAmount: "100",
          currencyCode: "USD",
          elementCategory: "earning",
          glMappingCode: "5000",
        },
      ])
      .mockResolvedValueOnce([]);

    const db: unknown = {
      select: vi.fn(() => makeSelectChain(whereMock)),
    };

    const result = await buildPayrollGlMapping(db as never, {
      orgId: "org-1",
      payrollRunId: "run-1",
      payrollPayableAccountCode: "2100",
    });

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.code).toBe("HRM_PAYROLL_GL_MAPPING_INCOMPLETE");
    }
  });

  it("builds balanced lines when mapping is complete", async () => {
    const whereMock = vi
      .fn()
      .mockResolvedValueOnce([{ id: "re-1", netAmount: "80", currencyCode: "USD" }])
      .mockResolvedValueOnce([
        { calculatedAmount: "100", currencyCode: "USD", elementCategory: "earning", glMappingCode: "5000" },
        { calculatedAmount: "20", currencyCode: "USD", elementCategory: "deduction", glMappingCode: "2101" },
      ])
      .mockResolvedValueOnce([
        { id: "acc-5000", code: "5000" },
        { id: "acc-2100", code: "2100" },
        { id: "acc-2101", code: "2101" },
      ]);

    const db: unknown = {
      select: vi.fn(() => makeSelectChain(whereMock)),
    };

    const result = await buildPayrollGlMapping(db as never, {
      orgId: "org-1",
      payrollRunId: "run-1",
      payrollPayableAccountCode: "2100",
    });

    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.lines.length).toBeGreaterThan(0);
      const totalDebit = result.lines.reduce((sum, l) => sum + l.debitMinor, 0n);
      const totalCredit = result.lines.reduce((sum, l) => sum + l.creditMinor, 0n);
      expect(totalDebit).toBe(totalCredit);
    }
  });
});

const ctx = { activeContext: { orgId: "org-1" as const } };
const policyCtx = { principalId: "actor-1" as const, permissionsSet: new Set<string>() };

describe("postPayrollToGl invariants", () => {
  it("blocks post when run is not approved", async () => {
    const whereMock = vi.fn().mockResolvedValueOnce([{ id: "run-1", status: "submitted" }]);

    const db: unknown = {
      select: vi.fn(() => ({
        from: () => ({ where: whereMock }),
      })),
      insert: vi.fn(),
    };

    const result = await postPayrollToGl(db as never, ctx, policyCtx, {
      payrollRunId: "run-1",
      idempotencyKey: "idem-1",
      correlationId: "corr-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(HRM_ERROR_CODES.CONFLICT);
    }
  });

  it("blocks post when payroll already posted to GL", async () => {
    const whereMock = vi
      .fn()
      .mockResolvedValueOnce([{ id: "run-1", status: "approved" }])
      .mockResolvedValueOnce([{ id: "posting-1", postingStatus: "posted" }]);

    const db: unknown = {
      select: vi.fn(() => ({
        from: () => ({ where: whereMock }),
      })),
      insert: vi.fn(),
    };

    const result = await postPayrollToGl(db as never, ctx, policyCtx, {
      payrollRunId: "run-1",
      idempotencyKey: "idem-1",
      correlationId: "corr-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(HRM_ERROR_CODES.PAYROLL_GL_POSTING_ALREADY_EXISTS);
    }
  });
});
