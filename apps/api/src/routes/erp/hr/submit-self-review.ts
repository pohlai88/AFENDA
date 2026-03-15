import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { submitSelfReview } from "@afenda/core";
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
    status: z.string(),
  }),
);

export async function hrSubmitSelfReviewRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/hrm/performance/reviews/:performanceReviewId/submit-self",
    {
      schema: {
        description: "Submit self review for a performance review.",
        tags: ["HRM", "Performance"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ performanceReviewId: z.string().uuid() }),
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

      const result = await submitSelfReview(
        app.db,
        orgId,
        auth.principalId,
        req.correlationId,
        { performanceReviewId: (req.params as { performanceReviewId: string }).performanceReviewId },
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
