import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { createPosition } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const CreatePositionBodySchema = z.object({
  positionCode: z.string().min(1).max(50).optional(),
  positionTitle: z.string().min(1).max(255),
  legalEntityId: z.string().uuid(),
  orgUnitId: z.string().uuid().optional(),
  jobId: z.string().uuid().optional(),
  gradeId: z.string().uuid().optional(),
  positionStatus: z.string().max(50).optional(),
  isBudgeted: z.boolean().optional(),
  headcountLimit: z.number().int().min(1).optional(),
  effectiveFrom: z.string(),
});

const CreatePositionResponseSchema = makeSuccessSchema(
  z.object({
    positionId: z.string().uuid(),
    positionCode: z.string(),
  }),
);

export async function hrCreatePositionRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/hrm/positions",
    {
      schema: {
        description: "Create position.",
        tags: ["HRM", "Organization"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreatePositionBodySchema,
        response: {
          201: CreatePositionResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
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

      const result = await createPosition(app.db, orgId, auth.principalId, req.correlationId, req.body);

      if (!result.ok) {
        const status = result.error.code === "HRM_CONFLICT" ? 409 : 400;
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