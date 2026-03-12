/**
 * Neon Auth Server SDK for Next.js App Router
 *
 * Official pattern from https://neon.com/docs/auth/quick-start/nextjs
 *
 * This is the source of truth for:
 * - Route handler at /api/auth/[...path]/route.ts
 * - Server-side session verification
 * - Cookie-based session management
 *
 * Architecture:
 * - Neon Auth provides identity (user, session, OAuth account)
 * - AFENDA auth/* modules provide governance (audit, compliance, incident, MFA, etc.)
 * - `toAfendaSession()` bridges Neon Auth identity → AFENDA context (org, principal, roles)
 */

import { createNeonAuth } from "@neondatabase/auth/next/server";
import type { User } from "better-auth";
import {
  iamPermission,
  iamPrincipal,
  iamPrincipalRole,
  iamRole,
  iamRolePermission,
  membership,
  partyRole,
} from "@afenda/db";
import { and, eq, isNull } from "drizzle-orm";

import { getDbForAuth } from "@/features/auth/server/auth-db";

// Best practice: normalize baseUrl (trim + no trailing slash) for redirects and trusted-origin checks.
const neonAuthBaseUrlRaw = process.env.NEON_AUTH_BASE_URL?.trim() ?? "";
const neonAuthBaseUrl = neonAuthBaseUrlRaw.replace(/\/+$/, "");

const neonAuthCookieSecret = process.env.NEON_AUTH_COOKIE_SECRET?.trim() ?? "";

/** Optional: session cookie TTL in seconds (default 300). Clamped to 60–86400 when set. */
const neonAuthSessionTtlRaw = process.env.NEON_AUTH_SESSION_TTL?.trim();
const SESSION_TTL_MIN = 60;
const SESSION_TTL_MAX = 86400; // 24h
const neonAuthSessionTtl =
  neonAuthSessionTtlRaw !== undefined && neonAuthSessionTtlRaw !== ""
    ? Math.min(
        SESSION_TTL_MAX,
        Math.max(SESSION_TTL_MIN, Number(neonAuthSessionTtlRaw) || 300),
      )
    : undefined;

/** Optional: cookie domain (e.g. ".example.com") for cross-subdomain sessions. Trimmed. */
const neonAuthCookieDomain = process.env.NEON_AUTH_COOKIE_DOMAIN?.trim();

export const isNeonAuthConfigured = Boolean(
  neonAuthBaseUrl && neonAuthCookieSecret && neonAuthCookieSecret.length >= 32,
);

// ─────────────────────────────────────────────────────────────────────────────
// Neon Auth Instance (createNeonAuth) — best practice configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Unified auth instance — handler(), middleware(), getSession(), signIn, signUp, signOut, etc.
 *
 * createNeonAuth(config) ref: https://neon.com/docs/auth/reference/nextjs-server
 *
 * Best practice:
 * - baseUrl: trimmed, trailing slashes removed.
 * - cookies.secret: 32+ characters (HMAC-SHA256); instance not created if shorter.
 * - cookies.sessionDataTtl: optional; when set via NEON_AUTH_SESSION_TTL, clamped to 60–86400 seconds.
 * - cookies.domain: optional; trimmed; use for cross-subdomain sessions (e.g. ".example.com").
 */
export const auth = isNeonAuthConfigured
  ? createNeonAuth({
      baseUrl: neonAuthBaseUrl,
      cookies: {
        secret: neonAuthCookieSecret,
        ...(neonAuthSessionTtl !== undefined ? { sessionDataTtl: neonAuthSessionTtl } : {}),
        ...(neonAuthCookieDomain ? { domain: neonAuthCookieDomain } : {}),
      },
    })
  : null;

/**
 * Route handler is at app/api/auth/[...path]/route.ts (exports auth.handler() GET/POST).
 * authHandlers kept for backwards compatibility if needed.
 */
const notConfigured = async () =>
  Response.json(
    {
      code: "NEON_AUTH_NOT_CONFIGURED",
      message:
        "Neon Auth environment variables are missing. Set NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET.",
    },
    { status: 503 },
  );

export const authHandlers = auth?.handler() ?? {
  GET: notConfigured,
  POST: notConfigured,
  PUT: notConfigured,
  DELETE: notConfigured,
  PATCH: notConfigured,
};

// ─────────────────────────────────────────────────────────────────────────────
// Session Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Neon Auth session shape (from Better Auth).
 * Raw identity data from neon_auth schema.
 */
export interface NeonAuthSession {
  user: User;
  session: {
    createdAt: Date;
    expiresAt: Date;
    id: string;
    token: string;
    userId: string;
    updatedAt?: Date;
    ipAddress?: string | null;
    userAgent?: string | null;
    activeOrganizationId?: string | null;
  };
}

/**
 * AFENDA session shape — extends Neon Auth identity with AFENDA org/role context.
 *
 * This is what server components and API routes receive after calling
 * `getSession()` or `requireSession()`.
 */
export interface AfendaSession {
  // From Neon Auth (neon_auth.user table)
  user: {
    id: string;           // UUID from neon_auth.user.id
    email: string;        // From neon_auth.user.email
    name: string | null;  // User's display name
    image: string | null; // Avatar URL
  };

