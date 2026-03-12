/**
 * auth.handler() — GET and POST route handlers for the Neon Auth API proxy.
 * Ref: https://neon.com/docs/auth/reference/nextjs-server
 *
 * Catch-all at app/api/auth/[...path]/route.ts. Handles:
 * - Sign in / sign up
 * - OAuth callbacks
 * - Session management
 * - Email verification
 * - Password reset
 *
 * Reference: export const { GET, POST } = auth.handler();
 * We add a 503 fallback when auth is not configured (missing env).
 */

import { auth } from "@/lib/auth/server";

const notConfigured = () =>
  Response.json(
    { code: "NEON_AUTH_NOT_CONFIGURED", message: "Set NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET." },
    { status: 503 },
  );

export const { GET, POST } = auth?.handler() ?? { GET: notConfigured, POST: notConfigured };
