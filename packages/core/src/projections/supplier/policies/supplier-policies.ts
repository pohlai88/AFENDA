/**
 * Supplier portal policies — portal-scoped authorization checks.
 *
 * These thin wrappers check whether the current principal has the
 * required permissions for supplier portal operations. They use
 * PolicyContext from @afenda/contracts.
 *
 * RULES:
 *   - Use PolicyContext.permissionsSet for O(1) permission checks
 *   - Return PolicyResult (not boolean) for structured denials
 *   - Do NOT duplicate SoD rules — those live in kernel/governance/policy
 */

import type { PolicyContext, PolicyResult } from "@afenda/contracts";

/**
 * Check whether the caller can view supplier invoices.
 */
export function canViewSupplierInvoices(ctx: PolicyContext): PolicyResult {
  if (ctx.permissionsSet.has("ap.invoice.read")) {
    return { allowed: true };
  }

  return {
    allowed: false,
    code: "MISSING_PERMISSION",
    reason: "Requires ap.invoice.read permission",
  };
}

/**
 * Check whether the caller can submit invoices through the supplier portal.
 */
export function canSubmitSupplierInvoice(ctx: PolicyContext): PolicyResult {
  if (!ctx.principalId) {
    return {
      allowed: false,
      code: "MISSING_CONTEXT",
      reason: "Principal ID is required to submit invoices",
    };
  }

  if (ctx.permissionsSet.has("ap.invoice.submit")) {
    return { allowed: true };
  }

  return {
    allowed: false,
    code: "MISSING_PERMISSION",
    reason: "Requires ap.invoice.submit permission",
  };
}

/**
 * Check whether the caller can view holds on supplier invoices.
 */
export function canViewSupplierHolds(ctx: PolicyContext): PolicyResult {
  if (ctx.permissionsSet.has("ap.hold.read")) {
    return { allowed: true };
  }

  return {
    allowed: false,
    code: "MISSING_PERMISSION",
    reason: "Requires ap.hold.read permission",
  };
}
