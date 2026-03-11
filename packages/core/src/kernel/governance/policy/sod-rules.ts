/**
 * Separation of Duties (SoD) policy rules — governance concern.
 *
 * ADR-0005 §3.2: SoD is a governance capability → kernel owns it.
 * ERP domain services import these rules from kernel, never the reverse.
 *
 * All functions return PolicyResult — a discriminated union with a stable
 * `code` so callers (API/UI) can translate denials without parsing free-text.
 *
 * Permission strings are always referenced via `Permissions.*` from
 * `@afenda/contracts` — never hardcoded literals.
 * No role-name checks, ever. Permission-based only.
 *
 * ADR-0003: Uses PrincipalId (replaces deprecated UserId).
 */

import type { PrincipalId } from "@afenda/contracts";
import { Permissions } from "@afenda/contracts";
import { hasPermission } from "../../identity/permissions";

import type { PolicyContext, PolicyDenialCode, PolicyResult } from "@afenda/contracts";

type Permission = (typeof Permissions)[keyof typeof Permissions];

/**
 * Helper: construct a uniform denial result with optional structured metadata.
 */
function deny(code: PolicyDenialCode, reason: string, meta?: Record<string, string>): PolicyResult {
  return { allowed: false, code, reason, meta };
}

/**
 * Helper: check for a required permission.
 * Returns denial result if missing, null if present.
 */
function requirePermission(ctx: PolicyContext, perm: Permission): PolicyResult | null {
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
 */
export function canApproveInvoice(
  ctx: PolicyContext,
  submittedByPrincipalId?: PrincipalId | null,
): PolicyResult {
  const permDenied = requirePermission(ctx, Permissions.apInvoiceApprove);
  if (permDenied) return permDenied;

  if (!ctx.principalId) {
    return deny("MISSING_CONTEXT", "Missing principalId in request context", {
      field: "principalId",
    });
  }

  if (!submittedByPrincipalId) {
    return deny("MISSING_CONTEXT", "Missing invoice submitter principalId", {
      field: "submittedByPrincipalId",
    });
  }

  if (ctx.principalId === submittedByPrincipalId) {
    return deny("SOD_SAME_PRINCIPAL", "SoD violation: invoice submitter cannot be the approver");
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
