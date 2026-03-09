/**
 * Centralized permission checking utilities.
 *
 * O(1) permission checks via Set-based lookup.
 * Separated from auth.ts to avoid pulling in DB dependencies during tests.
 */

/**
 * Check if a context has a specific permission.
 * O(1) lookup via `permissionsSet` (auto-computed in RequestContextSchema).
 *
 * Use this everywhere instead of `ctx.permissions.includes(perm)`.
 *
 * @example
 * ```ts
 * if (!hasPermission(ctx, Permissions.apInvoiceApprove)) {
 *   return { allowed: false, code: "MISSING_PERMISSION" };
 * }
 * ```
 */
export function hasPermission(
  ctx: { permissionsSet: ReadonlySet<string> },
  permission: string,
): boolean {
  return ctx.permissionsSet.has(permission);
}
