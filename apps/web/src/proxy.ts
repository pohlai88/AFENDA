import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

type SessionPortal = "app" | "supplier" | "customer" | "cid" | "investor" | "franchisee" | "contractor";

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

function isCidPortalPath(pathname: string): boolean {
  return pathname === "/portal/cid" || pathname.startsWith("/portal/cid/");
}

function isInvestorPortalPath(pathname: string): boolean {
  return pathname === "/portal/investor" || pathname.startsWith("/portal/investor/");
}

function isFranchiseePortalPath(pathname: string): boolean {
  return pathname === "/portal/franchisee" || pathname.startsWith("/portal/franchisee/");
}

function isContractorPortalPath(pathname: string): boolean {
  return pathname === "/portal/contractor" || pathname.startsWith("/portal/contractor/");
}

function redirectTo(request: NextRequest, pathname: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url);
}

function getPortalHomePath(portal: SessionPortal): string {
  switch (portal) {
    case "supplier": return "/portal/supplier";
    case "customer": return "/portal/customer";
    case "cid": return "/portal/cid";
    case "investor": return "/portal/investor";
    case "franchisee": return "/portal/franchisee";
    case "contractor": return "/portal/contractor";
    case "app": return "/";
    default: return "/";
  }
}

function redirectToPortalSignIn(request: NextRequest, portal: "supplier" | "customer" | "cid" | "investor" | "franchisee" | "contractor"): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = `/auth/portal/${portal}/signin`;
  url.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}

function resolvePortal(token: unknown): SessionPortal | null {
  if (!token || typeof token !== "object") return null;
  const portal = (token as { portal?: unknown }).portal;
  if (
    portal === "app" || 
    portal === "supplier" || 
    portal === "customer" || 
    portal === "cid" || 
    portal === "investor" || 
    portal === "franchisee" || 
    portal === "contractor"
  ) {
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
      return redirectTo(request, getPortalHomePath(portal));
    }
    return NextResponse.next();
  }

  if (isCustomerPortalPath(pathname)) {
    if (!portal) {
      return redirectToPortalSignIn(request, "customer");
    }
    if (portal !== "customer") {
      return redirectTo(request, getPortalHomePath(portal));
    }
    return NextResponse.next();
  }

  if (isCidPortalPath(pathname)) {
    if (!portal) {
      return redirectToPortalSignIn(request, "cid");
    }
    if (portal !== "cid") {
      return redirectTo(request, getPortalHomePath(portal));
    }
    return NextResponse.next();
  }

  if (isInvestorPortalPath(pathname)) {
    if (!portal) {
      return redirectToPortalSignIn(request, "investor");
    }
    if (portal !== "investor") {
      return redirectTo(request, getPortalHomePath(portal));
    }
    return NextResponse.next();
  }

  if (isFranchiseePortalPath(pathname)) {
    if (!portal) {
      return redirectToPortalSignIn(request, "franchisee");
    }
    if (portal !== "franchisee") {
      return redirectTo(request, getPortalHomePath(portal));
    }
    return NextResponse.next();
  }

  if (isContractorPortalPath(pathname)) {
    if (!portal) {
      return redirectToPortalSignIn(request, "contractor");
    }
    if (portal !== "contractor") {
      return redirectTo(request, getPortalHomePath(portal));
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
      return redirectTo(request, getPortalHomePath(portal));
    }

    if (!isPortalPath(pathname) && !isPublicPath(pathname)) {
      return redirectTo(request, getPortalHomePath(portal));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt).*)"],
};

export default proxy;
