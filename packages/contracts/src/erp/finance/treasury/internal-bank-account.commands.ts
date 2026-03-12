import { z } from "zod";
import { idempotencyKeySchema, orgScopedMetadataSchema } from "./shared";
import { internalBankAccountTypeSchema } from "./internal-bank-account.entity";

export const createInternalBankAccountCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  legalEntityId: z.string().uuid(),
  code: z.string().trim().min(1).max(64),
  accountName: z.string().trim().min(1).max(255),
  accountType: internalBankAccountTypeSchema,
  currencyCode: z.string().trim().length(3),
  externalBankAccountId: z.string().uuid().nullable().optional(),
  isPrimaryFundingAccount: z.boolean().optional().default(false),
});

export const activateInternalBankAccountCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  internalBankAccountId: z.string().uuid(),
});

export const deactivateInternalBankAccountCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  internalBankAccountId: z.string().uuid(),
  reason: z.string().trim().min(1).max(255),
});

export type CreateInternalBankAccountCommand = z.infer<
  typeof createInternalBankAccountCommandSchema
>;
export type ActivateInternalBankAccountCommand = z.infer<
  typeof activateInternalBankAccountCommandSchema
>;
export type DeactivateInternalBankAccountCommand = z.infer<
  typeof deactivateInternalBankAccountCommandSchema
>;
