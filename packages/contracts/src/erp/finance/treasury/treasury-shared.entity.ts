/**
 * Treasury shared primitives — status enums and movement directions.
 *
 * These foundational vocabulary types are used across all Treasury entities.
 * Concrete entity schemas (bank-account, bank-statement, etc.) are added in Wave 1+.
 *
 * NOTE: For currency and money types, import from `@afenda/contracts` shared primitives:
 *   - `CurrencyCodeSchema`, `CurrencyCode`  → shared/money.ts
 *   - `MoneySchema`, `Money`                → shared/money.ts
 *
 * RULES:
 *   - Status values arrays are `as const` so Drizzle pgEnum can import them directly
 *   - Money amounts are always bigint minor units (cents) — never float
 */
import { z } from "zod";

// ── Bank account status ───────────────────────────────────────────────────────

export const BankAccountStatusValues = ["active", "inactive", "suspended"] as const;
export const BankAccountStatusSchema = z.enum(BankAccountStatusValues);
export type BankAccountStatus = z.infer<typeof BankAccountStatusSchema>;

// ── Bank statement ingestion status ──────────────────────────────────────────

export const BankStatementStatusValues = ["pending", "processing", "processed", "failed"] as const;
export const BankStatementStatusSchema = z.enum(BankStatementStatusValues);
export type BankStatementStatus = z.infer<typeof BankStatementStatusSchema>;

// ── Statement line reconciliation status ─────────────────────────────────────

export const StatementLineStatusValues = ["unmatched", "matched", "excluded"] as const;
export const StatementLineStatusSchema = z.enum(StatementLineStatusValues);
export type StatementLineStatus = z.infer<typeof StatementLineStatusSchema>;

// ── Reconciliation session status ─────────────────────────────────────────────

export const ReconciliationSessionStatusValues = [
  "open",
  "matching",
  "closed",
  "voided",
] as const;
export const ReconciliationSessionStatusSchema = z.enum(ReconciliationSessionStatusValues);
export type ReconciliationSessionStatus = z.infer<typeof ReconciliationSessionStatusSchema>;

// ── Payment batch status ──────────────────────────────────────────────────────

export const PaymentBatchStatusValues = [
  "draft",
  "pending_approval",
  "approved",
  "releasing",
  "released",
  "failed",
  "cancelled",
] as const;
export const PaymentBatchStatusSchema = z.enum(PaymentBatchStatusValues);
export type PaymentBatchStatus = z.infer<typeof PaymentBatchStatusSchema>;

// ── Payment instruction status ────────────────────────────────────────────────

export const PaymentInstructionStatusValues = [
  "pending",
  "processing",
  "settled",
  "rejected",
  "cancelled",
] as const;
export const PaymentInstructionStatusSchema = z.enum(PaymentInstructionStatusValues);
export type PaymentInstructionStatus = z.infer<typeof PaymentInstructionStatusSchema>;

// ── Cash movement direction ───────────────────────────────────────────────────

export const CashMovementDirectionValues = ["inflow", "outflow"] as const;
export const CashMovementDirectionSchema = z.enum(CashMovementDirectionValues);
export type CashMovementDirection = z.infer<typeof CashMovementDirectionSchema>;

// ── Wave 2 enum vocabularies ─────────────────────────────────────────────────

export const ReconciliationTargetTypeValues = [
  "ap_payment",
  "bank_transfer",
  "manual_adjustment",
] as const;
export const ReconciliationTargetTypeSchema = z.enum(ReconciliationTargetTypeValues);
export type ReconciliationTargetType = z.infer<typeof ReconciliationTargetTypeSchema>;

export const ReconciliationMatchStatusValues = ["matched", "unmatched"] as const;
export const ReconciliationMatchStatusSchema = z.enum(ReconciliationMatchStatusValues);
export type ReconciliationMatchStatus = z.infer<typeof ReconciliationMatchStatusSchema>;

export const TreasuryPaymentMethodValues = [
  "bank_transfer",
  "internal_transfer",
  "check",
  "direct_debit",
  "manual",
] as const;
export const TreasuryPaymentMethodSchema = z.enum(TreasuryPaymentMethodValues);
export type TreasuryPaymentMethod = z.infer<typeof TreasuryPaymentMethodSchema>;
