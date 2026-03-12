import { describe, expect, it, beforeEach, vi } from "vitest";
import { InternalBankAccountService } from "../internal-bank-account.service";
import type { CreateInternalBankAccountCommand } from "@afenda/contracts";

describe("InternalBankAccountService", () => {
  let service: InternalBankAccountService;
  let mockDb: any;
  let mockLogger: any;

  beforeEach(() => {
    mockDb = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
      values: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockReturnThis(),
    };

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
    };

    service = new InternalBankAccountService({ db: mockDb, logger: mockLogger });
  });

  it("creates internal bank account in draft state", async () => {
    const cmd: CreateInternalBankAccountCommand = {
      orgId: "550e8400-e29b-41d4-a716-446655440000",
      actorUserId: "550e8400-e29b-41d4-a716-446655440001",
      correlationId: "test-correlation-1",
      idempotencyKey: "test-idempotency-1",
      legalEntityId: "550e8400-e29b-41d4-a716-446655440002",
      code: "ACCOUNT001",
      accountName: "Operating Account",
      accountType: "operating",
      currencyCode: "USD",
      isPrimaryFundingAccount: false,
    };

    // Mock existing account check (should return empty)
    const selectMock = vi.fn().mockReturnThis();
    const fromMock = vi.fn().mockReturnThis();
    const whereMock = vi.fn().mockReturnThis();
    const limitMock = vi.fn().mockResolvedValue([]);
    const insertMock = vi.fn().mockReturnThis();
    const valuesMock = vi.fn().mockResolvedValue({});

    mockDb.select = selectMock;
    mockDb.from = fromMock;
    mockDb.where = whereMock;
    mockDb.limit = limitMock;
    mockDb.insert = insertMock;
    mockDb.values = valuesMock;

    selectMock.mockReturnValue({ from: fromMock });
    fromMock.mockReturnValue({ where: whereMock });
    whereMock.mockReturnValue({ limit: limitMock });
    insertMock.mockReturnValue({ values: valuesMock });

    const result = await service.createInternalBankAccount(cmd);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe("draft");
      expect(result.data.code).toBe("ACCOUNT001");
      expect(result.data.accountName).toBe("Operating Account");
    }
  });

  it("prevents creating account with duplicate code in same org", async () => {
    mockDb.select = vi.fn().mockReturnThis();
    mockDb.from = vi.fn().mockReturnThis();
    mockDb.where = vi.fn().mockReturnThis();
    mockDb.limit = vi.fn().mockResolvedValue([
      {
        id: "existing-id",
        code: "DUPLICATE",
      },
    ]);

    const cmd: CreateInternalBankAccountCommand = {
      orgId: "550e8400-e29b-41d4-a716-446655440000",
      actorUserId: "550e8400-e29b-41d4-a716-446655440001",
      correlationId: "test-correlation-2",
      idempotencyKey: "test-idempotency-2",
      legalEntityId: "550e8400-e29b-41d4-a716-446655440002",
      code: "DUPLICATE",
      accountName: "Another Account",
      accountType: "operating",
      currencyCode: "USD",
    };

    const result = await service.createInternalBankAccount(cmd);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TREASURY_INTERNAL_BANK_ACCOUNT_CODE_EXISTS");
    }
  });
});
