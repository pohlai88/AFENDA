import { z } from "zod";

export const internalBankAccountStatusValues = [
  "draft",
  "active",
  "inactive",
  "closed",
] as const;

export const internalBankAccountTypeValues = [
  "operating",
  "funding",
  "settlement",
  "sweep",
  "clearing",
] as const;

export const internalBankAccountStatusSchema = z.enum(internalBankAccountStatusValues);

export const internalBankAccountTypeSchema = z.enum(internalBankAccountTypeValues);

export const internalBankAccountEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  legalEntityId: z.string().uuid(),
  code: z.string().trim().min(1).max(64),
  accountName: z.string().trim().min(1).max(255),
  accountType: internalBankAccountTypeSchema,
  currencyCode: z.string().trim().length(3),
  externalBankAccountId: z.string().uuid().nullable(),
  status: internalBankAccountStatusSchema,
  isPrimaryFundingAccount: z.boolean(),
  activatedAt: z.string().datetime().nullable(),
  deactivatedAt: z.string().datetime().nullable(),
  closedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type InternalBankAccountEntity = z.infer<
  typeof internalBankAccountEntitySchema
>;

export const internalBankAccountValuesSchema = internalBankAccountEntitySchema.omit({
  createdAt: true,
  updatedAt: true,
});
