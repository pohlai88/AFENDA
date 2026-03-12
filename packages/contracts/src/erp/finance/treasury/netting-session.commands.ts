import { z } from "zod";
import { idempotencyKeySchema, orgScopedMetadataSchema } from "./shared";

export const createNettingSessionCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  sessionNumber: z.string().trim().min(1).max(64),
  currencyCode: z.string().trim().length(3),
  nettingDate: z.string().date(),
  settlementDate: z.string().date(),
  sourceVersion: z.string().trim().min(1).max(128),
});

export const addNettingSessionItemsCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  nettingSessionId: z.string().uuid(),
  intercompanyTransferIds: z.array(z.string().uuid()).min(1),
});

export const closeNettingSessionCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  nettingSessionId: z.string().uuid(),
});

export const settleNettingSessionCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  nettingSessionId: z.string().uuid(),
});

export type CreateNettingSessionCommand = z.infer<typeof createNettingSessionCommandSchema>;
export type AddNettingSessionItemsCommand = z.infer<typeof addNettingSessionItemsCommandSchema>;
export type CloseNettingSessionCommand = z.infer<typeof closeNettingSessionCommandSchema>;
export type SettleNettingSessionCommand = z.infer<typeof settleNettingSessionCommandSchema>;
