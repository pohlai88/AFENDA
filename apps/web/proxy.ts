/**
 * Next.js 16 proxy — canonical path redirects + lightweight session guard.
 *
 * Auth enforcement: checks for the Neon Auth / Better Auth session cookie on protected routes.
 * This is a first-line guard only; full session verification happens at page level.
 *
 * Cookie names: Better Auth default prefix is "better-auth"; Neon Auth may use "neonauth".
 * With useSecureCookies / HTTPS, the cookie gets __Secure- prefix. Check all variants so
 * OAuth and email sign-in both pass middleware.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isTenantRoutingV2Enabled } from "./src/lib/feature-flags";

const SESSION_COOKIE_NAMES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
  "neonauth.session_token",
  "__Secure-neonauth.session_token",
  "neon-auth.session",
  "__Secure-neon-auth.session",
];

function hasSessionCookie(req: NextRequest): boolean {
  return SESSION_COOKIE_NAMES.some((name) => req.cookies.has(name));
}

function hasActiveOrgCookie(req: NextRequest): boolean {
  return req.cookies.has("active_org");
}

const PROTECTED_PREFIXES = [
  "/app",
  "/portal",
  "/finance",
  "/governance",
  "/analytics",
  "/admin",
  "/api/private",
];

const ACTIVE_ORG_REQUIRED_PREFIXES = [
  "/app",
  "/finance",
  "/governance",
  "/analytics",
  "/admin",
];

export function proxy(req: NextRequest) {
  const tenantRoutingV2Enabled = isTenantRoutingV2Enabled();

  if (req.nextUrl.pathname === "/afenda") {
    return NextResponse.redirect(new URL("/AFENDA", req.url));
  }

  const isProtected = PROTECTED_PREFIXES.some((prefix) => req.nextUrl.pathname.startsWith(prefix));

  if (isProtected && !hasSessionCookie(req)) {
    const signinUrl = new URL("/auth/signin", req.url);
    signinUrl.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(signinUrl);
  }

  const requiresActiveOrg = ACTIVE_ORG_REQUIRED_PREFIXES.some((prefix) =>
    req.nextUrl.pathname.startsWith(prefix),
  );

  if (
    tenantRoutingV2Enabled &&
    isProtected &&
    requiresActiveOrg &&
    hasSessionCookie(req) &&
    !hasActiveOrgCookie(req)
  ) {
    const selectOrgUrl = new URL("/auth/select-organization", req.url);
    selectOrgUrl.searchParams.set("callback", `${req.nextUrl.pathname}${req.nextUrl.search}`);
    return NextResponse.redirect(selectOrgUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/afenda",
    "/app/:path*",
    "/portal/:path*",
    "/finance/:path*",
    "/governance/:path*",
    "/analytics/:path*",
    "/admin/:path*",
    "/api/private/:path*",
  ],
};
