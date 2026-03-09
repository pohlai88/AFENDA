/**
 * SupplierBankAccount entity — payment destinations for a supplier.
 *
 * A supplier can have multiple bank accounts for receiving payments.
 * Supports both domestic (ABA/account number) and international (IBAN/BIC) formats.
 *
 * RULES:
 *   1. Bank accounts require verification before use in payment runs.
 *   2. Only one account can be marked as primary per supplier.
 *   3. Accounts are soft-deactivated, never deleted (audit trail requirement).
 *   4. Sensitive fields (full account number) are masked in API responses.
 */
import { z } from "zod";
import { OrgIdSchema, SupplierIdSchema, PrincipalIdSchema, brandedUuid } from "../../shared/ids.js";
import { UtcDateTimeSchema } from "../../shared/datetime.js";

// ── Branded ID ────────────────────────────────────────────────────────────────

export const SupplierBankAccountIdSchema = brandedUuid("SupplierBankAccountId");
export type SupplierBankAccountId = z.infer<typeof SupplierBankAccountIdSchema>;

// ── Account Type values ───────────────────────────────────────────────────────

export const BankAccountTypeValues = ["CHECKING", "SAVINGS", "MONEY_MARKET"] as const;

export type BankAccountType = (typeof BankAccountTypeValues)[number];

// ── Verification Status values ────────────────────────────────────────────────

export const BankAccountVerificationStatusValues = [
  "UNVERIFIED",
  "PENDING",
  "VERIFIED",
  "FAILED",
] as const;

export type BankAccountVerificationStatus = (typeof BankAccountVerificationStatusValues)[number];

// ── Status values ─────────────────────────────────────────────────────────────

export const SupplierBankAccountStatusValues = ["active", "inactive"] as const;

export type SupplierBankAccountStatus = (typeof SupplierBankAccountStatusValues)[number];

// ── SupplierBankAccount schema ────────────────────────────────────────────────

export const SupplierBankAccountSchema = z.object({
  /** Unique identifier for the bank account */
  id: SupplierBankAccountIdSchema,
  /** Organization that owns this supplier relationship */
  orgId: OrgIdSchema,
  /** Parent supplier */
  supplierId: SupplierIdSchema,

  /** Human-readable account nickname (e.g., "Main Operating Account") */
  nickname: z.string().trim().min(1).max(100),
  /** Bank name */
  bankName: z.string().trim().min(1).max(255),
  /** Bank branch name/location (optional) */
  branchName: z.string().trim().max(255).nullish(),

  // Domestic (US) bank details
  /** ABA routing number (9 digits for US banks) */
  routingNumber: z.string().trim().max(20).nullish(),
  /** Bank account number */
  accountNumber: z.string().trim().max(50),
  /** Account type */
  accountType: z.enum(BankAccountTypeValues),

  // International bank details
  /** IBAN (International Bank Account Number) */
  iban: z.string().trim().max(34).nullish(),
  /** BIC/SWIFT code */
  bicSwift: z.string().trim().max(11).nullish(),

  /** ISO 4217 currency code (e.g., "USD", "EUR", "MXN") */
  currencyCode: z.string().length(3).toUpperCase(),
  /** ISO 3166-1 alpha-2 country code for the bank */
  bankCountryCode: z.string().length(2).toUpperCase(),

  /** Whether this is the primary/default account for payments */
  isPrimary: z.boolean(),

  /** Verification status for fraud prevention */
  verificationStatus: z.enum(BankAccountVerificationStatusValues),
  /** When the account was verified */
  verifiedAt: UtcDateTimeSchema.nullish(),
  /** Principal who verified the account */
  verifiedByPrincipalId: PrincipalIdSchema.nullish(),

  /** Status: active or inactive */
  status: z.enum(SupplierBankAccountStatusValues),

  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export type SupplierBankAccount = z.infer<typeof SupplierBankAccountSchema>;
