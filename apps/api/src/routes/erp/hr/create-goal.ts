import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { createGoal } from "@afenda/core";
import { z } from "zod";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";
import { CreateGoalCommandSchema } from "@afenda/contracts";

const ResponseSchema = makeSuccessSchema(
  z.object({
    goalId: z.string().uuid(),
  }),
);

export async function hrCreateGoalRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/hrm/performance/goals",
    {
      schema: {
        description: "Create a goal for a performance review.",
        tags: ["HRM", "Performance"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreateGoalCommandSchema,
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

      const result = await createGoal(
        app.db,
        orgId,
        auth.principalId,
        req.correlationId,
        req.body,
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
