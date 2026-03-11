/**
 * Next.js middleware entry point — delegates to the lightweight proxy auth.
 *
 * Uses the minimal NextAuth instance from proxy.ts (no providers, session-check only)
 * to avoid pulling DB/provider code into the Edge runtime bundle.
 *
 * config.matcher must be defined statically inline — Next.js cannot re-export it
 * from another module (it is statically analysed at build time).
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
