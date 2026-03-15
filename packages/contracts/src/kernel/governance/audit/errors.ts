/**
 * @afenda/contracts — Audit error codes.
 *
 * RULES:
 *   1. Format: UPPER_SNAKE_CASE with "AUDIT_" prefix.
 *   2. Every error case in audit services MUST have a code here.
 *   3. Adding a code is safe. Removing/renaming is BREAKING.
 */

import { z } from "zod";

// ── Audit Error Codes ─────────────────────────────────────────────────────────

// Currently no audit-specific error codes defined.
// Audit operations use SHARED_* codes (FORBIDDEN, NOT_FOUND, etc.)

export const AuditErrorCodeValues = [] as const;

export const AuditErrorCodeSchema = z.enum(["AUDIT_PLACEHOLDER"] as unknown as readonly [
  string,
  ...string[],
]);

export type AuditErrorCode = z.infer<typeof AuditErrorCodeSchema>;
