/**
 * Next.js 16 proxy — protects /app, /portal, /api/private with NextAuth.
 * Import auth directly to avoid pulling auth-options (which pulls db) into proxy bundle.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import NextAuth from "next-auth";

export const { auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/auth/signin" },
  providers: [], // Proxy only needs session check; providers live in auth.ts
});

export function proxy(req: NextRequest) {
  if (req.nextUrl.pathname === "/afenda") {
    return NextResponse.redirect(new URL("/AFENDA", req.url));
  }

  return auth(req);
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
