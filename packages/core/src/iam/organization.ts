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
import { organization } from "@afenda/db";
import { eq } from "drizzle-orm";
import { OrgIdSchema, type OrgId } from "@afenda/contracts";

/**
 * Look up organization UUID by slug.
 *
 * Canonical slug rules:
 *   - trimmed
 *   - lowercase
 *
 * @returns Branded `OrgId` or `null` if not found / invalid slug.
 */
export async function resolveOrgId(
  db: DbClient,
  slug: string,
): Promise<OrgId | null> {
  const s = slug.trim().toLowerCase();
  if (!s) return null;

  const rows = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, s))
    .limit(1);

  return rows[0] ? OrgIdSchema.parse(rows[0].id) : null;
}
