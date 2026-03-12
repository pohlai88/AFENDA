import { z } from "zod";
import { brandedUuid, OrgIdSchema } from "../../../shared/ids.js";
import { UtcDateTimeSchema } from "../../../shared/datetime.js";
import { CurrencyCodeSchema } from "../../../shared/money.js";
import {
  PaymentInstructionStatusValues,
  TreasuryPaymentMethodValues,
} from "./treasury-shared.entity.js";
import { BankAccountIdSchema } from "./bank-account.entity.js";

export const PaymentInstructionIdSchema = brandedUuid("PaymentInstructionId");
export type PaymentInstructionId = z.infer<typeof PaymentInstructionIdSchema>;

export const PaymentInstructionSchema = z.object({
  id: PaymentInstructionIdSchema,
  orgId: OrgIdSchema,
  sourceBankAccountId: BankAccountIdSchema,
  beneficiaryName: z.string(),
  beneficiaryAccountNumber: z.string(),
  beneficiaryBankCode: z.string().nullable(),
  /** Amount in minor units (cents), stored as string for JSON-safety */
  amountMinor: z.string(),
  currencyCode: CurrencyCodeSchema,
  paymentMethod: z.enum(TreasuryPaymentMethodValues),
  reference: z.string().nullable(),
  requestedExecutionDate: z.string().date(),
  status: z.enum(PaymentInstructionStatusValues),
  createdByPrincipalId: z.string().uuid().nullable(),
  submittedAt: UtcDateTimeSchema.nullable(),
  approvedAt: UtcDateTimeSchema.nullable(),
  rejectedAt: UtcDateTimeSchema.nullable(),
  rejectionReason: z.string().nullable(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});
export type PaymentInstruction = z.infer<typeof PaymentInstructionSchema>;
