import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { getPerformanceReview } from "@afenda/core";
import { z } from "zod";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const ResponseSchema = makeSuccessSchema(
  z.object({
    performanceReviewId: z.string().uuid(),
    employmentId: z.string().uuid(),
    reviewCycleId: z.string().uuid(),
    cycleCode: z.string(),
    cycleName: z.string(),
    reviewerEmploymentId: z.string().uuid().nullable(),
    status: z.string(),
    overallRating: z.string().nullable(),
    selfSubmittedAt: z.string().datetime().nullable(),
    managerCompletedAt: z.string().datetime().nullable(),
    goals: z.array(
      z.object({
        goalId: z.string().uuid(),
        goalText: z.string(),
        targetDate: z.string().nullable(),
        status: z.string(),
      }),
    ),
  }),
);

export async function hrGetPerformanceReviewRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/hrm/performance/reviews/:performanceReviewId",
    {
      schema: {
        description: "Get a performance review by ID.",
        tags: ["HRM", "Performance"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ performanceReviewId: z.string().uuid() }),
        response: {
          200: ResponseSchema,
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          500: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;

      const auth = requireAuth(req, reply);
      if (!auth) return;

      const data = await getPerformanceReview(app.db, {
        orgId,
        performanceReviewId: (req.params as { performanceReviewId: string }).performanceReviewId,
      });

      if (!data) {
        return reply.status(404).send({
          error: {
            code: "HRM_PERFORMANCE_REVIEW_NOT_FOUND",
            message: "Performance review not found",
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({ data, correlationId: req.correlationId });
    },
  );
}
