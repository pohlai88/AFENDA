import { PortalTypeSchema } from "@afenda/contracts";

import "./auth-session";
import { getAfendaAuthService } from "./afenda-auth.service";
import {
  mapAfendaUserToAuthJsUser,
  mapVerifyCredentialsResultToUser,
  mapVerifySessionGrantToUser,
} from "./auth-user.mapper";
import { isUserSessionRevoked } from "./ops/session-revocation.service";
import { publishAuthAuditEvent } from "./audit/audit.helpers";

function resolveServerApiBase(): string {
  const explicitServerBase = process.env.AFENDA_API_URL ?? process.env.API_BASE_URL;
  if (explicitServerBase) return explicitServerBase;

  const publicBase = process.env.NEXT_PUBLIC_API_URL;
  if (process.env.NODE_ENV === "production") {
    return publicBase ?? "http://localhost:3001";
  }

  if (publicBase && /localhost|127\.0\.0\.1/i.test(publicBase)) {
    return publicBase;
  }

  return "http://localhost:3001";
}

export const authConfig = {
  trustHost: true,

  session: {
    strategy: "jwt" as const,
  },

  pages: {
    signIn: "/auth/signin",
  },

  callbacks: {
    async jwt({
      token,
      user,
      trigger,
      session,
    }: {
      token: import("next-auth/jwt").JWT;
      user?: import("next-auth").User;
      trigger?: "signIn" | "update" | "signUp";
      session?: import("next-auth").Session;
    }) {
      const userId = token.sub ?? user?.id;
      if (userId) {
        try {
          const revoked = await isUserSessionRevoked(userId);
          if (revoked) {
            try {
              await publishAuthAuditEvent("auth.session.jwt_revoked", {
                userId,
                metadata: { reason: "session_revoked" },
              });
            } catch {
              // best-effort — never let audit write block session logic
            }
            return {} as import("next-auth/jwt").JWT;
          }
        } catch {
          // In production, fail closed if revocation status cannot be checked.
          if (process.env.NODE_ENV === "production") {
            return {} as import("next-auth/jwt").JWT;
          }
        }
      }

      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image ?? undefined;

        token.tenantId = user.tenantId;
        token.tenantSlug = user.tenantSlug;
        token.portal = user.portal;
        token.roles = user.roles;
        token.permissions = user.permissions;

        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.requiresMfa = user.requiresMfa;
        token.mfaToken = user.mfaToken;
      }

      if (trigger === "update" && session) {
        const updateSession = session as { portal?: string };
        if (updateSession.portal) token.portal = updateSession.portal;
      }

      return token;
    },

    async session({
      session,
      token,
    }: {
      session: import("next-auth").Session;
      token: import("next-auth/jwt").JWT;
    }) {
      if (session.user) {
        session.user.id = String(token.sub ?? "");
        session.user.email = String(token.email ?? "");
        session.user.name = (token.name as string | null | undefined) ?? null;
        session.user.image = (token.picture as string | null | undefined) ?? null;

        session.user.tenantId = String(token.tenantId ?? "");
        session.user.tenantSlug = String(token.tenantSlug ?? "");
        session.user.portal = String(token.portal ?? "app");
        session.user.roles = Array.isArray(token.roles)
          ? token.roles.map(String)
          : [];
        session.user.permissions = Array.isArray(token.permissions)
          ? token.permissions.map(String)
          : [];
      }

      session.accessToken =
        (token.accessToken as string | null | undefined) ?? null;
      session.requiresMfa = Boolean(token.requiresMfa);
      session.mfaToken = (token.mfaToken as string | null | undefined) ?? null;

      return session;
    },

    async authorized({
      auth,
      request: _request,
    }: {
      auth: import("next-auth").Session | null;
      request: Request;
    }) {
      return !!auth;
    },
  },

  async authorizeCredentials(
    rawCredentials: Record<string, unknown> | undefined,
  ) {
    const email = String(rawCredentials?.email ?? "").trim().toLowerCase();
    const password = String(rawCredentials?.password ?? "");
    const portalRaw = String(rawCredentials?.portal ?? "app");
    const portalResult = PortalTypeSchema.safeParse(portalRaw);
    const portal = portalResult.success ? portalResult.data : "app";

    const authService = getAfendaAuthService();

    const result = await authService.verifyCredentials({
      email,
      password,
      portal,
    });

    const user = mapVerifyCredentialsResultToUser(result, portal);
    if (!user) return null;

    return mapAfendaUserToAuthJsUser(user);
  },

  async authorizeSessionGrant(rawCredentials: Record<string, unknown> | undefined) {
    const grant = String(rawCredentials?.grant ?? "").trim();

    if (!grant || grant.length < 32 || grant.length > 2048) return null;
    if (!/^[A-Za-z0-9._-]+$/.test(grant)) return null;

    const API_BASE = resolveServerApiBase();

    const res = await fetch(`${API_BASE}/v1/auth/verify-session-grant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grant }),
      cache: "no-store",
    });

    const json = (await res.json()) as
      | { ok: true; data: { principalId: string; email: string; portal: string }; correlationId?: string }
      | { ok: false; code: string; message: string; correlationId?: string };

    if (!json.ok) return null;

    const user = mapVerifySessionGrantToUser(json.data);
    return mapAfendaUserToAuthJsUser(user);
  },
};
