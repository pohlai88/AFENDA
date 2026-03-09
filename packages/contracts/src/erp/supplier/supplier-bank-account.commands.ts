/**
 * Command schemas for SupplierBankAccount entity.
 *
 * RULES:
 *   1. Every command MUST include idempotencyKey.
 *   2. Server-generated fields (id, timestamps, actorPrincipalId) are NOT in commands.
 *   3. Add new error codes to shared/errors.ts.
 *   4. Add new audit actions to kernel/governance/audit/actions.ts.
 *   5. Add to barrel: packages/contracts/src/<domain>/index.ts
 */
import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { SupplierIdSchema } from "../../shared/ids.js";
import {
  SupplierBankAccountIdSchema,
  BankAccountTypeValues,
} from "./supplier-bank-account.entity.js";

// ── Create command ────────────────────────────────────────────────────────────

export const CreateSupplierBankAccountCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  /** Parent supplier */
  supplierId: SupplierIdSchema,
  /** Human-readable account nickname */
  nickname: z.string().trim().min(1).max(100),
  /** Bank name */
  bankName: z.string().trim().min(1).max(255),
  /** Bank branch name/location (optional) */
  branchName: z.string().trim().max(255).optional(),

  // Domestic (US) bank details
  /** ABA routing number */
  routingNumber: z.string().trim().max(20).optional(),
  /** Bank account number */
  accountNumber: z.string().trim().min(1).max(50),
  /** Account type */
  accountType: z.enum(BankAccountTypeValues),

  // International bank details
  /** IBAN (International Bank Account Number) */
  iban: z.string().trim().max(34).optional(),
  /** BIC/SWIFT code */
  bicSwift: z.string().trim().max(11).optional(),

  /** ISO 4217 currency code */
  currencyCode: z.string().length(3).toUpperCase(),
  /** ISO 3166-1 alpha-2 country code for the bank */
  bankCountryCode: z.string().length(2).toUpperCase(),

  /** Whether this is the primary/default account */
  isPrimary: z.boolean().optional().default(false),
});

export type CreateSupplierBankAccountCommand = z.infer<typeof CreateSupplierBankAccountCommandSchema>;

// ── Update command ────────────────────────────────────────────────────────────

export const UpdateSupplierBankAccountCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  /** ID of the bank account to update */
  id: SupplierBankAccountIdSchema,

  /** Updated nickname */
  nickname: z.string().trim().min(1).max(100).optional(),
  /** Updated bank name */
  bankName: z.string().trim().min(1).max(255).optional(),
  /** Updated branch name */
  branchName: z.string().trim().max(255).nullish(),

  // Note: Account number changes require re-verification
  /** Updated account type */
  accountType: z.enum(BankAccountTypeValues).optional(),
});

export type UpdateSupplierBankAccountCommand = z.infer<typeof UpdateSupplierBankAccountCommandSchema>;

// ── Verify command ────────────────────────────────────────────────────────────

export const VerifySupplierBankAccountCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  /** ID of the bank account to verify */
  id: SupplierBankAccountIdSchema,
  /** Verification notes (optional) */
  notes: z.string().trim().max(500).optional(),
});

export type VerifySupplierBankAccountCommand = z.infer<typeof VerifySupplierBankAccountCommandSchema>;

// ── Set Primary command ───────────────────────────────────────────────────────

export const SetPrimaryBankAccountCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  /** ID of the bank account to make primary */
  id: SupplierBankAccountIdSchema,
});

export type SetPrimaryBankAccountCommand = z.infer<typeof SetPrimaryBankAccountCommandSchema>;

// ── Deactivate command ────────────────────────────────────────────────────────

export const DeactivateSupplierBankAccountCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  /** ID of the bank account to deactivate */
  id: SupplierBankAccountIdSchema,
  /** Reason for deactivation */
  reason: z.string().trim().min(1).max(500).optional(),
});

export type DeactivateSupplierBankAccountCommand = z.infer<typeof DeactivateSupplierBankAccountCommandSchema>;
