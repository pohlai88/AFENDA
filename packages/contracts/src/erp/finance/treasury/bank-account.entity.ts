import { z } from "zod";
import { brandedUuid, OrgIdSchema } from "../../../shared/ids.js";
import { UtcDateTimeSchema } from "../../../shared/datetime.js";
import { CurrencyCodeSchema } from "../../../shared/money.js";
import { BankAccountStatusValues } from "./treasury-shared.entity.js";

export const BankAccountIdSchema = brandedUuid("BankAccountId");
export type BankAccountId = z.infer<typeof BankAccountIdSchema>;

export const BankAccountSchema = z.object({
  id: BankAccountIdSchema,
  orgId: OrgIdSchema,
  accountName: z.string().trim().min(1).max(120),
  bankName: z.string().trim().min(1).max(120),
  accountNumber: z.string().trim().min(4).max(64),
  currencyCode: CurrencyCodeSchema,
  bankIdentifierCode: z.string().trim().max(32).nullable(),
  externalBankRef: z.string().trim().max(128).nullable(),
  status: z.enum(BankAccountStatusValues),
  isPrimary: z.boolean(),
  activatedAt: UtcDateTimeSchema.nullable(),
  deactivatedAt: UtcDateTimeSchema.nullable(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export type BankAccount = z.infer<typeof BankAccountSchema>;
