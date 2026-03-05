/**
 * Separation of Duties (SoD) policy layer.
 *
 * Rules live here, not in route handlers.
 * All functions return `PolicyResult` — a discriminated union with a stable
 * `code` so callers (API/UI) can translate denials without parsing free-text.
 *
 * Permission strings are always referenced via `Permissions.*` from
 * `@afenda/contracts` — never hardcoded literals — so a rename in the
 * registry is caught by the compiler rather than a runtime mismatch.
 *
 * No role-name checks, ever. Permission-based only.
 *
 * ADR-0003 MIGRATION:
 *   - Uses `PrincipalId` (replaces deprecated `UserId`)
 *   - Compares `ctx.principalId` (replaces deprecated `ctx.userId`)
 *   - Both still work due to aliasing during transition period
 *
 * AUDIT-GRADE HARDENING:
 *   - Structured `meta` field prevents reason-parsing in UI/API
 *   - Fail-closed policy for missing IDs (MISSING_CONTEXT)
 *   - Minimal PolicyContext prevents tight coupling to RequestContext
 *   - Helper functions (deny, requirePermission) ensure uniform rule structure
 */

import type { PrincipalId } from "@afenda/contracts";
import { Permissions } from "@afenda/contracts";
import { hasPermission } from "../iam/permissions.js";

type Permission = (typeof Permissions)[keyof typeof Permissions];

/**
 * Stable, contract-safe denial codes. UI/API translate these — never parse `reason`.
 * MISSING_CONTEXT: fail-closed policy for missing principal/submitter IDs during migration.
 */
export type PolicyDenialCode =
  | "MISSING_PERMISSION"
  | "SOD_SAME_PRINCIPAL"
  | "MISSING_CONTEXT";

/**
 * Policy result with structured metadata.
 * - `reason`: for logs only, never parsed by UI/API
 * - `meta`: structured payload for translation keys, UI rendering, audit trails
 */
export type PolicyResult =
  | { allowed: true }
  | {
      allowed: false;
      code: PolicyDenialCode;
      reason: string;
      meta?: Record<string, string>;
    };

/**
 * Minimal context required for policy evaluation.
 * Deliberately narrow to keep policy layer decoupled from full RequestContext.
 * - `principalId`: optional during migration or system-initiated actions
 * - `permissionsSet`: ReadonlySet for O(1) permission checks via hasPermission()
 */
export type PolicyContext = Readonly<{
  principalId?: PrincipalId;
  permissionsSet: ReadonlySet<string>;
}>;

/**
 * Helper: construct a uniform denial result with optional structured metadata.
 */
function deny(
  code: PolicyDenialCode,
  reason: string,
  meta?: Record<string, string>
): PolicyResult {
  return { allowed: false, code, reason, meta };
}

/**
 * Helper: check for a required permission.
 * Returns denial result if missing, null if present.
 * O(1) check via centralized hasPermission() from auth module.
 * Ensures all permission checks are uniform and auditable.
 */
function requirePermission(
  ctx: PolicyContext,
  perm: Permission
): PolicyResult | null {
  if (!hasPermission(ctx, perm)) {
    return deny("MISSING_PERMISSION", `Missing permission: ${perm}`, {
      permission: perm,
    });
  }
  return null;
}

/**
 * Core SoD rule: the principal who submitted an invoice cannot also approve it.
 * Fail-closed: if submitter or approver principal is unknown, approval is denied.
 *
 * ADR-0003: Uses `principalId` (the authenticated actor) instead of `userId`.
 * The submitter ID is stored on the invoice as `submittedByPrincipalId`.
 */
export function canApproveInvoice(
  ctx: PolicyContext,
  submittedByPrincipalId?: PrincipalId | null
): PolicyResult {
  const permDenied = requirePermission(ctx, Permissions.apInvoiceApprove);
  if (permDenied) return permDenied;

  if (!ctx.principalId) {
    return deny(
      "MISSING_CONTEXT",
      "Missing principalId in request context",
      { field: "principalId" }
    );
  }

  if (!submittedByPrincipalId) {
    return deny(
      "MISSING_CONTEXT",
      "Missing invoice submitter principalId",
      { field: "submittedByPrincipalId" }
    );
  }

  if (ctx.principalId === submittedByPrincipalId) {
    return deny(
      "SOD_SAME_PRINCIPAL",
      "SoD violation: invoice submitter cannot be the approver"
    );
  }

  return { allowed: true };
}

/**
 * Only principals with gl.journal.post may post to the GL.
 */
export function canPostToGL(ctx: PolicyContext): PolicyResult {
  const permDenied = requirePermission(ctx, Permissions.glJournalPost);
  if (permDenied) return permDenied;
  return { allowed: true };
}

/**
 * Only principals with ap.invoice.markpaid may mark invoices as paid.
 */
export function canMarkPaid(ctx: PolicyContext): PolicyResult {
  const permDenied = requirePermission(ctx, Permissions.apInvoiceMarkPaid);
  if (permDenied) return permDenied;
  return { allowed: true };
}
