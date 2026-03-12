import { z } from "zod";
import { idempotencyKeySchema, orgScopedMetadataSchema } from "./shared";
import { intercompanyTransferPurposeSchema } from "./intercompany-transfer.entity";

export const createIntercompanyTransferCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  transferNumber: z.string().trim().min(1).max(64),
  fromLegalEntityId: z.string().uuid(),
  toLegalEntityId: z.string().uuid(),
  fromInternalBankAccountId: z.string().uuid(),
  toInternalBankAccountId: z.string().uuid(),
  purpose: intercompanyTransferPurposeSchema,
  currencyCode: z.string().trim().length(3),
  transferAmountMinor: z.string(),
  requestedExecutionDate: z.string().date(),
  sourceVersion: z.string().trim().min(1).max(128),
});

export const submitIntercompanyTransferCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  intercompanyTransferId: z.string().uuid(),
});

export const approveIntercompanyTransferCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  intercompanyTransferId: z.string().uuid(),
});

export const rejectIntercompanyTransferCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  intercompanyTransferId: z.string().uuid(),
  reason: z.string().trim().min(1).max(255),
});

export const settleIntercompanyTransferCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  intercompanyTransferId: z.string().uuid(),
});

export type CreateIntercompanyTransferCommand = z.infer<
  typeof createIntercompanyTransferCommandSchema
>;
export type SubmitIntercompanyTransferCommand = z.infer<
  typeof submitIntercompanyTransferCommandSchema
>;
export type ApproveIntercompanyTransferCommand = z.infer<
  typeof approveIntercompanyTransferCommandSchema
>;
export type RejectIntercompanyTransferCommand = z.infer<
  typeof rejectIntercompanyTransferCommandSchema
>;
export type SettleIntercompanyTransferCommand = z.infer<
  typeof settleIntercompanyTransferCommandSchema
>;
