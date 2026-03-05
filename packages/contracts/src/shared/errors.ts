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

  // SUP — supplier management
  "SUP_SUPPLIER_NOT_FOUND",
  "SUP_SUPPLIER_ALREADY_ACTIVE",

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
] as const;

/**
 * Enforces SCOPE_NOUN_REASON shape at runtime.
 * Catches accidental `Shared_NotFound` or `APInvoiceNotFound` at parse time.
 */
const ERROR_CODE_PATTERN = /^[A-Z]+_[A-Z0-9]+_[A-Z0-9_]+$/;

export const ErrorCodeSchema = z
  .enum(ErrorCodeValues)
  .refine((v) => ERROR_CODE_PATTERN.test(v), {
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
