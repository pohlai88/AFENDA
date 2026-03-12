import type { Task } from "graphile-worker";
import { randomUUID } from "node:crypto";
import { getWorkerDb } from "./db-client";

export const handleMarketDataRefreshRequested: Task = async (payload, helpers) => {
  const db = getWorkerDb();
  const client = (db as any).$client as {
    query: (text: string, values?: unknown[]) => Promise<{ rows?: unknown[] }>;
  };
  const event = payload as {
    orgId?: string;
    correlationId?: string;
    payload?: {
      marketDataFeedId?: string;
    };
  };

  const orgId = event.orgId;
  const marketDataFeedId = event.payload?.marketDataFeedId;

  if (!orgId || !marketDataFeedId) {
    helpers.logger.warn(
      `market data refresh event missing required fields: orgId=${orgId ?? "unknown"} marketDataFeedId=${marketDataFeedId ?? "unknown"}`,
    );
    return;
  }

  try {
    const feeds = await client.query(
      `
      SELECT id
      FROM treasury_market_data_feed
      WHERE org_id = $1 AND id = $2
      LIMIT 1
      `,
      [orgId, marketDataFeedId],
    );

    if (!feeds.rows || feeds.rows.length === 0) {
      helpers.logger.warn(
        `market data refresh skipped: feed not found orgId=${orgId} marketDataFeedId=${marketDataFeedId}`,
      );
      return;
    }

    await client.query(
      `
      INSERT INTO treasury_market_data_observation
        (id, org_id, market_data_feed_id, observation_date, value_scaled, scale, source_version, created_at)
      VALUES
        ($1, $2, $3, CURRENT_DATE, $4, $5, $6, now())
      `,
      [
        randomUUID(),
        orgId,
        marketDataFeedId,
        "1000000",
        6,
        event.correlationId ?? "worker-refresh",
      ],
    );

    await client.query(
      `
      UPDATE treasury_market_data_feed
      SET
        last_refresh_succeeded_at = now(),
        last_error_code = NULL,
        last_error_message = NULL,
        updated_at = now()
      WHERE org_id = $1 AND id = $2
      `,
      [orgId, marketDataFeedId],
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "market data refresh failed";
    await client.query(
      `
      UPDATE treasury_market_data_feed
      SET
        last_refresh_failed_at = now(),
        last_error_code = $1,
        last_error_message = $2,
        updated_at = now()
      WHERE org_id = $3 AND id = $4
      `,
      ["REFRESH_FAILED", message, orgId, marketDataFeedId],
    );
    throw error;
  }

  helpers.logger.info(
    `processed market data refresh request: orgId=${event.orgId ?? "unknown"} marketDataFeedId=${event.payload?.marketDataFeedId ?? "unknown"} correlationId=${event.correlationId ?? "unknown"}`,
  );
};
