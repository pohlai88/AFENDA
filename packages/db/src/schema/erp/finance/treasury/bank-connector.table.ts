import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const treasuryBankConnectorTable = pgTable(
  "treasury_bank_connector",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id").notNull(),
    code: text("code").notNull(),
    connectorType: text("connector_type").notNull(),
    bankName: text("bank_name").notNull(),
    legalEntityId: uuid("legal_entity_id"),
    status: text("status").notNull(),
    health: text("health").notNull(),
    endpointRef: text("endpoint_ref"),
    lastSyncRequestedAt: timestamp("last_sync_requested_at", { withTimezone: true }),
    lastSyncSucceededAt: timestamp("last_sync_succeeded_at", { withTimezone: true }),
    lastSyncFailedAt: timestamp("last_sync_failed_at", { withTimezone: true }),
    lastErrorCode: text("last_error_code"),
    lastErrorMessage: text("last_error_message"),
    consecutiveFailureCount: integer("consecutive_failure_count").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    orgIdx: index("treasury_bank_connector__org_idx").on(table.orgId),
    orgCodeUq: uniqueIndex("treasury_bank_connector__org_code_uq").on(table.orgId, table.code),
  }),
);

export const treasuryBankConnectorExecutionTable = pgTable(
  "treasury_bank_connector_execution",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id").notNull(),
    bankConnectorId: uuid("bank_connector_id").notNull(),
    executionType: text("execution_type").notNull(),
    direction: text("direction").notNull(),
    correlationId: text("correlation_id").notNull(),
    status: text("status").notNull(),
    retryCount: integer("retry_count").notNull(),
    requestPayloadRef: text("request_payload_ref"),
    responsePayloadRef: text("response_payload_ref"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    orgConnectorIdx: index("treasury_bank_connector_execution__org_connector_idx").on(
      table.orgId,
      table.bankConnectorId,
    ),
    orgCorrelationIdx: index("treasury_bank_connector_execution__org_correlation_idx").on(
      table.orgId,
      table.correlationId,
    ),
  }),
);
