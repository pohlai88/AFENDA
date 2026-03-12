import { z } from "zod";
import { IdempotencyKeySchema } from "../../../kernel/execution/idempotency/request-key.js";
import { CurrencyCodeSchema } from "../../../shared/money.js";
import { BankAccountIdSchema } from "./bank-account.entity.js";

export const CreateBankAccountCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  accountName: z.string().trim().min(1).max(120),
  bankName: z.string().trim().min(1).max(120),
  accountNumber: z.string().trim().min(4).max(64),
  currencyCode: CurrencyCodeSchema,
  bankIdentifierCode: z.string().trim().max(32).optional(),
  externalBankRef: z.string().trim().max(128).optional(),
  isPrimary: z.boolean().optional(),
});

export type CreateBankAccountCommand = z.infer<typeof CreateBankAccountCommandSchema>;

export const UpdateBankAccountCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  id: BankAccountIdSchema,
  accountName: z.string().trim().min(1).max(120).optional(),
  bankName: z.string().trim().min(1).max(120).optional(),
  accountNumber: z.string().trim().min(4).max(64).optional(),
  currencyCode: CurrencyCodeSchema.optional(),
  bankIdentifierCode: z.string().trim().max(32).nullable().optional(),
  externalBankRef: z.string().trim().max(128).nullable().optional(),
  isPrimary: z.boolean().optional(),
});

export type UpdateBankAccountCommand = z.infer<typeof UpdateBankAccountCommandSchema>;

export const ActivateBankAccountCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  id: BankAccountIdSchema,
});

export type ActivateBankAccountCommand = z.infer<typeof ActivateBankAccountCommandSchema>;

export const DeactivateBankAccountCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  id: BankAccountIdSchema,
});

export type DeactivateBankAccountCommand = z.infer<typeof DeactivateBankAccountCommandSchema>;
