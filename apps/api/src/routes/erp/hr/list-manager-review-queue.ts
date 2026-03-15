import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { listManagerReviewQueue } from "@afenda/core";
import { z } from "zod";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const QuerySchema = z.object({
  reviewerEmploymentId: z.string().uuid(),
  status: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const ResponseSchema = makeSuccessSchema(
  z.object({
    items: z.array(
      z.object({
        performanceReviewId: z.string().uuid(),
        employmentId: z.string().uuid(),
        reviewCycleId: z.string().uuid(),
        cycleCode: z.string(),
        cycleName: z.string(),
        status: z.string(),
      }),
    ),
    limit: z.number().int(),
    offset: z.number().int(),
  }),
);

export async function hrListManagerReviewQueueRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/hrm/performance/reviews/manager-queue",
    {
      schema: {
        description: "List performance reviews in manager review queue.",
        tags: ["HRM", "Performance"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
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

      const data = await listManagerReviewQueue(app.db, { orgId, ...req.query });
      return reply.status(200).send({ data, correlationId: req.correlationId });
    },
  );
}
