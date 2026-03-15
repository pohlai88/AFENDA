import type { NextRequest } from "next/server";
import { redirect } from "next/navigation";

import { resolveSafeRedirectPath } from "./src/lib/auth/redirects";
import { getNeonServerAuth, getNeonSession, listNeonOrganizations } from "./src/lib/auth/server";

type AuthPortal = "app" | "supplier" | "customer" | "contractor" | "franchisee" | "investor";

export interface AuthSessionUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  tenantId: string;
  tenantSlug: string;
  portal: AuthPortal;
  roles: string[];
  permissions: string[];
  requiresMfa?: boolean;
}

export interface AuthSession {
  user: AuthSessionUser;
  activeOrganization: {
    id: string;
    name: string | null;
    slug: string | null;
    permissions: string[];
  } | null;
}

type AuthedRequest = NextRequest & { auth: AuthSession | null };
type RouteHandler = (request: AuthedRequest) => Response | Promise<Response>;
type WrappedRouteHandler = (request: NextRequest) => Promise<Response>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function toAuthPortal(value: unknown): AuthPortal {
  switch (value) {
    case "supplier":
    case "customer":
    case "contractor":
    case "franchisee":
    case "investor":
      return value;
    default:
      return "app";
  }
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function normalizeActiveOrganization(value: unknown): {
  id: string;
  name: string | null;
  slug: string | null;
  permissions: string[];
} | null {
  if (!isRecord(value) || typeof value.id !== "string" || !value.id.trim()) {
    return null;
  }

  return {
    id: value.id,
    name: toStringOrNull(value.name),
    slug: toStringOrNull(value.slug),
    permissions: toStringArray(value.permissions),
  };
}

function toAuthSession(neonSession: unknown): AuthSession | null {
  if (!isRecord(neonSession) || !isRecord(neonSession.user)) {
    return null;
  }

  const user = neonSession.user;
  const session = isRecord(neonSession.session) ? neonSession.session : null;
  if (typeof user.id !== "string" || typeof user.email !== "string") {
    return null;
  }

  const activeOrganization =
    normalizeActiveOrganization(neonSession.activeOrganization) ??
    normalizeActiveOrganization(user.activeOrganization) ??
    (typeof session?.activeOrganizationId === "string" && session.activeOrganizationId.trim()
      ? {
          id: session.activeOrganizationId,
          name: null,
          slug: null,
          permissions: [],
        }
      : null);

  const normalizedUserPermissions = toStringArray(user.permissions);
  const effectivePermissions =
    normalizedUserPermissions.length > 0
      ? normalizedUserPermissions
      : (activeOrganization?.permissions ?? []);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: typeof user.name === "string" ? user.name : null,
      image: typeof user.image === "string" ? user.image : null,
      tenantId:
        typeof user.tenantId === "string" && user.tenantId.trim()
          ? user.tenantId
          : (activeOrganization?.id ?? ""),
      tenantSlug:
        typeof user.tenantSlug === "string" && user.tenantSlug.trim()
          ? user.tenantSlug
          : (activeOrganization?.slug ?? ""),
      portal: toAuthPortal(user.portal),
      roles: toStringArray(user.roles),
      permissions: effectivePermissions,
      requiresMfa: typeof user.requiresMfa === "boolean" ? user.requiresMfa : undefined,
    },
    activeOrganization,
  };
}

async function resolveSession(): Promise<AuthSession | null> {
  const neonSession = await getNeonSession();
  const session = toAuthSession(neonSession);
  if (!session?.user) {
    return null;
  }

  if (session.activeOrganization?.id) {
    return session;
  }

  const organizationsResponse = await listNeonOrganizations();
  if (organizationsResponse.error || organizationsResponse.data.length === 0) {
    return session;
  }

  if (organizationsResponse.data.length === 1) {
    const organization = organizationsResponse.data[0];
    if (!organization) {
      return session;
    }

    return {
      ...session,
      user: {
        ...session.user,
        tenantId: session.user.tenantId || organization.id,
        tenantSlug: session.user.tenantSlug || organization.slug || "",
        permissions:
          session.user.permissions.length > 0
            ? session.user.permissions
            : (organization.permissions ?? []),
      },
      activeOrganization: {
        id: organization.id,
        name: organization.name ?? null,
        slug: organization.slug ?? null,
        permissions: organization.permissions ?? [],
      },
    };
  }

  return session;
}

export function auth(): Promise<AuthSession | null>;
export function auth(handler: RouteHandler): WrappedRouteHandler;
export function auth(handler?: RouteHandler): Promise<AuthSession | null> | WrappedRouteHandler {
  if (handler) {
    return async function wrapped(request: NextRequest): Promise<Response> {
      const session = await resolveSession();
      const authedRequest = request as AuthedRequest;
      authedRequest.auth = session;
      return handler(authedRequest);
    };
  }

  return resolveSession();
}

/** App origin (no trailing slash). Use for absolute callback URLs so Neon Auth redirects and cookies work. */
export function getBaseUrl(): string {
  const base =
    process.env.BASE_URL ??
    process.env.AUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    "http://localhost:3000";
  return base.replace(/\/$/, "");
}

export async function signIn(
  _provider?: string,
  options?: Record<string, unknown>,
): Promise<never> {
  const fallback = "/app";
  const destination = resolveSafeRedirectPath(
    options?.callbackUrl ?? options?.redirectTo,
    fallback,
  );

  redirect(destination);
}

export async function signOut(options?: Record<string, unknown>): Promise<never> {
  const neonServerAuth = getNeonServerAuth();
  if (neonServerAuth) {
    await neonServerAuth.signOut();
  }

  const destination = resolveSafeRedirectPath(options?.redirectTo, "/");

  redirect(destination);
}
