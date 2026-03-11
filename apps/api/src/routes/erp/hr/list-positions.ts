import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { listPositions } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const ListPositionsQuerySchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const ListPositionsResponseSchema = makeSuccessSchema(
  z.object({
    items: z.array(
      z.object({
        positionId: z.string().uuid(),
        positionCode: z.string(),
        positionTitle: z.string(),
        legalEntityId: z.string().uuid(),
        orgUnitId: z.string().uuid().nullable(),
        jobId: z.string().uuid().nullable(),
        gradeId: z.string().uuid().nullable(),
        positionStatus: z.string(),
        isBudgeted: z.boolean(),
        headcountLimit: z.number().int(),
        effectiveFrom: z.string(),
        effectiveTo: z.string().nullable(),
        isCurrent: z.boolean(),
      }),
    ),
    total: z.number().int(),
    limit: z.number().int(),
    offset: z.number().int(),
  }),
);

export async function hrListPositionsRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/hrm/positions",
    {
      schema: {
        description: "List positions.",
        tags: ["HRM", "Organization"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: ListPositionsQuerySchema,
        response: {
          200: ListPositionsResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          500: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const data = await listPositions(app.db, { orgId, ...req.query });

      return reply.status(200).send({ data, correlationId: req.correlationId });
    },
  );
}