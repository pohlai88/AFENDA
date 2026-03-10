/**
 * Canonical error code registry.
 *
 * RULES:
 *   1. Clients switch on `code`, not HTTP status. Every distinct failure mode
 *      gets its own entry here — no free-form strings in API responses.
 *   2. Naming convention: SCOPE_NOUN_REASON (SCREAMING_SNAKE_CASE).
 *      - SHARED_* — infrastructure-level errors (auth, validation, idempotency)
 *      - AP_*     — accounts-payable / invoice workflow
 *      - IAM_*    — identity & access management
 *      - GL_*     — general ledger
 *      - SUP_*    — supplier management
 *      - DOC_*    — document / evidence
 *   3. `ErrorCodeValues` is `as const` so callers (DB check constraints, switch
 *      statements, test fixtures) can import the list without pulling Zod.
 *   4. Removing or renaming a code is a BREAKING CHANGE — add a deprecation
 *      comment for at least one major version before removal.
 *   5. HTTP status mapping lives in @afenda/core (or the API layer) — NEVER
 *      add status codes here. Contracts are transport-agnostic.
 */
import { z } from "zod";

// ─── Error code values (as const so DB/switch statements can reuse) ──────────
export const ErrorCodeValues = [
  // SHARED — infrastructure, cross-domain
  "SHARED_VALIDATION_ERROR",
  "SHARED_NOT_FOUND",
  "SHARED_CONFLICT",
  "SHARED_UNAUTHORIZED",
  "SHARED_FORBIDDEN",
  "SHARED_INTERNAL_ERROR",
  "SHARED_IDEMPOTENCY_CONFLICT",
  "SHARED_RATE_LIMITED",

  // AP — accounts-payable / invoice workflow
  "AP_INVOICE_NOT_FOUND",
  "AP_INVOICE_ALREADY_APPROVED",
  "AP_INVOICE_ALREADY_POSTED",
  "AP_INVOICE_ALREADY_VOIDED",
  "AP_INVOICE_ALREADY_PAID",
  "AP_INVOICE_INVALID_STATUS_TRANSITION",

  // AP — payment terms
  "AP_PAYMENT_TERMS_NOT_FOUND",
  "AP_PAYMENT_TERMS_CODE_EXISTS",

  // AP — holds
  "AP_HOLD_NOT_FOUND",
  "AP_HOLD_ALREADY_RELEASED",
  "AP_INVOICE_HAS_ACTIVE_HOLDS",

  // AP — invoice lines
  "AP_INVOICE_LINE_NOT_FOUND",
  "AP_INVOICE_LINE_DUPLICATE_NUMBER",

  // AP — payment runs
  "AP_PAYMENT_RUN_NOT_FOUND",
  "AP_PAYMENT_RUN_NOT_DRAFT",
  "AP_PAYMENT_RUN_ALREADY_APPROVED",
  "AP_PAYMENT_RUN_ALREADY_EXECUTED",
  "AP_PAYMENT_RUN_ALREADY_CANCELLED",
  "AP_PAYMENT_RUN_EMPTY",
  "AP_PAYMENT_RUN_CURRENCY_MISMATCH",

  // AP — payment run items
  "AP_PAYMENT_RUN_ITEM_NOT_FOUND",
  "AP_PAYMENT_RUN_ITEM_DUPLICATE_INVOICE",
  "AP_PAYMENT_RUN_ITEM_INVOICE_NOT_PAYABLE",
  "AP_PAYMENT_RUN_ITEM_AMOUNT_EXCEEDS_BALANCE",
  "AP_SUPPLIER_BANK_ACCOUNT_MISSING",

  // AP — prepayments
  "AP_PREPAYMENT_NOT_FOUND",
  "AP_PREPAYMENT_NUMBER_EXISTS",
  "AP_PREPAYMENT_INSUFFICIENT_BALANCE",
  "AP_PREPAYMENT_ALREADY_VOIDED",
  "AP_PREPAYMENT_CURRENCY_MISMATCH",
  "AP_PREPAYMENT_SUPPLIER_MISMATCH",
  "AP_PREPAYMENT_APPLICATION_NOT_FOUND",

  // AP — match tolerances
  "AP_MATCH_TOLERANCE_NOT_FOUND",
  "AP_MATCH_TOLERANCE_DUPLICATE_SCOPE",
  "AP_MATCH_TOLERANCE_OVER_VARIANCE",

  // AP — WHT certificates
  "AP_WHT_CERTIFICATE_NOT_FOUND",
  "AP_WHT_CERTIFICATE_NUMBER_EXISTS",
  "AP_WHT_CERTIFICATE_ALREADY_ISSUED",
  "AP_WHT_CERTIFICATE_ALREADY_SUBMITTED",
  "AP_WHT_CERTIFICATE_ALREADY_VOIDED",
  "AP_WHT_EXEMPTION_NOT_FOUND",
  "AP_WHT_EXEMPTION_EXPIRED",

  // SUP — supplier management
  "SUP_SUPPLIER_NOT_FOUND",
  "SUP_SUPPLIER_ALREADY_ACTIVE",

  // SUP — supplier sites
  "SUP_SITE_NOT_FOUND",
  "SUP_SITE_ALREADY_PRIMARY",
  "SUP_CANNOT_DEACTIVATE_PRIMARY_SITE",

  // PURCH — purchasing (PO, receipt)
  "PURCH_PURCHASE_ORDER_NOT_FOUND",
  "PURCH_PURCHASE_ORDER_NUMBER_EXISTS",
  "PURCH_RECEIPT_NOT_FOUND",
  "PURCH_RECEIPT_NUMBER_EXISTS",
  "PURCH_RECEIPT_PO_NOT_FOUND",

  // SUP — supplier bank accounts
  "SUP_BANK_ACCOUNT_NOT_FOUND",
  "SUP_BANK_ACCOUNT_ALREADY_PRIMARY",
  "SUP_BANK_ACCOUNT_ALREADY_VERIFIED",
  "SUP_BANK_ACCOUNT_NOT_VERIFIED",
  "SUP_CANNOT_DEACTIVATE_PRIMARY_ACCOUNT",

  // GL — general ledger
  "GL_JOURNAL_UNBALANCED",
  "GL_ACCOUNT_NOT_FOUND",
  "GL_ACCOUNT_INACTIVE",

  // DOC — document / evidence
  "DOC_DOCUMENT_NOT_FOUND",
  "DOC_DOCUMENT_ALREADY_ATTACHED",
  "DOC_MIME_NOT_ALLOWED",
  "DOC_FILE_TOO_LARGE",

  // IAM — identity & access management
  "IAM_ORG_NOT_FOUND",
  "IAM_PRINCIPAL_NOT_FOUND",
  "IAM_INSUFFICIENT_PERMISSIONS",
  "IAM_CREDENTIALS_INVALID",       // wrong email or password at sign-in
  "IAM_PASSWORD_CHANGE_INVALID",   // wrong current password when changing
  "IAM_EMAIL_ALREADY_REGISTERED",
  "IAM_RESET_TOKEN_INVALID",
  "IAM_RESET_TOKEN_EXPIRED",
  "IAM_PORTAL_ACCESS_DENIED",
  "IAM_PORTAL_INVITATION_REQUIRED",
  "IAM_PORTAL_INVITATION_INVALID",
  "IAM_PORTAL_INVITATION_EXPIRED",
  "IAM_ACCOUNT_LOCKED",            // too many failed login attempts

  // CFG — settings / configuration
  "CFG_SETTING_INVALID_VALUE",
  "CFG_SETTING_KEY_UNKNOWN",
  // Reserved — not used in Phase 1 (no route returns it yet):
  // "CFG_SETTING_NOT_FOUND",

  // CFG — custom fields (Phase 3)
  "CFG_CUSTOM_FIELD_KEY_IMMUTABLE",   // attempted api_key change on PATCH
  "CFG_CUSTOM_FIELD_NOT_FOUND",       // definition not found for this org
  "CFG_CUSTOM_FIELD_INVALID_VALUE",   // value fails data_type validation
  "CFG_CUSTOM_FIELD_ENTITY_TYPE_UNKNOWN", // entity_type not in controlled vocabulary
] as const;

