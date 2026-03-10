/**
 * Auth context — pre-auth discovery for progressive UI.
 * Returns authMode, organizations, mfaRequired without verifying password.
 * Used by POST /v1/auth/context to drive SSO/Combobox/OTP UI.
 *
 * Security: Never reveals whether an email exists (avoids enumeration).
 */

import type { DbClient } from "@afenda/db";
import { and, eq, isNull } from "drizzle-orm";
import {
  iamPrincipal,
  membership,
  organization,
  partyRole,
} from "@afenda/db";
import type { AuthContextResponse, PortalType } from "@afenda/contracts";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Get auth context for email + portal.
 * Returns authMode, organizations, mfaRequired.
 * If principal not found: returns password-only, empty orgs (no enumeration).
 */
export async function getAuthContext(
  db: DbClient,
  email: string,
  portal: PortalType,
): Promise<AuthContextResponse> {
  const normalizedEmail = normalizeEmail(email);

  const [principalRow] = await db
    .select({ id: iamPrincipal.id })
    .from(iamPrincipal)
    .where(eq(iamPrincipal.email, normalizedEmail))
    .limit(1);

  if (!principalRow?.id) {
    // Avoid email enumeration: return generic response
    return {
      authMode: "password",
      organizations: [],
      mfaRequired: false,
    };
  }

  // Resolve organizations for this principal + portal
  const orgs = await resolveOrganizationsForPortal(db, principalRow.id, portal);

  // v1: always password, no MFA. Future: check org SSO/MFA config
  return {
    authMode: "password",
    organizations: orgs,
    mfaRequired: false,
  };
}

async function resolveOrganizationsForPortal(
  db: DbClient,
  principalId: string,
  portal: PortalType,
): Promise<Array<{ id: string; name: string }>> {
  if (portal === "app") {
    // App portal: any org where principal has active membership (employee role)
    const rows = await db
      .select({
        id: organization.id,
        name: organization.name,
      })
      .from(membership)
      .innerJoin(partyRole, eq(membership.partyRoleId, partyRole.id))
      .innerJoin(organization, eq(partyRole.orgId, organization.id))
      .where(
        and(
          eq(membership.principalId, principalId),
          eq(membership.status, "active"),
          isNull(membership.revokedAt),
        ),
      );

    return rows.map((r) => ({ id: r.id, name: r.name }));
  }

  // Portal-specific: only orgs where principal has roleType matching portal
  const rows = await db
    .select({
      id: organization.id,
      name: organization.name,
    })
    .from(membership)
    .innerJoin(partyRole, eq(membership.partyRoleId, partyRole.id))
    .innerJoin(organization, eq(partyRole.orgId, organization.id))
    .where(
      and(
        eq(membership.principalId, principalId),
        eq(partyRole.roleType, portal),
        eq(membership.status, "active"),
        isNull(membership.revokedAt),
      ),
    );

  return rows.map((r) => ({ id: r.id, name: r.name }));
}
