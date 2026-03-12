import { beforeEach, describe, expect, it, vi } from "vitest";
import { TreasuryAccountingBridgeService } from "../treasury-accounting-bridge.service";

describe("TreasuryAccountingBridgeService", () => {
  let service: TreasuryAccountingBridgeService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: vi.fn(),
      from: vi.fn(),
      where: vi.fn(),
      limit: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      set: vi.fn(),
      values: vi.fn(),
    };

    service = new TreasuryAccountingBridgeService({ db: mockDb, logger: { info: vi.fn() } });
  });

  it("createPolicy returns conflict for duplicate policyCode", async () => {
    const limitMock = vi.fn().mockResolvedValue([{ id: "existing" }]);
    const whereMock = vi.fn().mockReturnValue({ limit: limitMock });
    const fromMock = vi.fn().mockReturnValue({ where: whereMock });
    mockDb.select.mockReturnValue({ from: fromMock });

    const result = await service.createPolicy({
      orgId: "550e8400-e29b-41d4-a716-446655440000",
      actorUserId: "550e8400-e29b-41d4-a716-446655440001",
      correlationId: "corr-bridge-dup",
      idempotencyKey: "550e8400-e29b-41d4-a716-446655440002",
      policyCode: "TREAS_GL_MAIN",
      name: "Treasury GL Main",
      scopeType: "payment_batch",
      debitAccountCode: "1100",
      creditAccountCode: "2100",
      effectiveFrom: "2026-03-13",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TREASURY_ACCOUNTING_POLICY_CODE_EXISTS");
    }
  });

  it("requestPosting emits outbox when policy is active", async () => {
    const limitMock = vi.fn().mockResolvedValue([
      {
        id: "550e8400-e29b-41d4-a716-446655440010",
        debitAccountCode: "1100",
        creditAccountCode: "2100",
        status: "active",
      },
    ]);
    const whereMock = vi.fn().mockReturnValue({ limit: limitMock });
    const fromMock = vi.fn().mockReturnValue({ where: whereMock });
    mockDb.select.mockReturnValue({ from: fromMock });

    const valuesMock = vi.fn().mockResolvedValue({});
    mockDb.insert.mockReturnValue({ values: valuesMock });

    const result = await service.requestPosting({
      orgId: "550e8400-e29b-41d4-a716-446655440000",
      actorUserId: "550e8400-e29b-41d4-a716-446655440001",
      correlationId: "corr-posting-request",
      idempotencyKey: "550e8400-e29b-41d4-a716-446655440003",
      sourceType: "payment_batch",
      sourceId: "550e8400-e29b-41d4-a716-446655440020",
      treasuryAccountingPolicyId: "550e8400-e29b-41d4-a716-446655440010",
      amountMinor: "1000",
      currencyCode: "USD",
    });

    expect(result.ok).toBe(true);
    expect(mockDb.insert).toHaveBeenCalledTimes(2);
    expect(valuesMock).toHaveBeenCalledTimes(2);
    expect(valuesMock.mock.calls[1][0]).toMatchObject({ type: "TREAS.TREASURY_POSTING_REQUESTED" });
  });
});
