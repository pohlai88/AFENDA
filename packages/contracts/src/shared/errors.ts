/**
 * Shared infrastructure error codes.
 *
 * CHANGELOG:
 *   - 2026-03-14: Refactored to ADR-0005 compliance — removed pillar imports from shared/.
 *   - Domain-specific error codes now in their respective pillar modules:
 *       AP_* → erp/finance/ap/errors.ts
 *       GL_* → erp/finance/gl/errors.ts
 *       SUP_*, PURCH_* → erp/supplier/errors.ts
 *       TREAS_*, TREASURY_*, TRY_* → erp/finance/treasury/errors.ts
 *       IAM_* → kernel/identity/errors.ts
 *       DOC_* (evidence) → kernel/governance/evidence/errors.ts
 *       CFG_* → kernel/registry/errors.ts
 *       COMM_* → comm/errors.ts
 *   - For combined ErrorCodeValues array, import from "@afenda/contracts" root barrel.
 *
 * SCOPE:
 *   This file contains ONLY shared infrastructure error codes (SHARED_* prefix).
 *   These are protocol/transport-level errors, not domain-specific business errors.
 *
 * RULES:
 *   1. shared/ pillar MUST NOT import from kernel/, erp/, or comm/ (ADR-0005 §3.2).
 *   2. Format: UPPER_SNAKE_CASE with "SHARED_" prefix.
 *   3. Clients switch on `code`, not HTTP status.
 *   4. Adding a code is safe. Removing/renaming is BREAKING.
 *   5. HTTP status mapping lives in @afenda/core or API layer — contracts are transport-agnostic.
 */
import { z } from "zod";

// ─── Shared infrastructure error codes ────────────────────────────────────────
export const SHARED_VALIDATION_ERROR = "SHARED_VALIDATION_ERROR" as const;
export const SHARED_NOT_FOUND = "SHARED_NOT_FOUND" as const;
export const SHARED_CONFLICT = "SHARED_CONFLICT" as const;
export const SHARED_UNAUTHORIZED = "SHARED_UNAUTHORIZED" as const;
export const SHARED_FORBIDDEN = "SHARED_FORBIDDEN" as const;
export const SHARED_INTERNAL_ERROR = "SHARED_INTERNAL_ERROR" as const;
export const SHARED_IDEMPOTENCY_CONFLICT = "SHARED_IDEMPOTENCY_CONFLICT" as const;
export const SHARED_RATE_LIMITED = "SHARED_RATE_LIMITED" as const;

export const SharedErrorCodeValues = [
  SHARED_VALIDATION_ERROR,
  SHARED_NOT_FOUND,
  SHARED_CONFLICT,
  SHARED_UNAUTHORIZED,
  SHARED_FORBIDDEN,
  SHARED_INTERNAL_ERROR,
  SHARED_IDEMPOTENCY_CONFLICT,
  SHARED_RATE_LIMITED,
] as const;

export const SharedErrorCodeSchema = z.enum(SharedErrorCodeValues);

export type SharedErrorCode = z.infer<typeof SharedErrorCodeSchema>;

// ─── Error Code Pattern Validation ────────────────────────────────────────────

/**
 * Enforces SCOPE_NOUN_REASON shape at runtime.
 * Pattern: UPPER_SNAKE_CASE with at least one underscore.
 * Examples: SHARED_NOT_FOUND, IAM_INVALID_TOKEN, AP_INVOICE_NOT_FOUND
 */
export const ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/;

// ─── Structured API error (pairs with ErrorEnvelope in envelope.ts) ──────────
export const ApiErrorSchema = z.object({
  code: z.string().regex(ERROR_CODE_PATTERN, {
    message: "Error code must match SCOPE_NOUN_REASON (SCREAMING_SNAKE_CASE)",
  }),
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
