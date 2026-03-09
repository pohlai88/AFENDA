/**
 * Numbering configuration routes — business-facing control over sequence config.
 *
 * Routes:
 *   GET  /v1/settings/numbering  → list all configured sequences for the org
 *   PATCH /v1/settings/numbering → update prefix / pad width / seed next value
 *
 * RULES:
 *   1. Uses the existing sequence table via core service — never touches org_setting.
 *   2. seedNextValue may only INCREASE — gap-free constraint enforced at service level.
 *   3. Permission gates: admin.settings.read / admin.settings.write.
 */
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  NumberingConfigResponseSchema,
  UpdateNumberingConfigCommandSchema,
  type OrgId,
  type SequenceEntityType,
} from "@afenda/contracts";
import { listNumberingConfigs, updateNumberingConfig } from "@afenda/core";
import { ApiErrorResponseSchema, makeSuccessSchema, requireOrg, requireAuth } from "../../helpers/responses.js";

const NumberingGetResponseSchema = makeSuccessSchema(NumberingConfigResponseSchema);

export async function numberingRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  // ── GET /v1/settings/numbering ───────────────────────────────────────────
  typed.get(
    "/settings/numbering",
    {
      schema: {
        description:
          "Get all configured document numbering sequences for the org.",
        tags: ["Numbering"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        response: {
          200: NumberingGetResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      if (!auth.permissionsSet.has("admin.settings.read")) {
        return reply.status(403).send({
          error: { code: "SHARED_FORBIDDEN", message: "Requires admin.settings.read permission" },
          correlationId: req.correlationId,
        });
      }

      const configs = await listNumberingConfigs(app.db, orgId as OrgId);

      return { data: { configs }, correlationId: req.correlationId };
    },
  );

  // ── PATCH /v1/settings/numbering ─────────────────────────────────────────
  typed.patch(
    "/settings/numbering",
    {
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
      schema: {
        description:
          "Update a document numbering sequence config (prefix, pad width, or seed). " +
          "seedNextValue may only INCREASE — gap-free constraint.",
        tags: ["Numbering"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: UpdateNumberingConfigCommandSchema,
        response: {
          200: NumberingGetResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      if (!auth.permissionsSet.has("admin.settings.write")) {
        return reply.status(403).send({
          error: { code: "SHARED_FORBIDDEN", message: "Requires admin.settings.write permission" },
          correlationId: req.correlationId,
        });
      }

      const { entityType, prefix, padWidth, seedNextValue } = req.body;

      try {
        await updateNumberingConfig(app.db, orgId as OrgId, {
          entityType: entityType as SequenceEntityType,
          prefix,
          padWidth,
          seedNextValue,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        if (msg.includes("CFG_NUMBERING_SEED_DECREASE")) {
          return reply.status(400).send({
            error: { code: "CFG_NUMBERING_SEED_DECREASE", message: msg },
            correlationId: req.correlationId,
          });
        }
        throw err;
      }

      const configs = await listNumberingConfigs(app.db, orgId as OrgId);

      return { data: { configs }, correlationId: req.correlationId };
    },
  );
}