  // From AFENDA auth domain (linked at signup via SQL trigger)
  affiliation: {
    orgId: string;        // Org context for this user
    principalId: string;  // AFENDA principal/party identity
    roles: string[];      // Role IDs assigned to this principal
    permissions: Set<string>; // Expanded from roles
  };

  // Session metadata
  expiresAt: Date;
  createdAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bridge to AFENDA Context
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert Neon Auth session to AFENDA session.
 *
 * This function:
 * 1. Takes Neon Auth identity (email, user ID)
 * 2. Looks up AFENDA org context (party_membership, principal)
 * 3. Returns enriched session with org/role/permission context
 *
 * Prerequisites:
 * - Neon Auth user.id must be linked to AFENDA party/principal
 *   (automatically created via SQL trigger on neon_auth.user INSERT)
 * - User's org membership must exist in party_membership table
 * - RLS policies must be active on all auth-* tables
 *
 * Stub Implementation:
 * This is a placeholder that uses demo values. In Phase 5, this will:
 * - Query party_membership to resolve orgId
 * - Query principal to resolve roles and permissions
 * - Apply org-level RLS context
 */
export async function toAfendaSession(
  neonSession: NeonAuthSession,
): Promise<AfendaSession | null> {
  if (!neonSession?.user) return null;

  const userEmail = neonSession.user.email?.trim().toLowerCase();
  if (!userEmail) return null;

  const db = getDbForAuth();

  const principalRows = await db
    .select({ id: iamPrincipal.id })
    .from(iamPrincipal)
    .where(eq(iamPrincipal.email, userEmail))
    .limit(1);

  const principal = principalRows[0];
  if (!principal) return null;

  const membershipRows = await db
    .select({
      orgId: partyRole.orgId,
      roleType: partyRole.roleType,
    })
    .from(membership)
    .innerJoin(partyRole, eq(membership.partyRoleId, partyRole.id))
    .where(
      and(
        eq(membership.principalId, principal.id),
        eq(membership.status, "active"),
        isNull(membership.revokedAt),
      ),
    )
    .limit(1);

  const activeMembership = membershipRows[0];
  if (!activeMembership) return null;

  const roleRows = await db
    .select({ key: iamRole.key })
    .from(iamPrincipalRole)
    .innerJoin(iamRole, eq(iamPrincipalRole.roleId, iamRole.id))
    .where(
      and(
        eq(iamPrincipalRole.principalId, principal.id),
        eq(iamPrincipalRole.orgId, activeMembership.orgId),
      ),
    );

  const roles = roleRows.map((row) => row.key);

  const permissionRows = await db
    .select({ key: iamPermission.key })
    .from(iamPrincipalRole)
    .innerJoin(iamRolePermission, eq(iamPrincipalRole.roleId, iamRolePermission.roleId))
    .innerJoin(iamPermission, eq(iamRolePermission.permissionId, iamPermission.id))
    .where(
      and(
        eq(iamPrincipalRole.principalId, principal.id),
        eq(iamPrincipalRole.orgId, activeMembership.orgId),
      ),
    );

  const permissions = new Set(permissionRows.map((row) => row.key));

  return {
    user: {
      id: neonSession.user.id,
      email: neonSession.user.email,
      name: neonSession.user.name ?? null,
      image: neonSession.user.image ?? null,
    },
    affiliation: {
      orgId: activeMembership.orgId,
      principalId: principal.id,
      roles,
      permissions,
    },
    expiresAt: new Date(neonSession.session.expiresAt),
    createdAt: new Date(neonSession.session.createdAt ?? Date.now()),
  };
}

/**
 * Get current user session from cookies/headers.
 *
 * Wrapper around Neon Auth + AFENDA bridge.
 * Safe for server components and server actions.
 *
 * Usage:
 *   const session = await getSession();
 *   if (!session) return <SignInPrompt />;
 *   return <Dashboard user={session.user} orgId={session.affiliation.orgId} />;
 */
export async function getSession(): Promise<AfendaSession | null> {
  if (!auth) {
    return null;
  }

  const result = await auth.getSession();

  if (result.error || !result.data?.user || !result.data.session) {
    return null;
  }

  return toAfendaSession({
    user: result.data.user,
    session: result.data.session,
  });
}

/**
 * Require an active session or throw.
 *
 * Use in protected server functions or middleware.
 *
 * Usage:
 *   const session = await requireSession();
 *   // session is guaranteed to exist; TypeScript knows this
 *   console.log(session.user.email);
 *
 * Throws: Error("Unauthorized: no session")
 */
export async function requireSession(): Promise<AfendaSession> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized: no session");
  }
  return session;
}

// ─────────────────────────────────────────────────────────────────────────────
// Middleware Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if request is authenticated.
 * Returns true if valid session cookie is present.
 *
 * Usage in middleware:
 *   const isAuth = await isAuthenticated();
 *   if (!isAuth) return NextResponse.redirect('/signin');
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session?.user;
}
