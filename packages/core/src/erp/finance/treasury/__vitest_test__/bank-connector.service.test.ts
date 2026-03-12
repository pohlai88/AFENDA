import { describe, expect, it, vi } from "vitest";

vi.mock("@afenda/contracts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@afenda/contracts")>();
  return {
    ...actual,
    createBankConnectorCommandSchema: { parse: (input: unknown) => input },
    activateBankConnectorCommandSchema: { parse: (input: unknown) => input },
    requestBankConnectorSyncCommandSchema: { parse: (input: unknown) => input },
    createMarketDataFeedCommandSchema: { parse: (input: unknown) => input },
    activateMarketDataFeedCommandSchema: { parse: (input: unknown) => input },
    requestMarketDataRefreshCommandSchema: { parse: (input: unknown) => input },
  };
});

import { deriveConnectorHealth } from "../calculators/connector-health";
import { BankConnectorService } from "../bank-connector.service";

describe("connector health calculator", () => {
  it("returns failed for three or more consecutive failures", () => {
    expect(deriveConnectorHealth({ consecutiveFailureCount: 3 })).toBe("failed");
  });

  it("returns healthy when a successful sync exists and there are no failures", () => {
    expect(
      deriveConnectorHealth({
        consecutiveFailureCount: 0,
        lastSyncSucceededAt: new Date("2026-03-12T00:00:00.000Z"),
      }),
    ).toBe("healthy");
  });
});

describe("BankConnectorService", () => {
  it("returns conflict error when connector code already exists in org", async () => {
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => [{ id: "existing-connector-id" }]),
          })),
        })),
      })),
      insert: vi.fn(),
      update: vi.fn(),
    };

    const service = new BankConnectorService({
      db,
      logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
    });

    const result = await service.createBankConnector({
      orgId: "00000000-0000-4000-8000-000000000001",
      actorUserId: "00000000-0000-4000-8000-000000000002",
      correlationId: "corr-12345678",
      idempotencyKey: "idem-12345678",
      code: "SWIFT_MAIN",
      connectorType: "swift",
      bankName: "Primary Bank",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TREASURY_BANK_CONNECTOR_CODE_EXISTS");
    }
  });
});
