import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { AssignWorkCommandSchema, AssignWorkResultSchema } from "@afenda/contracts";
import { assignWork } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const AssignWorkParamsSchema = z.object({
  employmentId: z.string().uuid(),
});

const AssignWorkBodySchema = AssignWorkCommandSchema.omit({
  idempotencyKey: true,
  employmentId: true,
});

const AssignWorkResponseSchema = makeSuccessSchema(AssignWorkResultSchema);

export async function hrAssignWorkRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/hrm/employments/:employmentId/assign-work",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Assign work to an employment.",
        tags: ["HRM", "Core HR"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: AssignWorkParamsSchema,
        body: AssignWorkBodySchema,
        response: {
          200: AssignWorkResponseSchema,
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

      const result = await assignWork(app.db, orgId, auth.principalId, req.correlationId, {
        employmentId: req.params.employmentId,
        ...req.body,
      });

      if (!result.ok) {
        const status =
          result.error.code === "HRM_EMPLOYMENT_NOT_FOUND" ||
          result.error.code === "HRM_WORK_ASSIGNMENT_NOT_FOUND"
            ? 404
            : result.error.code === "HRM_WORK_ASSIGNMENT_OVERLAP" ||
                result.error.code === "HRM_INVALID_EMPLOYMENT_STATE"
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

      return reply.status(200).send({
        data: result.data,
        correlationId: req.correlationId,
      });
    },
  );
}
