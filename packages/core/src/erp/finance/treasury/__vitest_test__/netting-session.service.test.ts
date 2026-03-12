import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildNetPositions,
  calculateInternalInterestMinor,
  dayCountFactor,
} from "../calculators/internal-interest";
import { NettingSessionService } from "../netting-session.service";

type CreateNettingSessionCommand = {
  orgId: string;
  actorUserId: string;
  correlationId: string;
  idempotencyKey: string;
  sessionNumber: string;
  currencyCode: string;
  nettingDate: string;
  settlementDate: string;
  sourceVersion: string;
};

describe("NettingSessionService", () => {
  let service: NettingSessionService;
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

    service = new NettingSessionService({ db: mockDb, logger: mockLogger });
  });

  it("computes deterministic internal interest", () => {
    const interest = calculateInternalInterestMinor({
      principalMinor: "1000000",
      annualRateBps: 500,
      dayCountConvention: "actual_360",
      days: 30,
    });

    expect(interest).toBe("4166");
  });

  it("computes deterministic interest across day count conventions", () => {
    const params = {
      principalMinor: "2500000",
      annualRateBps: 425,
      days: 45,
    } as const;

    const actual360 = calculateInternalInterestMinor({
      ...params,
      dayCountConvention: "actual_360",
    });
    const actual365 = calculateInternalInterestMinor({
      ...params,
      dayCountConvention: "actual_365",
    });
    const thirty360 = calculateInternalInterestMinor({
      ...params,
      dayCountConvention: "30_360",
    });

    expect(actual360).toBe("13281");
    expect(actual365).toBe("13099");
    expect(thirty360).toBe("13281");
    expect(dayCountFactor({ dayCountConvention: "actual_365", days: 45 })).toBeCloseTo(
      45 / 365,
      12,
    );
  });

  it("builds balanced net positions from obligations", () => {
    const positions = buildNetPositions([
      {
        fromLegalEntityId: "LE-A",
        toLegalEntityId: "LE-B",
        amountMinor: "1000",
      },
      {
        fromLegalEntityId: "LE-B",
        toLegalEntityId: "LE-C",
        amountMinor: "300",
      },
      {
        fromLegalEntityId: "LE-C",
        toLegalEntityId: "LE-A",
        amountMinor: "700",
      },
    ]);

    const net = positions.reduce((sum, row) => sum + BigInt(row.netPositionMinor), 0n);
    expect(net).toBe(0n);

    const asMap = new Map(positions.map((row) => [row.legalEntityId, row.netPositionMinor]));
    expect(asMap.get("LE-A")).toBe("-300");
    expect(asMap.get("LE-B")).toBe("700");
    expect(asMap.get("LE-C")).toBe("-400");
  });

  it("creates draft netting session", async () => {
    const cmd: CreateNettingSessionCommand = {
      orgId: "550e8400-e29b-41d4-a716-446655440000",
      actorUserId: "550e8400-e29b-41d4-a716-446655440001",
      correlationId: "test-correlation-1",
      idempotencyKey: "test-idempotency-1",
      sessionNumber: "NET-2026-001",
      currencyCode: "USD",
      nettingDate: "2026-03-12",
      settlementDate: "2026-03-14",
      sourceVersion: "wave4.2",
    };

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

    const result = await service.createNettingSession(cmd);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe("draft");
      expect(result.data.sessionNumber).toBe("NET-2026-001");
      expect(result.data.totalObligationCount).toBe(0);
    }
    expect(insertMock).toHaveBeenCalledTimes(2);
  });
});
