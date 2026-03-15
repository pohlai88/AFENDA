/**
 * Shared context builder utilities for API route handlers.
 *
 * Eliminates repeated buildCtx/buildPolicyCtx helpers across route files.
 * Use these instead of declaring local helpers in each route module.
 */
import type { OrgId, PrincipalId } from "@afenda/contracts";
import type { OrgScopedContext, PolicyContext } from "@afenda/core";

/**
 * Build org-scoped context for core service calls.
 * Standard pattern used by all command/query services.
 *
 * @example
 * const ctx = buildOrgScopedContext(req.orgId);
 * const result = await createInvoice(app.db, ctx, cmd);
 */
export function buildOrgScopedContext(orgId: string): OrgScopedContext {
  return { activeContext: { orgId: orgId as OrgId } };
}

/**
 * Build policy context with principal ID and permissions set.
 * Used by services that require permission checks.
 *
 * @example
 * const policyCtx = buildPolicyContext(req);
 * const result = await deleteComment(app.db, ctx, policyCtx, commentId);
 */
export function buildPolicyContext(req: {
  ctx?: { principalId: PrincipalId; permissionsSet: ReadonlySet<string> };
}): PolicyContext {
  return {
    principalId: req.ctx?.principalId,
    permissionsSet: req.ctx?.permissionsSet ?? new Set(),
  };
}

/**
 * Build minimal policy context with only principal ID.
 * Variant for services that only need principal identity (no permission check).
 *
 * @example
 * const policyCtx = buildMinimalPolicyContext(req);
 * const result = await postChatterMessage(app.db, ctx, policyCtx, cmd);
 */
export function buildMinimalPolicyContext(req: { ctx?: { principalId: PrincipalId } }): {
  principalId: PrincipalId | null;
} {
  return { principalId: req.ctx?.principalId ?? null };
}
