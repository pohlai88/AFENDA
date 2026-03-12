import type { PortalType } from "@afenda/contracts";

import type { AfendaAuthenticatedUser, VerifyMfaResult } from "./afenda-auth.types";

/**
 * Map VerifyMfaResult to AfendaAuthenticatedUser for session.
 */
export function mapVerifyMfaResultToUser(
  result: VerifyMfaResult,
  portal: PortalType,
): AfendaAuthenticatedUser | null {
  if (!result.ok) return null;

  return {
    id: result.data.principalId,
    email: result.data.email,
    name: null,
    image: null,
    tenantId: result.data.principalId,
    tenantSlug: "demo",
    portal,
    roles: [],
    permissions: [],
    requiresMfa: false,
    mfaToken: null,
    accessToken: null,
    refreshToken: null,
  };
}
