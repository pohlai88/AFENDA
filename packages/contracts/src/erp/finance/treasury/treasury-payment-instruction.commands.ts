import { z } from "zod";
import { IdempotencyKeySchema } from "../../../kernel/execution/idempotency/request-key.js";
import { CurrencyCodeSchema } from "../../../shared/money.js";
import { TreasuryPaymentMethodSchema } from "./treasury-shared.entity.js";
import { PaymentInstructionIdSchema } from "./treasury-payment-instruction.entity.js";
import { BankAccountIdSchema } from "./bank-account.entity.js";

// ── Create ────────────────────────────────────────────────────────────────────

export const CreatePaymentInstructionCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  sourceBankAccountId: BankAccountIdSchema,
  beneficiaryName: z.string().trim().min(1).max(255),
  beneficiaryAccountNumber: z.string().trim().min(1).max(64),
  beneficiaryBankCode: z.string().trim().max(32).optional(),
  /** Amount in minor units (cents) */
  amountMinor: z.string(),
  currencyCode: CurrencyCodeSchema,
  paymentMethod: TreasuryPaymentMethodSchema,
  reference: z.string().trim().max(128).optional(),
  requestedExecutionDate: z.string().date(),
});
export type CreatePaymentInstructionCommand = z.infer<
  typeof CreatePaymentInstructionCommandSchema
>;

// ── Submit ────────────────────────────────────────────────────────────────────

export const SubmitPaymentInstructionCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  paymentInstructionId: PaymentInstructionIdSchema,
});
export type SubmitPaymentInstructionCommand = z.infer<
  typeof SubmitPaymentInstructionCommandSchema
>;

// ── Approve ───────────────────────────────────────────────────────────────────

export const ApprovePaymentInstructionCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  paymentInstructionId: PaymentInstructionIdSchema,
});
export type ApprovePaymentInstructionCommand = z.infer<
  typeof ApprovePaymentInstructionCommandSchema
>;

// ── Reject ────────────────────────────────────────────────────────────────────

export const RejectPaymentInstructionCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  paymentInstructionId: PaymentInstructionIdSchema,
  reason: z.string().trim().min(1).max(255),
});
export type RejectPaymentInstructionCommand = z.infer<
  typeof RejectPaymentInstructionCommandSchema
>;
