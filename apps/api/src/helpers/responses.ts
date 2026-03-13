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
import { ContractErrorEnvelopeSchema } from "@afenda/contracts";

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

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

export function mapErrorCodeToHttpStatus(code: string): number {
  switch (code) {
    case ERR.VALIDATION:
      return 400;
    case ERR.UNAUTHORIZED:
      return 401;
    case ERR.FORBIDDEN:
      return 403;
    case ERR.NOT_FOUND:
      return 404;
    case ERR.CONFLICT:
      return 409;
    default:
      return 500;
  }
}

/**
 * Validates an error payload against contracts' ContractErrorEnvelopeSchema,
 * then maps to the API transport shape used by route serializers.
 */
export function makeApiErrorFromContractEnvelope(input: {
  correlationId: string;
  code: string;
  message: string;
  fieldPath?: string;
  details?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}): ApiErrorResponse {
  const contractEnvelope = ContractErrorEnvelopeSchema.parse({
    meta: {
      ...(input.meta ?? {}),
      correlationId: input.correlationId,
    },
    error: {
      code: input.code,
      message: input.message,
      details: input.details,
    },
    status: "error",
  });

  return ApiErrorResponseSchema.parse({
    error: {
      code: contractEnvelope.error.code,
      message: contractEnvelope.error.message,
      fieldPath: input.fieldPath,
      details: contractEnvelope.error.details,
    },
    correlationId: input.correlationId,
  });
}

export function sendContractError(
  reply: FastifyReply,
  req: FastifyRequest,
  input: {
    code: string;
    message: string;
    fieldPath?: string;
    details?: Record<string, unknown>;
    statusCode?: number;
    meta?: Record<string, unknown>;
  },
) {
  const body = makeApiErrorFromContractEnvelope({
    correlationId: req.correlationId,
    code: input.code,
    message: input.message,
    fieldPath: input.fieldPath,
    details: input.details,
    meta: input.meta,
  });
  const statusCode = input.statusCode ?? mapErrorCodeToHttpStatus(input.code);

  reply.status(statusCode).send(body);
}

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
  sendContractError(reply, req, {
    code: ERR.ORG_NOT_FOUND,
    message: "Organization could not be resolved from request context",
    statusCode: 400,
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
  sendContractError(reply, req, {
    code: ERR.UNAUTHORIZED,
    message: "Authentication required",
  });
  return undefined;
}
