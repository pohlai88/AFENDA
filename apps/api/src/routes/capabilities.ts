/**
 * Capabilities route — `GET /v1/capabilities/:entityKey`
 *
 * Returns the resolved CapabilityResult for the authenticated principal
 * against a specific entity (and optionally a specific record for SoD).
 *
 * This is how the web app obtains permission data without importing
 * `@afenda/core` directly (boundary law: web → contracts + ui only).
 *
 * Follows the existing route pattern:
 *   - ZodTypeProvider for validation + OpenAPI
 *   - requireAuth guard
 *   - Domain service from @afenda/core
 */
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
} from "../helpers/responses.js";
import { CapabilityResultSchema } from "@afenda/contracts";
import { resolveCapabilities } from "@afenda/core";
import type { PolicyContext } from "@afenda/core";

// ── Response schema ──────────────────────────────────────────────────────────

const CapabilitiesResponseSchema = makeSuccessSchema(CapabilityResultSchema);

// ── Route plugin ─────────────────────────────────────────────────────────────

export async function capabilitiesRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  /**
   * GET /v1/capabilities/:entityKey
   *
   * Query params:
   *   - recordId: optional — when provided, record-level SoD is evaluated
   *   - submittedByPrincipalId: optional — used for invoice SoD checks
   *
   * Returns CapabilityResult with fieldCaps + actionCaps for the entity.
   */
  typed.get(
    "/capabilities/:entityKey",
    {
      schema: {
        description: "Resolve field + action capabilities for an entity and the authenticated principal.",
        tags: ["Capabilities"],
        params: z.object({
          entityKey: z.string().min(1).max(128),
        }),
        querystring: z.object({
          recordId: z.string().optional(),
          submittedByPrincipalId: z.string().optional(),
        }),
        response: {
          200: CapabilitiesResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const ctx = requireAuth(req, reply);
      if (!ctx) return;

      const { entityKey } = req.params;
      const { submittedByPrincipalId } = req.query;

      // Build policy context from request context
      const policyCtx: PolicyContext = {
        principalId: ctx.principalId,
        permissionsSet: ctx.permissionsSet,
      };

      // Build optional record context for SoD evaluation
      const recordContext = submittedByPrincipalId
        ? { submittedByPrincipalId }
        : undefined;

      const result = resolveCapabilities(policyCtx, entityKey, recordContext);

      return {
        data: result,
        correlationId: req.correlationId,
      };
    },
  );
}
