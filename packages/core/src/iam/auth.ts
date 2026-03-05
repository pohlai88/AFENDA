/**
 * Auth service — resolve a principal's full RequestContext from the DB.
 *
 * ADR-0003 MIGRATION COMPLETE:
 *   - Uses party/principal/membership tables
 *   - Old tenant/iam_user functions have been removed
 *
 * Given an email and org slug, looks up the principal, verifies membership,
 * fetches roles + permissions, and returns a typed RequestContext.
 *
 * RBAC MODEL:
 *   - `iamPermission` keys are **global** (not org-scoped).
 *   - `iamRole` is **org-scoped** (carries `orgId`).
 *   - `iamPrincipalRole` links (principal, org) → role.
 *   - Roles and permissions are therefore **per (principal, org)** — not
 *     per hat (partyRoleId). Switching hats does not change permissions.
 *   - Permission resolution chain: principalRole(orgId) → role(orgId) →
 *     rolePermission → permission(global). The org scoping is enforced by
 *     the principalRole query, NOT by the rolePermission query.
 *
 * MEMBERSHIP:
 *   - Schema currently lacks `revokedAt` / `status`. When those columns land,
 *     queries MUST filter by `isNull(membership.revokedAt)` (fail-closed).
 *   - Deterministic hat selection: ordered by `membership.createdAt ASC`
 *     (oldest membership first). Explicit `partyRoleId` overrides.
 */

import { RequestContextSchema, ContextItemSchema } from "@afenda/contracts";
import type { RequestContext, ContextItem } from "@afenda/contracts";
import type { DbClient } from "@afenda/db";
import {
  iamRole,
  iamRolePermission,
  iamPermission,
  iamPrincipal,
  iamPrincipalRole,
  organization,
  membership,
  partyRole,
  party,
  person,
} from "@afenda/db";
import { eq, and, inArray, asc, sql } from "drizzle-orm";
import { resolveOrgId } from "./organization.js";

// ═══════════════════════════════════════════════════════════════════════════════
// Principal context resolution
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resolve a RequestContext for an authenticated principal in an organization.
 *
 * Steps:
 *   1. Find principal by email.
 *   2. Resolve organization by slug → branded OrgId.
 *   3. Find active memberships (deterministic order: createdAt ASC).
 *   4. Select hat (explicit partyRoleId or oldest membership).
 *   5. Fetch roles for (principal, org) — org-wide, not hat-specific.
 *   6. Fetch permissions for those roles (global permission keys).
 *   7. Parse through RequestContextSchema (deduplication + permissionsSet).
 *
 * @returns RequestContext or `null` if principal/org/membership not found.
 */