// Named exports for IAM error codes (used by core, api)
export const IAM_ORG_NOT_FOUND = "IAM_ORG_NOT_FOUND" as const;
export const IAM_PRINCIPAL_NOT_FOUND = "IAM_PRINCIPAL_NOT_FOUND" as const;
export const IAM_INSUFFICIENT_PERMISSIONS = "IAM_INSUFFICIENT_PERMISSIONS" as const;
export const IAM_CREDENTIALS_INVALID = "IAM_CREDENTIALS_INVALID" as const;
export const IAM_PASSWORD_CHANGE_INVALID = "IAM_PASSWORD_CHANGE_INVALID" as const;
export const IAM_EMAIL_ALREADY_REGISTERED = "IAM_EMAIL_ALREADY_REGISTERED" as const;
export const IAM_RESET_TOKEN_INVALID = "IAM_RESET_TOKEN_INVALID" as const;
export const IAM_RESET_TOKEN_EXPIRED = "IAM_RESET_TOKEN_EXPIRED" as const;
export const IAM_PORTAL_ACCESS_DENIED = "IAM_PORTAL_ACCESS_DENIED" as const;
export const IAM_PORTAL_INVITATION_REQUIRED = "IAM_PORTAL_INVITATION_REQUIRED" as const;
export const IAM_PORTAL_INVITATION_INVALID = "IAM_PORTAL_INVITATION_INVALID" as const;
export const IAM_PORTAL_INVITATION_EXPIRED = "IAM_PORTAL_INVITATION_EXPIRED" as const;
export const IAM_ACCOUNT_LOCKED = "IAM_ACCOUNT_LOCKED" as const;

/**
 * Enforces SCOPE_NOUN_REASON shape at runtime.
 * Catches accidental `Shared_NotFound` or `APInvoiceNotFound` at parse time.
 */
const ERROR_CODE_PATTERN = /^[A-Z]+_[A-Z0-9]+_[A-Z0-9_]+$/;

export const ErrorCodeSchema = z.enum(ErrorCodeValues).refine((v) => ERROR_CODE_PATTERN.test(v), {
  message: "Error code must match SCOPE_NOUN_REASON (SCREAMING_SNAKE_CASE)",
});

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

// ─── Structured API error (pairs with ErrorEnvelope in envelope.ts) ──────────
export const ApiErrorSchema = z.object({
  code: ErrorCodeSchema,
  /** Human-readable message — must be non-empty. */
  message: z.string().min(1),
  /**
   * Dot-path to the offending field for single-field validation errors.
   * Use dot notation with bracket indices: `"invoice.lines[0].quantity"`
   */
  fieldPath: z.string().optional(),
  /** Additional structured details — JSON-safe freeform bag. */
  details: z.record(z.string(), z.unknown()).optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
