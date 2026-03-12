/**
 * Next.js middleware — delegates to proxy (session guard + redirects).
 *
 * Official SDK uses auth.middleware({ loginUrl: '/auth/sign-in' }); we use a
 * custom proxy because lib/auth/server is Node-only (DB). See docs/neon-auth-nextjs-server-reference.md.
 *
 * config.matcher must be defined statically inline (Next.js static analysis).
 *
 * Protected route groups:
 *   /app/*         — Internal ERP app shell
 *   /portal/*      — Supplier/customer/partner portals
 *   /finance/*     — AP/AR/GL routes (route group: (erp))
 *   /governance/*  — Audit, evidence, policy routes
 *   /analytics/*   — Dashboards and reporting
 *   /admin/*       — Admin console
 *   /api/private/* — Authenticated API routes
 */
export { proxy as middleware } from "./proxy";

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
