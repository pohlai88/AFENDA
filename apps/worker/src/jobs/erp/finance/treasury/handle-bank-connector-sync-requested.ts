import type { Task } from "graphile-worker";
import { getWorkerDb } from "./db-client";

export const handleBankConnectorSyncRequested: Task = async (payload, helpers) => {
  const db = getWorkerDb();
  const client = (db as any).$client as {
    query: (text: string, values?: unknown[]) => Promise<unknown>;
  };
  const event = payload as {
    orgId?: string;
    correlationId?: string;
    payload?: {
      bankConnectorId?: string;
      executionId?: string;
      executionType?: string;
    };
  };

  const orgId = event.orgId;
  const bankConnectorId = event.payload?.bankConnectorId;
  const executionId = event.payload?.executionId;

  if (!orgId || !bankConnectorId || !executionId) {
    helpers.logger.warn(
      `bank connector sync event missing required fields: orgId=${orgId ?? "unknown"} connectorId=${bankConnectorId ?? "unknown"} executionId=${executionId ?? "unknown"}`,
    );
    return;
  }

  try {
    await client.query(
      `
      UPDATE treasury_bank_connector_execution
      SET status = $1, started_at = now()
      WHERE org_id = $2 AND bank_connector_id = $3 AND id = $4
      `,
      ["processing", orgId, bankConnectorId, executionId],
    );

    await client.query(
      `
      UPDATE treasury_bank_connector_execution
      SET status = $1, finished_at = now(), error_code = NULL, error_message = NULL
      WHERE id = $2
      `,
      ["succeeded", executionId],
    );

    await client.query(
      `
      UPDATE treasury_bank_connector
      SET
        health = $1,
        last_sync_succeeded_at = now(),
        last_error_code = NULL,
        last_error_message = NULL,
        consecutive_failure_count = 0,
        updated_at = now()
      WHERE org_id = $2 AND id = $3
      `,
      ["healthy", orgId, bankConnectorId],
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "connector sync failed";

    await client.query(
      `
      UPDATE treasury_bank_connector_execution
      SET status = $1, finished_at = now(), error_code = $2, error_message = $3
      WHERE id = $4
      `,
      ["failed", "SYNC_FAILED", message, executionId],
    );

    await client.query(
      `
      UPDATE treasury_bank_connector
      SET
        health = $1,
        last_sync_failed_at = now(),
        last_error_code = $2,
        last_error_message = $3,
        consecutive_failure_count = COALESCE(consecutive_failure_count, 0) + 1,
        updated_at = now()
      WHERE org_id = $4 AND id = $5
      `,
      ["failed", "SYNC_FAILED", message, orgId, bankConnectorId],
    );

    throw error;
  }

  helpers.logger.info(
    `processed bank connector sync request: orgId=${event.orgId ?? "unknown"} connectorId=${event.payload?.bankConnectorId ?? "unknown"} executionId=${event.payload?.executionId ?? "unknown"} type=${event.payload?.executionType ?? "unknown"} correlationId=${event.correlationId ?? "unknown"}`,
  );
};
