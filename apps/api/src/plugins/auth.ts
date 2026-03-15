/**
 * Fastify plugin: Authentication.
 *
 * Runs in `onRequest` (before rate-limit evaluation) so the rate limiter
 * can key by resolved principalId instead of raw IP.
 *
 * Supports one active mode during Neon Auth migration:
 *
 *   1. **Dev mode** (`NODE_ENV !== "production"`):
 *      Send `X-Dev-User-Email` header — resolves the principal from the DB by
 *      email and builds a full RequestContext. No token required.
 *
 * ADR-0003 COMPLETE:
 *   - Uses `resolvePrincipalContext` (party/principal/membership model)
 *   - Sets `orgId` on request for downstream consumers
 *
 * Routes that require authentication check `req.ctx` and return 401 when absent.
 */
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { resolvePrincipalContext } from "@afenda/core";
import { createRemoteJWKSet, jwtVerify } from "jose";

const DEV_HEADER = "x-dev-user-email";

function extractBearerToken(value: string | string[] | undefined): string | null {
  if (!value) return null;

  const header = Array.isArray(value) ? value[0] : value;
  if (!header) return null;

  const [scheme, token] = header.split(" ");
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") return null;
  return token.trim();
}

function resolveJwksUrl(): string | null {
  const explicit = process.env["NEON_AUTH_JWKS_URL"];
  if (explicit) return explicit;

  const baseUrl = process.env["NEON_AUTH_BASE_URL"];
  if (!baseUrl) return null;

  return new URL(
    ".well-known/jwks.json",
    baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`,
  ).toString();
}

function extractEmailFromPayload(payload: Record<string, unknown>): string | null {
  const email = payload["email"];
  if (typeof email === "string" && email.length > 0) return email;

  const preferredUsername = payload["preferred_username"];
  if (
    typeof preferredUsername === "string" &&
    preferredUsername.length > 0 &&
    preferredUsername.includes("@")
  ) {
    return preferredUsername;
  }

  return null;
}

// ── Plugin ────────────────────────────────────────────────────────────────────

const authPluginImpl: FastifyPluginAsync = async (app) => {
  app.decorateRequest("ctx", undefined);
  const jwksUrl = resolveJwksUrl();
  const jwks = jwksUrl ? createRemoteJWKSet(new URL(jwksUrl)) : null;

  // onRequest fires after correlationId + orgSlug hooks (which are registered
  // before this plugin in index.ts). So req.correlationId and req.orgSlug are
  // already populated when this hook runs.
  app.addHook("onRequest", async (req: any) => {
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

    const bearerToken = extractBearerToken(req.headers.authorization);
    if (!bearerToken || !jwks) return;

    try {
      const verified = await jwtVerify(bearerToken, jwks);
      const email = extractEmailFromPayload(verified.payload);

      if (!email) {
        app.log.warn(
          {
            correlationId: req.correlationId,
            orgSlug: slug,
            claims: Object.keys(verified.payload),
          },
          "Neon Auth token verified but email claim is missing",
        );
        return;
      }

      const ctx = await resolvePrincipalContext(app.db, email, slug, req.correlationId);
      if (!ctx) {
        app.log.warn(
          { correlationId: req.correlationId, orgSlug: slug, email },
          "Verified Neon Auth token did not resolve to a principal context",
        );
        return;
      }

      req.ctx = ctx;
      if (ctx.activeContext?.orgId) {
        req.orgId = ctx.activeContext.orgId;
      }
    } catch (error) {
      app.log.warn(
        {
          correlationId: req.correlationId,
          orgSlug: slug,
          error: error instanceof Error ? error.message : String(error),
        },
        "Failed to verify Neon Auth bearer token",
      );
    }
  });
};

export const authPlugin = fp(authPluginImpl as any, {
  name: "afenda-auth-plugin",
}) as FastifyPluginAsync;
