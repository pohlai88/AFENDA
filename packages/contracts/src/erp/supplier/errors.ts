/**
 * Supplier management error codes.
 *
 * RULES:
 *   1. All codes prefixed with SUP_ or PURCH_
 *   2. Naming convention: SUP_NOUN_REASON (SCREAMING_SNAKE_CASE)
 *   3. Removing or renaming a code is a BREAKING CHANGE
 */
import { z } from "zod";

// ─── Supplier Error Codes ─────────────────────────────────────────────────────
export const SUP_SUPPLIER_NOT_FOUND = "SUP_SUPPLIER_NOT_FOUND" as const;
export const SUP_SUPPLIER_ALREADY_ACTIVE = "SUP_SUPPLIER_ALREADY_ACTIVE" as const;

// ─── Supplier Site Error Codes ────────────────────────────────────────────────
export const SUP_SITE_NOT_FOUND = "SUP_SITE_NOT_FOUND" as const;
export const SUP_SITE_ALREADY_PRIMARY = "SUP_SITE_ALREADY_PRIMARY" as const;
export const SUP_CANNOT_DEACTIVATE_PRIMARY_SITE = "SUP_CANNOT_DEACTIVATE_PRIMARY_SITE" as const;

// ─── Supplier Bank Account Error Codes ────────────────────────────────────────
export const SUP_BANK_ACCOUNT_NOT_FOUND = "SUP_BANK_ACCOUNT_NOT_FOUND" as const;
export const SUP_BANK_ACCOUNT_ALREADY_PRIMARY = "SUP_BANK_ACCOUNT_ALREADY_PRIMARY" as const;
export const SUP_BANK_ACCOUNT_ALREADY_VERIFIED = "SUP_BANK_ACCOUNT_ALREADY_VERIFIED" as const;
export const SUP_BANK_ACCOUNT_NOT_VERIFIED = "SUP_BANK_ACCOUNT_NOT_VERIFIED" as const;
export const SUP_CANNOT_DEACTIVATE_PRIMARY_ACCOUNT =
  "SUP_CANNOT_DEACTIVATE_PRIMARY_ACCOUNT" as const;

// ─── Purchasing Error Codes ───────────────────────────────────────────────────
export const PURCH_PURCHASE_ORDER_NOT_FOUND = "PURCH_PURCHASE_ORDER_NOT_FOUND" as const;
export const PURCH_PURCHASE_ORDER_NUMBER_EXISTS = "PURCH_PURCHASE_ORDER_NUMBER_EXISTS" as const;
export const PURCH_RECEIPT_NOT_FOUND = "PURCH_RECEIPT_NOT_FOUND" as const;
export const PURCH_RECEIPT_NUMBER_EXISTS = "PURCH_RECEIPT_NUMBER_EXISTS" as const;
export const PURCH_RECEIPT_PO_NOT_FOUND = "PURCH_RECEIPT_PO_NOT_FOUND" as const;

// ─── Supplier Error Code Array ────────────────────────────────────────────────
export const SupplierErrorCodeValues = [
  // Supplier
  SUP_SUPPLIER_NOT_FOUND,
  SUP_SUPPLIER_ALREADY_ACTIVE,

  // Supplier Sites
  SUP_SITE_NOT_FOUND,
  SUP_SITE_ALREADY_PRIMARY,
  SUP_CANNOT_DEACTIVATE_PRIMARY_SITE,

  // Supplier Bank Accounts
  SUP_BANK_ACCOUNT_NOT_FOUND,
  SUP_BANK_ACCOUNT_ALREADY_PRIMARY,
  SUP_BANK_ACCOUNT_ALREADY_VERIFIED,
  SUP_BANK_ACCOUNT_NOT_VERIFIED,
  SUP_CANNOT_DEACTIVATE_PRIMARY_ACCOUNT,

  // Purchasing
  PURCH_PURCHASE_ORDER_NOT_FOUND,
  PURCH_PURCHASE_ORDER_NUMBER_EXISTS,
  PURCH_RECEIPT_NOT_FOUND,
  PURCH_RECEIPT_NUMBER_EXISTS,
  PURCH_RECEIPT_PO_NOT_FOUND,
] as const;

export const SupplierErrorCodeSchema = z.enum(SupplierErrorCodeValues);
export type SupplierErrorCode = z.infer<typeof SupplierErrorCodeSchema>;
