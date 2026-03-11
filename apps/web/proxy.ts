/**
 * Next.js 16 proxy — protects /app, /portal, /api/private with NextAuth.
 * Import auth directly to avoid pulling auth-options (which pulls db) into proxy bundle.
 */
import NextAuth from "next-auth";

export const { auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/auth/signin" },
  providers: [], // Proxy only needs session check; providers live in auth.ts
});

export const proxy = auth;

export const config = {
  matcher: [
    "/app/:path*",
    "/portal/:path*",
    "/finance/:path*",
    "/governance/:path*",
    "/analytics/:path*",
    "/admin/:path*",
    "/api/private/:path*",
  ],
};