export async function resolvePrincipalContext(
  db: DbClient,
  email: string,
  orgSlug: string,
  correlationId: string,
  partyRoleId?: string,
): Promise<RequestContext | null> {
  // 1. Find principal by email
  const principals = await db
    .select({ id: iamPrincipal.id, personId: iamPrincipal.personId })
    .from(iamPrincipal)
    .where(eq(iamPrincipal.email, email))
    .limit(1);

  if (principals.length === 0) return null;
  const principal = principals[0]!;

  // 2. Resolve organization by slug
  const orgId = await resolveOrgId(db, orgSlug);
  if (!orgId) return null;

  // 3. Find membership(s) for this principal in this org.
  //    Ordered by createdAt ASC for deterministic default selection.
  //    TODO(sprint-2): when membership.revokedAt / status columns land,
  //    add `isNull(membership.revokedAt)` here — fail-closed.
  const membershipRows = await db
    .select({
      membershipId: membership.id,
      partyRoleId: membership.partyRoleId,
      roleType: partyRole.roleType,
    })
    .from(membership)
    .innerJoin(partyRole, eq(membership.partyRoleId, partyRole.id))
    .where(and(eq(membership.principalId, principal.id), eq(partyRole.orgId, orgId)))
    .orderBy(asc(membership.createdAt));

  if (membershipRows.length === 0) return null;

  // 4. Select the active context (explicit hat or oldest membership).
  let activePartyRoleId: string;
  let activeRoleType: string;

  if (partyRoleId) {
    const match = membershipRows.find((m) => m.partyRoleId === partyRoleId);
    if (!match) return null; // requested hat not available
    activePartyRoleId = match.partyRoleId;
    activeRoleType = match.roleType;
  } else {
    // Deterministic default: oldest membership (first after ORDER BY)
    activePartyRoleId = membershipRows[0]!.partyRoleId;
    activeRoleType = membershipRows[0]!.roleType;
  }

  // 5. Get principal's roles for this org.
  //    Roles are (principal, org)-scoped — switching hats does NOT change
  //    the permission set. If future requirements need hat-specific roles,
  //    add partyRoleId to iamPrincipalRole and filter here.
  const principalRoles = await db
    .select({ roleId: iamPrincipalRole.roleId, roleKey: iamRole.key })
    .from(iamPrincipalRole)
    .innerJoin(iamRole, eq(iamPrincipalRole.roleId, iamRole.id))
    .where(and(eq(iamPrincipalRole.orgId, orgId), eq(iamPrincipalRole.principalId, principal.id)));

  const roles = principalRoles.map((r) => r.roleKey);
  const roleIds = principalRoles.map((r) => r.roleId);

  // 6. Get permissions for those roles.
  //    Permission keys are global (iamPermission has no orgId).
  //    Org scoping is already enforced by step 5: the roleIds come from
  //    iamPrincipalRole filtered by orgId → iamRole (which also has orgId).
  //    No additional orgId filter needed on iamRolePermission.
  let permissions: string[] = [];
  if (roleIds.length > 0) {
    const rolePerms = await db
      .select({ permKey: iamPermission.key })
      .from(iamRolePermission)
      .innerJoin(iamPermission, eq(iamRolePermission.permissionId, iamPermission.id))
      .where(inArray(iamRolePermission.roleId, roleIds));

    permissions = [...new Set(rolePerms.map((p) => p.permKey))];
  }

  // 7. Parse through RequestContextSchema — deduplicates roles/permissions,
  //    auto-computes permissionsSet (ReadonlySet<string>) for O(1) checks.
  return RequestContextSchema.parse({
    principalId: principal.id,
    activeContext: {
      partyRoleId: activePartyRoleId,
      orgId,
      roleType: activeRoleType,
    },
    roles,
    permissions,
    correlationId,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Context listing (hat switching UI)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * List all available contexts (hats) for a principal.
 * Used by /me/contexts endpoint for context switching UI.
 *
 * Returns parsed `ContextItem[]` — validated and typed via contracts schema.
 * Resolves partyName from the underlying party (person name or org name).
 *
 * TODO(sprint-2): filter by active memberships when revokedAt lands.
 */
export async function listPrincipalContexts(
  db: DbClient,
  principalId: string,
): Promise<ContextItem[]> {
  const rows = await db
    .select({
      partyRoleId: partyRole.id,
      orgId: organization.id,
      orgName: organization.name,
      roleType: partyRole.roleType,
      // Party name: COALESCE person.name → organization.name (via party)
      partyName: sql<string>`coalesce(${person.name}, ${organization.name}, 'Unknown')`.as(
        "party_name",
      ),
    })
    .from(membership)
    .innerJoin(partyRole, eq(membership.partyRoleId, partyRole.id))
    .innerJoin(organization, eq(partyRole.orgId, organization.id))
    .innerJoin(party, eq(partyRole.partyId, party.id))
    .leftJoin(person, eq(party.id, person.id))
    .where(eq(membership.principalId, principalId))
    .orderBy(asc(organization.name), asc(partyRole.roleType));

  return rows.map((r) => ContextItemSchema.parse(r));
}
