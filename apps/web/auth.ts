import type { NextRequest } from "next/server";
import { redirect } from "next/navigation";

import {
  auth as neonAuth,
  getSession as getAfendaSession,
  isNeonAuthConfigured,
} from "./src/lib/auth/server";

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
}

type AuthedRequest = NextRequest & { auth: AuthSession | null };
type RouteHandler = (request: AuthedRequest) => Response | Promise<Response>;
type WrappedRouteHandler = (request: NextRequest) => Promise<Response>;

function resolveTransitionRedirect(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/")) return fallback;
  return value;
}

async function resolveSession(): Promise<AuthSession | null> {
  if (!isNeonAuthConfigured) return null;

  const session = await getAfendaSession();

  if (session) {
    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        tenantId: session.affiliation.orgId,
        tenantSlug: session.affiliation.orgId,
        portal: "app",
        roles: session.affiliation.roles,
        permissions: Array.from(session.affiliation.permissions),
        requiresMfa: false,
      },
    };
  }

  if (!neonAuth) {
    return null;
  }

  const rawSession = await neonAuth.getSession();
  if (rawSession.error || !rawSession.data?.user || !rawSession.data.session) {
    return null;
  }

  return {
    user: {
      id: rawSession.data.user.id,
      email: rawSession.data.user.email,
      name: rawSession.data.user.name ?? null,
      image: rawSession.data.user.image ?? null,
      tenantId: "",
      tenantSlug: "",
      portal: "app",
      roles: [],
      permissions: [],
      requiresMfa: false,
    },
  };
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
  const fallback = process.env.NODE_ENV === "production" ? "/auth/signin" : "/app";
  const destination = resolveTransitionRedirect(
    options?.callbackUrl ?? options?.redirectTo,
    fallback,
  );

  if (!isNeonAuthConfigured || !neonAuth) {
    redirect(destination);
  }

  // Use absolute callback URL so Neon Auth redirects back to this app (required for
  // cookie to be set on our origin and for trusted-origin validation).
  const absoluteCallbackURL = `${getBaseUrl()}${destination.startsWith("/") ? destination : `/${destination}`}`;

  if (_provider === "google" || _provider === "github") {
    const result = await neonAuth.signIn.social({
      provider: _provider,
      callbackURL: absoluteCallbackURL,
      disableRedirect: true,
    });

    if (result.error) {
      throw new Error(result.error.message ?? "Unable to sign in with social provider.");
    }

    redirect(result.data?.url ?? destination);
  }

  if (_provider === undefined || _provider === "credentials") {
    const email = typeof options?.email === "string" ? options.email : "";
    const password = typeof options?.password === "string" ? options.password : "";

    const result = await neonAuth.signIn.email({
      email,
      password,
      callbackURL: absoluteCallbackURL,
    });

    if (result.error) {
      const error = new Error(result.error.message ?? "Invalid email or password.");
      (error as Error & { code?: string; type?: string }).code = "CredentialsSignin";
      (error as Error & { code?: string; type?: string }).type = "CredentialsSignin";
      throw error;
    }

    redirect(destination);
  }

  redirect(destination);
}

export async function signOut(options?: Record<string, unknown>): Promise<never> {
  const destination = resolveTransitionRedirect(
    options?.redirectTo,
    "/auth/signin?signedOut=success",
  );

  if (isNeonAuthConfigured && neonAuth) {
    await neonAuth.signOut();
  }

  redirect(destination);
}
