import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

type SessionPortal = "app" | "supplier" | "customer";

function isBypassPath(pathname: string): boolean {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/sw/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/twitter-image" ||
    pathname.startsWith("/twitter-image")
  );
}

function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/auth" ||
    pathname.startsWith("/auth/") ||
    pathname === "/marketing" ||
    pathname.startsWith("/marketing/")
  );
}

function isPortalPath(pathname: string): boolean {
  return pathname === "/portal" || pathname.startsWith("/portal/");
}

function isSupplierPortalPath(pathname: string): boolean {
  return pathname === "/portal/supplier" || pathname.startsWith("/portal/supplier/");
}

function isCustomerPortalPath(pathname: string): boolean {
  return pathname === "/portal/customer" || pathname.startsWith("/portal/customer/");
}

function redirectTo(request: NextRequest, pathname: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url);
}

function redirectToPortalSignIn(request: NextRequest, portal: "supplier" | "customer"): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = `/auth/portal/${portal}/signin`;
  url.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}

function resolvePortal(token: unknown): SessionPortal | null {
  if (!token || typeof token !== "object") return null;
  const portal = (token as { portal?: unknown }).portal;
  if (portal === "app" || portal === "supplier" || portal === "customer") {
    return portal;
  }
  return null;
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (isBypassPath(pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const portal = resolvePortal(token);

  if (isSupplierPortalPath(pathname)) {
    if (!portal) {
      return redirectToPortalSignIn(request, "supplier");
    }
    if (portal !== "supplier") {
      return redirectTo(request, portal === "customer" ? "/portal/customer" : "/");
    }
    return NextResponse.next();
  }

  if (isCustomerPortalPath(pathname)) {
    if (!portal) {
      return redirectToPortalSignIn(request, "customer");
    }
    if (portal !== "customer") {
      return redirectTo(request, portal === "supplier" ? "/portal/supplier" : "/");
    }
    return NextResponse.next();
  }

  // Preserve local development flow for non-portal routes.
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.next();
  }

  if (!token && !isPublicPath(pathname)) {
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = "/auth/signin";
    signInUrl.search = "";
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Portal users are restricted to their own portal paths and public auth pages.
  if (portal && portal !== "app") {
    if (pathname === "/portal") {
      return redirectTo(request, portal === "supplier" ? "/portal/supplier" : "/portal/customer");
    }

    if (!isPortalPath(pathname) && !isPublicPath(pathname)) {
      return redirectTo(request, portal === "supplier" ? "/portal/supplier" : "/portal/customer");
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt).*)"],
};

export default proxy;
