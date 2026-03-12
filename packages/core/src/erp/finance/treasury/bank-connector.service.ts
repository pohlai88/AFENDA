import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import {
  activateBankConnectorCommandSchema,
  activateMarketDataFeedCommandSchema,
  createBankConnectorCommandSchema,
  createMarketDataFeedCommandSchema,
  requestBankConnectorSyncCommandSchema,
  requestMarketDataRefreshCommandSchema,
} from "@afenda/contracts";
import {
  outboxEvent,
  treasuryBankConnectorExecutionTable,
  treasuryBankConnectorTable,
  treasuryMarketDataFeedTable,
} from "@afenda/db";

export type BankConnectorServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

export class BankConnectorService {
  constructor(
    private readonly deps: {
      db: any;
      logger: any;
    },
  ) {}

  async createBankConnector(raw: unknown): Promise<BankConnectorServiceResult<{ id: string }>> {
    const cmd = createBankConnectorCommandSchema.parse(raw);

    const existing = await this.deps.db
      .select()
      .from(treasuryBankConnectorTable)
      .where(
        and(
          eq(treasuryBankConnectorTable.orgId, cmd.orgId),
          eq(treasuryBankConnectorTable.code, cmd.code),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return {
        ok: false,
        error: {
          code: "TREASURY_BANK_CONNECTOR_CODE_EXISTS",
          message: "Bank connector code already exists",
        },
      };
    }

    const id = randomUUID();

    await this.deps.db.insert(treasuryBankConnectorTable).values({
      id,
      orgId: cmd.orgId,
      code: cmd.code,
      connectorType: cmd.connectorType,
      bankName: cmd.bankName,
      legalEntityId: cmd.legalEntityId ?? null,
      status: "draft",
      health: "unknown",
      endpointRef: cmd.endpointRef ?? null,
      lastSyncRequestedAt: null,
      lastSyncSucceededAt: null,
      lastSyncFailedAt: null,
      lastErrorCode: null,
      lastErrorMessage: null,
      consecutiveFailureCount: 0,
      createdAt: sql`now()`,
      updatedAt: sql`now()`,
    });

    await this.deps.db.insert(outboxEvent).values({
      orgId: cmd.orgId,
      type: "TREAS.BANK_CONNECTOR_CREATED",
      version: "1",
      correlationId: cmd.correlationId,
      payload: {
        bankConnectorId: id,
        code: cmd.code,
      },
    });

    return { ok: true, data: { id } };
  }

  async activateBankConnector(raw: unknown): Promise<BankConnectorServiceResult<{ id: string }>> {
    const cmd = activateBankConnectorCommandSchema.parse(raw);

    const existing = await this.deps.db
      .select()
      .from(treasuryBankConnectorTable)
      .where(
        and(
          eq(treasuryBankConnectorTable.orgId, cmd.orgId),
          eq(treasuryBankConnectorTable.id, cmd.bankConnectorId),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      return {
        ok: false,
        error: {
          code: "TREASURY_BANK_CONNECTOR_NOT_FOUND",
          message: "Bank connector not found",
        },
      };
    }

    await this.deps.db
      .update(treasuryBankConnectorTable)
      .set({ status: "active", updatedAt: sql`now()` })
      .where(eq(treasuryBankConnectorTable.id, cmd.bankConnectorId));

    await this.deps.db.insert(outboxEvent).values({
      orgId: cmd.orgId,
      type: "TREAS.BANK_CONNECTOR_ACTIVATED",
      version: "1",
      correlationId: cmd.correlationId,
      payload: {
        bankConnectorId: cmd.bankConnectorId,
      },
    });

    return { ok: true, data: { id: cmd.bankConnectorId } };
  }

  async requestBankConnectorSync(
    raw: unknown,
  ): Promise<BankConnectorServiceResult<{ id: string; executionId: string }>> {
    const cmd = requestBankConnectorSyncCommandSchema.parse(raw);

    const existing = await this.deps.db
      .select()
      .from(treasuryBankConnectorTable)
      .where(
        and(
          eq(treasuryBankConnectorTable.orgId, cmd.orgId),
          eq(treasuryBankConnectorTable.id, cmd.bankConnectorId),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      return {
        ok: false,
        error: {
          code: "TREASURY_BANK_CONNECTOR_NOT_FOUND",
          message: "Bank connector not found",
        },
      };
    }

    const executionId = randomUUID();

    await this.deps.db.insert(treasuryBankConnectorExecutionTable).values({
      id: executionId,
      orgId: cmd.orgId,
      bankConnectorId: cmd.bankConnectorId,
      executionType: cmd.executionType,
      direction: "outbound",
      correlationId: cmd.correlationId,
      status: "pending",
      retryCount: 0,
      requestPayloadRef: cmd.requestPayloadRef ?? null,
      responsePayloadRef: null,
      errorCode: null,
      errorMessage: null,
      startedAt: null,
      finishedAt: null,
      createdAt: sql`now()`,
    });

    await this.deps.db
      .update(treasuryBankConnectorTable)
      .set({ lastSyncRequestedAt: sql`now()`, updatedAt: sql`now()` })
      .where(eq(treasuryBankConnectorTable.id, cmd.bankConnectorId));

    await this.deps.db.insert(outboxEvent).values({
      orgId: cmd.orgId,
      type: "TREAS.BANK_CONNECTOR_SYNC_REQUESTED",
      version: "1",
      correlationId: cmd.correlationId,
      payload: {
        bankConnectorId: cmd.bankConnectorId,
        executionId,
        executionType: cmd.executionType,
      },
    });

    return { ok: true, data: { id: cmd.bankConnectorId, executionId } };
  }

  async createMarketDataFeed(raw: unknown): Promise<BankConnectorServiceResult<{ id: string }>> {
    const cmd = createMarketDataFeedCommandSchema.parse(raw);

    const existing = await this.deps.db
      .select()
      .from(treasuryMarketDataFeedTable)
      .where(
        and(
          eq(treasuryMarketDataFeedTable.orgId, cmd.orgId),
          eq(treasuryMarketDataFeedTable.code, cmd.code),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return {
        ok: false,
        error: {
          code: "TREASURY_MARKET_DATA_FEED_CODE_EXISTS",
          message: "Market data feed code already exists",
        },
      };
    }

    const id = randomUUID();

    await this.deps.db.insert(treasuryMarketDataFeedTable).values({
      id,
      orgId: cmd.orgId,
      code: cmd.code,
      providerCode: cmd.providerCode,
      feedType: cmd.feedType,
      baseCurrencyCode: cmd.baseCurrencyCode ?? null,
      quoteCurrencyCode: cmd.quoteCurrencyCode ?? null,
      status: "draft",
      freshnessMinutes: cmd.freshnessMinutes,
      lastRefreshRequestedAt: null,
      lastRefreshSucceededAt: null,
      lastRefreshFailedAt: null,
      lastErrorCode: null,
      lastErrorMessage: null,
      createdAt: sql`now()`,
      updatedAt: sql`now()`,
    });

    await this.deps.db.insert(outboxEvent).values({
      orgId: cmd.orgId,
      type: "TREAS.MARKET_DATA_FEED_CREATED",
      version: "1",
      correlationId: cmd.correlationId,
      payload: {
        marketDataFeedId: id,
        code: cmd.code,
      },
    });

    return { ok: true, data: { id } };
  }

  async activateMarketDataFeed(raw: unknown): Promise<BankConnectorServiceResult<{ id: string }>> {
    const cmd = activateMarketDataFeedCommandSchema.parse(raw);

    const existing = await this.deps.db
      .select()
      .from(treasuryMarketDataFeedTable)
      .where(
        and(
          eq(treasuryMarketDataFeedTable.orgId, cmd.orgId),
          eq(treasuryMarketDataFeedTable.id, cmd.marketDataFeedId),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      return {
        ok: false,
        error: {
          code: "TREASURY_MARKET_DATA_FEED_NOT_FOUND",
          message: "Market data feed not found",
        },
      };
    }

    await this.deps.db
      .update(treasuryMarketDataFeedTable)
      .set({ status: "active", updatedAt: sql`now()` })
      .where(eq(treasuryMarketDataFeedTable.id, cmd.marketDataFeedId));

    await this.deps.db.insert(outboxEvent).values({
      orgId: cmd.orgId,
      type: "TREAS.MARKET_DATA_FEED_ACTIVATED",
      version: "1",
      correlationId: cmd.correlationId,
      payload: {
        marketDataFeedId: cmd.marketDataFeedId,
      },
    });

    return { ok: true, data: { id: cmd.marketDataFeedId } };
  }

  async requestMarketDataRefresh(
    raw: unknown,
  ): Promise<BankConnectorServiceResult<{ id: string }>> {
    const cmd = requestMarketDataRefreshCommandSchema.parse(raw);

    const existing = await this.deps.db
      .select()
      .from(treasuryMarketDataFeedTable)
      .where(
        and(
          eq(treasuryMarketDataFeedTable.orgId, cmd.orgId),
          eq(treasuryMarketDataFeedTable.id, cmd.marketDataFeedId),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      return {
        ok: false,
        error: {
          code: "TREASURY_MARKET_DATA_FEED_NOT_FOUND",
          message: "Market data feed not found",
        },
      };
    }

    await this.deps.db
      .update(treasuryMarketDataFeedTable)
      .set({ lastRefreshRequestedAt: sql`now()`, updatedAt: sql`now()` })
      .where(eq(treasuryMarketDataFeedTable.id, cmd.marketDataFeedId));

    await this.deps.db.insert(outboxEvent).values({
      orgId: cmd.orgId,
      type: "TREAS.MARKET_DATA_REFRESH_REQUESTED",
      version: "1",
      correlationId: cmd.correlationId,
      payload: {
        marketDataFeedId: cmd.marketDataFeedId,
      },
    });

    return { ok: true, data: { id: cmd.marketDataFeedId } };
  }
}
