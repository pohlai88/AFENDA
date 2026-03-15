import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { listSuccessorsForPosition } from "@afenda/core";
import { z } from "zod";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const QuerySchema = z.object({
  successionPlanId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const SuccessorSchema = z.object({
  successorNominationId: z.string().uuid(),
  successionPlanId: z.string().uuid(),
  employmentId: z.string().uuid(),
  employmentNumber: z.string(),
  readinessLevel: z.string(),
  createdAt: z.string(),
});

const ResponseSchema = makeSuccessSchema(
  z.object({
    items: z.array(SuccessorSchema),
  }),
);

export async function hrListSuccessorsForPositionRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/hrm/talent/positions/:positionId/successors",
    {
      schema: {
        description: "List successor nominations for a position.",
        tags: ["HRM", "Talent"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ positionId: z.string().uuid() }),
        querystring: QuerySchema,
        response: {
          200: ResponseSchema,
          401: ApiErrorResponseSchema,
          500: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;

      const auth = requireAuth(req, reply);
      if (!auth) return;

      const params = req.params as { positionId: string };
      const qs = req.query as { successionPlanId?: string; limit?: number; offset?: number };

      const items = await listSuccessorsForPosition(app.db, {
        orgId,
        positionId: params.positionId,
        successionPlanId: qs.successionPlanId,
        limit: qs.limit ?? 20,
        offset: qs.offset ?? 0,
      });

      return reply.status(200).send({ data: { items }, correlationId: req.correlationId });
    },
  );
}
