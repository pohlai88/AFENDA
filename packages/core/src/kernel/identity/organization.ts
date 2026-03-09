/**
 * Organization resolution helpers.
 *
 * Resolves an organization UUID from its slug.
 * Used by the API to convert the human-readable slug (from subdomain / header)
 * into the UUID used by all other tables.
 *
 * Returns a branded ID so callers cannot accidentally treat the raw
 * string as a user ID, invoice ID, or other UUID-typed field.
 *
 * Slug rules:
 *   - Trimmed, lowercased before lookup (canonical form).
 *   - DB column `organization.slug` is `UNIQUE NOT NULL`.
 *   - Slugs must be stored normalized (lowercase) at write time.
 *
 * ADR-0003 MIGRATION COMPLETE:
 *   - Old `resolveTenantId` and `tenant` table have been removed.
 *   - File renamed from `tenant.ts` → `organization.ts`.
 */

import type { DbClient } from "@afenda/db";
import { organization, partyRole, membership, iamPrincipal, person } from "@afenda/db";
import { eq, and } from "drizzle-orm";
import { OrgIdSchema, type OrgId, type OrgProfileResponse, type OrgMember } from "@afenda/contracts";

/**
 * Look up organization UUID by slug.
 *
 * Canonical slug rules:
 *   - trimmed
 *   - lowercase
 *
 * @returns Branded `OrgId` or `null` if not found / invalid slug.
 */
export async function resolveOrgId(db: DbClient, slug: string): Promise<OrgId | null> {
  const s = slug.trim().toLowerCase();
  if (!s) return null;

  const rows = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, s))
    .limit(1);

  return rows[0] ? OrgIdSchema.parse(rows[0].id) : null;
}

/** Get the profile of an organization by its UUID. Returns null if not found. */
export async function getOrgProfile(
  db: DbClient,
  orgId: OrgId,
): Promise<OrgProfileResponse | null> {
  const rows = await db
    .select({
      id: organization.id,
      slug: organization.slug,
      name: organization.name,
      functionalCurrency: organization.functionalCurrency,
      createdAt: organization.createdAt,
    })
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    functionalCurrency: row.functionalCurrency,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Update name and/or functional_currency on the organization record. */
export async function updateOrgProfile(
  db: DbClient,
  orgId: OrgId,
  updates: { name?: string; functionalCurrency?: string },
): Promise<void> {
  const set: { name?: string; functionalCurrency?: string } = {};
  if (updates.name) set.name = updates.name;
  if (updates.functionalCurrency) set.functionalCurrency = updates.functionalCurrency;
  if (Object.keys(set).length === 0) return;

  await db.update(organization).set(set).where(eq(organization.id, orgId));
}

/** List all members of an org (party_role → membership → iam_principal → person). */
export async function listOrgMembers(
  db: DbClient,
  orgId: OrgId,
): Promise<OrgMember[]> {
  const rows = await db
    .select({
      principalId: iamPrincipal.id,
      email: iamPrincipal.email,
      name: person.name,
      role: partyRole.roleType,
      joinedAt: membership.createdAt,
    })
    .from(partyRole)
    .innerJoin(membership, eq(membership.partyRoleId, partyRole.id))
    .innerJoin(iamPrincipal, eq(iamPrincipal.id, membership.principalId))
    .leftJoin(person, eq(person.id, iamPrincipal.personId))
    .where(and(eq(partyRole.orgId, orgId)));

  return rows.map((r) => ({
    principalId: r.principalId,
    email: r.email ?? null,
    name: r.name ?? null,
    role: r.role,
    joinedAt: r.joinedAt.toISOString(),
  }));
}
