/**
 * Shared API response schemas and route guard helpers.
 *
 * Centralises:
 *   - Error response schema (single shape for all 4xx/5xx responses)
 *   - Success envelope factory (wraps data + correlationId)
 *   - Route guards (requireOrg, requireAuth) to eliminate boilerplate
 *
 * Error codes MUST be values from ErrorCodeValues (@afenda/contracts).
 * Full registry: packages/contracts/src/shared/errors.ts.
 */
import { z } from "zod";
import type { FastifyReply, FastifyRequest } from "fastify";

// ── Canonical error code constants (subset used by route handlers) ──────────
// Full registry lives in @afenda/contracts/shared/errors.ts.
export const ERR = {
  VALIDATION: "SHARED_VALIDATION_ERROR",
  NOT_FOUND: "SHARED_NOT_FOUND",
  CONFLICT: "SHARED_CONFLICT",
  UNAUTHORIZED: "SHARED_UNAUTHORIZED",
  FORBIDDEN: "SHARED_FORBIDDEN",
  INTERNAL: "SHARED_INTERNAL_ERROR",
  ORG_NOT_FOUND: "IAM_ORG_NOT_FOUND",
} as const;

// ── Canonical API error response schema ─────────────────────────────────────
// Single source of truth for error responses across ALL route files.
// Uses z.string() for code (not z.enum) so core services can forward their
// own codes without serializer rejection.
export const ApiErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string().min(1),
    fieldPath: z.string().optional(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
  correlationId: z.string().uuid(),
});

// ── Success envelope factory ────────────────────────────────────────────────
// API-layer counterpart of contracts' makeSuccessEnvelopeSchema.
// Uses plain z.string().uuid() for correlationId (no brand) to avoid
// serializer issues with branded Zod types.
export function makeSuccessSchema<T extends z.ZodTypeAny>(data: T) {
  return z.object({
    data,
    correlationId: z.string().uuid(),
  });
}

// ── Route guards ────────────────────────────────────────────────────────────

/**
 * Require a resolved org UUID. Sends 400 if not resolved.
 * @returns orgId string, or undefined (reply already sent).
 */
export function requireOrg(req: FastifyRequest, reply: FastifyReply): string | undefined {
  if (req.orgId) return req.orgId;
  reply.status(400).send({
    error: {
      code: ERR.ORG_NOT_FOUND,
      message: "Organization could not be resolved from request context",
    },
    correlationId: req.correlationId,
  });
  return undefined;
}

/**
 * Require an authenticated principal. Sends 401 if not authenticated.
 * @returns RequestContext, or undefined (reply already sent).
 */
export function requireAuth(
  req: FastifyRequest,
  reply: FastifyReply,
): NonNullable<FastifyRequest["ctx"]> | undefined {
  if (req.ctx) return req.ctx;
  reply.status(401).send({
    error: {
      code: ERR.UNAUTHORIZED,
      message: "Authentication required",
    },
    correlationId: req.correlationId,
  });
  return undefined;
}
