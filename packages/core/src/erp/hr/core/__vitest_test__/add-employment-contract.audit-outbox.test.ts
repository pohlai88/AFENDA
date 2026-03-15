import { describe, expect, it, vi } from "vitest";
import { addEmploymentContract } from "../services/add-employment-contract.service";
import { HRM_EVENTS } from "../../shared/events/hrm-events";

function makeSelectChain(whereMock: (...args: unknown[]) => Promise<unknown>) {
  const chain: Record<string, unknown> = {
    from: () => chain,
    where: whereMock,
  };
  return chain;
}

describe("Add employment contract write-path evidence", () => {
  it("returns error when employment not found", async () => {
    const whereMock = vi.fn().mockResolvedValueOnce([]);

    const db: Record<string, unknown> = {
      select: vi.fn(() => makeSelectChain(whereMock)),
      transaction: vi.fn(),
    };

    const result = await addEmploymentContract(
      db as never,
      "org-1",
      "actor-1",
      "corr-1",
      "2026-03-13T12:00:00Z",
      {
        employmentId: "emp-999",
        contractNumber: "CNT-001",
        contractType: "permanent",
        contractStartDate: "2026-01-01",
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_EMPLOYMENT_NOT_FOUND");
    }
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("returns error when contractEndDate < contractStartDate", async () => {
    const whereMock = vi.fn().mockResolvedValueOnce([
      { id: "emp-1", status: "active" },
    ]);

    const db: Record<string, unknown> = {
      select: vi.fn(() => makeSelectChain(whereMock)),
      transaction: vi.fn(),
    };

    const result = await addEmploymentContract(
      db as never,
      "org-1",
      "actor-1",
      "corr-1",
      "2026-03-13T12:00:00Z",
      {
        employmentId: "emp-1",
        contractNumber: "CNT-001",
        contractType: "permanent",
        contractStartDate: "2026-06-01",
        contractEndDate: "2026-01-01",
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_INVALID_INPUT");
    }
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("writes contract row, audit and outbox on successful add", async () => {
    const selectWhereMock = vi.fn().mockResolvedValueOnce([
      { id: "emp-1", status: "active" },
    ]);

    const contractReturning = vi.fn().mockResolvedValueOnce([{ id: "contract-uuid-123" }]);

    const auditValuesMock = vi.fn().mockResolvedValue(undefined);
    const outboxValuesMock = vi.fn().mockResolvedValue(undefined);

    let insertCount = 0;
    const insertMock = vi.fn(() => {
      insertCount += 1;
      if (insertCount === 1) {
        return {
          values: vi.fn().mockReturnValue({
            returning: contractReturning,
          }),
        };
      }
      if (insertCount === 2) return { values: auditValuesMock };
      return { values: outboxValuesMock };
    });

    const tx: Record<string, unknown> = {
      select: vi.fn(() => makeSelectChain(() => Promise.resolve([]))),
      insert: insertMock,
    };

    const db: Record<string, unknown> = {
      select: vi.fn(() => makeSelectChain(selectWhereMock)),
      transaction: vi.fn(async (fn: (txArg: unknown) => Promise<unknown>) => fn(tx)),
    };

    const correlationId = "corr-contract-33333333-3333-4333-8333-333333333333";
    const performedAt = "2026-03-13T12:00:00Z";

    const result = await addEmploymentContract(
      db as never,
      "org-1",
      "actor-1",
      correlationId,
      performedAt,
      {
        employmentId: "emp-1",
        contractNumber: "CNT-001",
        contractType: "permanent",
        contractStartDate: "2026-01-01",
        contractEndDate: "2026-12-31",
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.contractId).toBe("contract-uuid-123");
      expect(result.data.employmentId).toBe("emp-1");
    }
    expect(auditValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: HRM_EVENTS.EMPLOYMENT_CONTRACT_ADDED,
        entityType: "hrm_employment_contract",
        entityId: "contract-uuid-123",
        correlationId,
      }),
    );
    expect(outboxValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "HRM.EMPLOYMENT_CONTRACT_ADDED",
        correlationId,
        payload: expect.objectContaining({
          contractId: "contract-uuid-123",
          employmentId: "emp-1",
          contractStartDate: "2026-01-01",
          contractEndDate: "2026-12-31",
        }),
      }),
    );
  });
});
