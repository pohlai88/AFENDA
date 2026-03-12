import { z } from "zod";

export const bankConnectorTypeSchema = z.enum(["swift", "ebics", "host_to_host", "manual", "mock"]);

export const bankConnectorStatusSchema = z.enum(["draft", "active", "inactive", "error"]);

export const bankConnectorHealthSchema = z.enum(["unknown", "healthy", "degraded", "failed"]);

export const bankConnectorEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  code: z.string().trim().min(1).max(64),
  connectorType: bankConnectorTypeSchema,
  bankName: z.string().trim().min(1).max(255),
  legalEntityId: z.string().uuid().nullable(),
  status: bankConnectorStatusSchema,
  health: bankConnectorHealthSchema,
  endpointRef: z.string().trim().max(255).nullable(),
  lastSyncRequestedAt: z.string().datetime().nullable(),
  lastSyncSucceededAt: z.string().datetime().nullable(),
  lastSyncFailedAt: z.string().datetime().nullable(),
  lastErrorCode: z.string().trim().max(128).nullable(),
  lastErrorMessage: z.string().trim().max(1000).nullable(),
  consecutiveFailureCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const bankConnectorExecutionTypeSchema = z.enum([
  "sync_accounts",
  "submit_payment",
  "fetch_statement",
  "refresh_status",
]);

export const bankConnectorExecutionEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  bankConnectorId: z.string().uuid(),
  executionType: bankConnectorExecutionTypeSchema,
  direction: z.enum(["outbound", "inbound"]),
  correlationId: z.string(),
  status: z.enum(["pending", "running", "succeeded", "failed"]),
  retryCount: z.number().int().nonnegative(),
  requestPayloadRef: z.string().trim().max(255).nullable(),
  responsePayloadRef: z.string().trim().max(255).nullable(),
  errorCode: z.string().trim().max(128).nullable(),
  errorMessage: z.string().trim().max(1000).nullable(),
  startedAt: z.string().datetime().nullable(),
  finishedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export type BankConnectorEntity = z.infer<typeof bankConnectorEntitySchema>;
export type BankConnectorExecutionEntity = z.infer<typeof bankConnectorExecutionEntitySchema>;
