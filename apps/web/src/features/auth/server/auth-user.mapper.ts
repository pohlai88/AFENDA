import type { PortalType } from "@afenda/contracts";
import { PortalTypeSchema } from "@afenda/contracts";
import { z } from "zod";

import type {
  AfendaAuthenticatedUser,
  VerifyCredentialsResult,
  VerifyMfaResult,
} from "./afenda-auth.types";

/** Auth.js session user shape — validates the meta we actually use */
export const AuthJsUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  image: z.string().nullable(),

  tenantId: z.string().uuid(),
  tenantSlug: z.string().min(1),
  portal: PortalTypeSchema,
  roles: z.array(z.string()),
  permissions: z.array(z.string()),

  accessToken: z.string().nullable(),
  refreshToken: z.string().nullable(),
  requiresMfa: z.boolean(),
  mfaToken: z.string().nullable(),
});

export type AuthJsUser = z.infer<typeof AuthJsUserSchema>;

export function mapAfendaUserToAuthJsUser(user: AfendaAuthenticatedUser): AuthJsUser {
  const mapped = {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    image: user.image ?? null,

    tenantId: user.tenantId,
    tenantSlug: user.tenantSlug,
    portal: user.portal,
    roles: user.roles,
    permissions: user.permissions,

    accessToken: user.accessToken ?? null,
    refreshToken: user.refreshToken ?? null,
    requiresMfa: user.requiresMfa ?? false,
    mfaToken: user.mfaToken ?? null,
  };

  return AuthJsUserSchema.parse(mapped);
}

/**
 * Map VerifyCredentialsResult to AfendaAuthenticatedUser for session.
 * Uses principalId as tenantId placeholder; real org comes from /v1/me after session.
 * When requiresMfa is true, mfaToken is set to a placeholder; the signin action
 * generates the actual challenge token.
 */
export function mapVerifyCredentialsResultToUser(
  result: VerifyCredentialsResult,
  portal: PortalType,
): AfendaAuthenticatedUser | null {
  if (!result.ok) return null;

  const requiresMfa = !!(result.data as { requiresMfa?: boolean }).requiresMfa;

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
    requiresMfa,
    mfaToken: null,
    accessToken: null,
    refreshToken: null,
  };
}

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

/** Session grant verification result from API. */
export interface VerifySessionGrantData {
  principalId: string;
  email: string;
  portal: string;
}

/**
 * Map verify-session-grant API response to AfendaAuthenticatedUser.
 */
export function mapVerifySessionGrantToUser(
  data: VerifySessionGrantData,
): AfendaAuthenticatedUser {
  return {
    id: data.principalId,
    email: data.email,
    name: null,
    image: null,
    tenantId: data.principalId,
    tenantSlug: "demo",
    portal: data.portal as PortalType,
    roles: [],
    permissions: [],
    requiresMfa: false,
    mfaToken: null,
    accessToken: null,
    refreshToken: null,
  };
}
