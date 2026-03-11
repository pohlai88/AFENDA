/**
 * Fastify plugin: Authentication.
 *
 * Runs in `onRequest` (before rate-limit evaluation) so the rate limiter
 * can key by resolved principalId instead of raw IP.
 *
 * Supports two modes:
 *
 *   1. **Dev mode** (`NODE_ENV !== "production"`):
 *      Send `X-Dev-User-Email` header — resolves the principal from the DB by
 *      email and builds a full RequestContext. No token required.
 *
 *   2. **Production mode**:
 *      `Authorization: Bearer <NextAuth JWE>` — decrypts the token using
 *      HKDF(NEXTAUTH_SECRET) and resolves the principal from the DB.
 *
 * ADR-0003 COMPLETE:
 *   - Uses `resolvePrincipalContext` (party/principal/membership model)
 *   - Sets `orgId` on request for downstream consumers
 *
 * Routes that require authentication check `req.ctx` and return 401 when absent.
 */

import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { jwtDecrypt } from "jose";
import { resolvePrincipalContext } from "@afenda/core";

const DEV_HEADER = "x-dev-user-email";

// ── NextAuth JWE decryption ───────────────────────────────────────────────────
// NextAuth v4 encrypts JWTs with AES-256-GCM, using a key derived from
// NEXTAUTH_SECRET via HKDF-SHA256 with info="NextAuth.js Generated Encryption Key".

async function deriveNextAuthKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(secret), "HKDF", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(),
      info: enc.encode("NextAuth.js Generated Encryption Key"),
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
}

async function decryptNextAuthToken(
  token: string,
  secret: string,
): Promise<{ email?: string; requiresMfa?: boolean } | null> {
  try {
    const key = await deriveNextAuthKey(secret);
    const { payload } = await jwtDecrypt(token, key);
    return payload as { email?: string; requiresMfa?: boolean };
  } catch {
    return null; // expired, tampered, or wrong secret
  }
}

// ── Plugin ────────────────────────────────────────────────────────────────────

export const authPlugin = fp(async function authPlugin(app: FastifyInstance) {
  app.decorateRequest("ctx", undefined);

  // onRequest fires after correlationId + orgSlug hooks (which are registered
  // before this plugin in index.ts). So req.correlationId and req.orgSlug are
  // already populated when this hook runs.
  app.addHook("onRequest", async (req) => {
    // Skip infra endpoints — no user context needed
    if (req.url === "/healthz" || req.url === "/readyz") return;

    const nodeEnv = process.env["NODE_ENV"];
    const isDev = nodeEnv === "development" || nodeEnv === "test";
    const slug = req.orgSlug ?? "demo";

    // ── Dev-mode shortcut ──────────────────────────────────────────────────
    if (isDev && req.headers[DEV_HEADER]) {
      const email = req.headers[DEV_HEADER] as string;

      app.log.warn(
        { correlationId: req.correlationId, orgSlug: slug, email },
        "Dev auth bypass used via x-dev-user-email",
      );

      const ctx = await resolvePrincipalContext(app.db, email, slug, req.correlationId);
      if (ctx) {
        req.ctx = ctx;
        if (ctx.activeContext?.orgId) {
          req.orgId = ctx.activeContext.orgId;
        }
      }
      return;
    }

    // ── Bearer token (NextAuth JWE) ──────────────────────────────────────────
    const authHeader = req.headers.authorization;
    if (!authHeader) return;
    if (!authHeader.startsWith("Bearer ")) return;

    const token = authHeader.slice(7).trim();
    // NextAuth JWE should have five dot-separated segments.
    if (!/^([^\.]+\.){4}[^\.]+$/.test(token)) {
      app.log.debug({ correlationId: req.correlationId }, "Bearer token format invalid");
      return;
    }

    const secret = process.env["NEXTAUTH_SECRET"];
    if (!secret) {
      app.log.error("NEXTAUTH_SECRET not set — cannot verify Bearer token");
      return;
    }

    const payload = await decryptNextAuthToken(token, secret);
    if (!payload?.email) {
      app.log.debug("Bearer token invalid or expired");
      return;
    }

    // ── MFA enforcement ────────────────────────────────────────────────────
    // If the session has requiresMfa=true, the user authenticated with
    // email+password but has not yet completed TOTP verification.
    // Block all routes except the MFA challenge endpoint itself.
    if (payload.requiresMfa === true && req.url !== "/v1/auth/verify-mfa-challenge") {
      app.log.debug({ correlationId: req.correlationId }, "MFA required — request blocked");
      return;
    }

    const ctx = await resolvePrincipalContext(app.db, payload.email, slug, req.correlationId);
    if (ctx) {
      req.ctx = ctx;
      if (ctx.activeContext?.orgId) {
        req.orgId = ctx.activeContext.orgId;
      }
    }
  });
});
