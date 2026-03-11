import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { createOrgUnit } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const CreateOrgUnitBodySchema = z.object({
  legalEntityId: z.string().uuid(),
  orgUnitCode: z.string().min(1).max(50).optional(),
  orgUnitName: z.string().min(1).max(255),
  parentOrgUnitId: z.string().uuid().optional(),
  status: z.string().max(50).optional(),
});

const CreateOrgUnitResponseSchema = makeSuccessSchema(
  z.object({
    orgUnitId: z.string().uuid(),
    orgUnitCode: z.string(),
  }),
);

export async function hrCreateOrgUnitRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/hrm/org-units",
    {
      schema: {
        description: "Create org unit.",
        tags: ["HRM", "Organization"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreateOrgUnitBodySchema,
        response: {
          201: CreateOrgUnitResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
          500: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await createOrgUnit(app.db, orgId, auth.principalId, req.correlationId, req.body);

      if (!result.ok) {
        const status =
          result.error.code === "HRM_ORG_UNIT_NOT_FOUND"
            ? 404
            : result.error.code === "HRM_CONFLICT"
              ? 409
              : 400;

        return reply.status(status).send({
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.meta,
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(201).send({ data: result.data, correlationId: req.correlationId });
    },
  );
}