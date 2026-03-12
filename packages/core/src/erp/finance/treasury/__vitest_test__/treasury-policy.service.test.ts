import { beforeEach, describe, expect, it, vi } from "vitest";
import { TreasuryPolicyService } from "../treasury-policy.service";

describe("TreasuryPolicyService", () => {
  let service: TreasuryPolicyService;
  let mockDb: any;
  let mockLogger: any;

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

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    service = new TreasuryPolicyService({ db: mockDb, logger: mockLogger });
  });

  it("createPolicy returns conflict when policy code already exists", async () => {
    const limitMock = vi.fn().mockResolvedValue([{ id: "existing-policy" }]);
    const whereMock = vi.fn().mockReturnValue({ limit: limitMock });
    const fromMock = vi.fn().mockReturnValue({ where: whereMock });
    mockDb.select.mockReturnValue({ from: fromMock });

    const result = await service.createPolicy({
      orgId: "550e8400-e29b-41d4-a716-446655440000",
      actorUserId: "550e8400-e29b-41d4-a716-446655440001",
      correlationId: "corr-policy-conflict",
      idempotencyKey: "550e8400-e29b-41d4-a716-446655440010",
      code: "PAYMENT_POLICY_MAIN",
      name: "Main Payment Policy",
      scopeType: "payment_instruction",
      allowOverride: true,
      effectiveFrom: "2026-03-13",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TREASURY_POLICY_CODE_EXISTS");
    }
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("activatePolicy returns not found when policy does not exist", async () => {
    const limitMock = vi.fn().mockResolvedValue([]);
    const whereMock = vi.fn().mockReturnValue({ limit: limitMock });
    const fromMock = vi.fn().mockReturnValue({ where: whereMock });
    mockDb.select.mockReturnValue({ from: fromMock });

    const result = await service.activatePolicy({
      orgId: "550e8400-e29b-41d4-a716-446655440000",
      actorUserId: "550e8400-e29b-41d4-a716-446655440001",
      correlationId: "corr-policy-not-found",
      idempotencyKey: "550e8400-e29b-41d4-a716-446655440011",
      treasuryPolicyId: "550e8400-e29b-41d4-a716-446655440099",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TREASURY_POLICY_NOT_FOUND");
    }
  });

  it("checkLimit writes breach and outbox when active limit is exceeded", async () => {
    const whereMock = vi.fn().mockResolvedValue([
      {
        id: "550e8400-e29b-41d4-a716-446655440200",
        thresholdMinor: "10000",
        hardBlock: true,
      },
    ]);
    const fromMock = vi.fn().mockReturnValue({ where: whereMock });
    mockDb.select.mockReturnValue({ from: fromMock });

    const valuesMock = vi.fn().mockResolvedValue({});
    mockDb.insert.mockReturnValue({ values: valuesMock });

    const result = await service.checkLimit({
      orgId: "550e8400-e29b-41d4-a716-446655440000",
      sourceType: "payment_instruction",
      sourceId: "550e8400-e29b-41d4-a716-446655440300",
      measuredValueMinor: "20000",
      correlationId: "corr-limit-breach",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.allowed).toBe(false);
      expect(result.data.breachId).toBeDefined();
    }
    expect(mockDb.insert).toHaveBeenCalledTimes(2);
    expect(valuesMock).toHaveBeenCalledTimes(2);
    expect(valuesMock.mock.calls[1][0]).toMatchObject({ type: "TREAS.LIMIT_BREACHED" });
  });
});
