import { z } from "zod";
import { idempotencyKeySchema, orgScopedMetadataSchema } from "./shared";
import { bankConnectorExecutionTypeSchema, bankConnectorTypeSchema } from "./bank-connector.entity";

export const createBankConnectorCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  code: z.string().trim().min(1).max(64),
  connectorType: bankConnectorTypeSchema,
  bankName: z.string().trim().min(1).max(255),
  legalEntityId: z.string().uuid().nullable().optional(),
  endpointRef: z.string().trim().max(255).nullable().optional(),
});

export const activateBankConnectorCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  bankConnectorId: z.string().uuid(),
});

export const requestBankConnectorSyncCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  bankConnectorId: z.string().uuid(),
  executionType: bankConnectorExecutionTypeSchema,
  requestPayloadRef: z.string().trim().max(255).nullable().optional(),
});

export type CreateBankConnectorCommand = z.infer<typeof createBankConnectorCommandSchema>;
export type ActivateBankConnectorCommand = z.infer<typeof activateBankConnectorCommandSchema>;
export type RequestBankConnectorSyncCommand = z.infer<typeof requestBankConnectorSyncCommandSchema>;
