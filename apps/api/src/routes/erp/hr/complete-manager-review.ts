import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { completeManagerReview } from "@afenda/core";
import { z } from "zod";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const BodySchema = z.object({
  idempotencyKey: z.string().uuid(),
  overallRating: z.string().trim().min(1).max(50),
});

const ResponseSchema = makeSuccessSchema(
  z.object({
    performanceReviewId: z.string().uuid(),
    status: z.string(),
  }),
);

export async function hrCompleteManagerReviewRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/hrm/performance/reviews/:performanceReviewId/complete-manager",
    {
      schema: {
        description: "Complete manager review for a performance review.",
        tags: ["HRM", "Performance"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ performanceReviewId: z.string().uuid() }),
        body: BodySchema,
        response: {
          200: ResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
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

      const params = req.params as { performanceReviewId: string };

      const result = await completeManagerReview(
        app.db,
        orgId,
        auth.principalId,
        req.correlationId,
        {
          performanceReviewId: params.performanceReviewId,
          overallRating: (req.body as { overallRating: string }).overallRating,
        },
      );

      if (!result.ok) {
        const status =
          result.error.code === "HRM_PERFORMANCE_REVIEW_NOT_FOUND"
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

      return reply.status(200).send({ data: result.data, correlationId: req.correlationId });
    },
  );
}
