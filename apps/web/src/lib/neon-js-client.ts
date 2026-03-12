/**
 * Neon Auth & Data API TypeScript SDK — client configuration
 *
 * Reference: https://neon.com/docs/reference/javascript-sdk
 *
 * This module configures:
 * - Auth-only client: createAuthClient(authUrl) for signIn, signUp, getSession, etc.
 * - Full client (optional): createClient({ auth: { url }, dataApi: { url } }) when Data API URL is set.
 *
 * Environment variables (client-side; must be NEXT_PUBLIC_* for Next.js):
 * - NEXT_PUBLIC_NEON_AUTH_URL — Neon Auth server URL (required for auth)
 * - NEXT_PUBLIC_NEON_DATA_API_URL — Neon Data API URL (optional; for client.from().select() etc.)
 */

import { createClient } from "@neondatabase/neon-js";
import { createAuthClient } from "@neondatabase/neon-js/auth";

const authUrl = (typeof process !== "undefined" && process.env.NEXT_PUBLIC_NEON_AUTH_URL?.trim()) ?? "";
const dataApiUrl = (typeof process !== "undefined" && process.env.NEXT_PUBLIC_NEON_DATA_API_URL?.trim()) ?? "";

/** Auth-only client (Better Auth API). Use when you only need signIn, signUp, getSession, etc. */
export const neonAuthClient = authUrl ? createAuthClient(authUrl) : null;

/**
 * Full Neon client (auth + Data API). Available only when both NEXT_PUBLIC_NEON_AUTH_URL and
 * NEXT_PUBLIC_NEON_DATA_API_URL are set. Use for client.from('table').select() with automatic auth token.
 */
export const neonClient =
  authUrl && dataApiUrl
    ? createClient({
        auth: { url: authUrl },
        dataApi: { url: dataApiUrl },
      })
    : null;

/** Whether the Neon JS SDK auth client is configured (NEXT_PUBLIC_NEON_AUTH_URL set). */
export const isNeonJsAuthConfigured = Boolean(authUrl);

/** Whether the full Neon client (auth + Data API) is configured. */
export const isNeonJsFullClientConfigured = Boolean(neonClient);
