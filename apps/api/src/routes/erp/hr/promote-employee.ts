import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  PromoteEmployeeCommandSchema,
  PromoteEmployeeResultSchema,
} from "@afenda/contracts";
import { promoteEmployee } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const BodySchema = PromoteEmployeeCommandSchema.omit({
  idempotencyKey: true,
});

const ResponseSchema = makeSuccessSchema(PromoteEmployeeResultSchema);

export async function hrPromoteEmployeeRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/hrm/employments/promote",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description:
          "Promote employee (grade/position/job change). At least one of gradeId, positionId, jobId must differ from current.",
        tags: ["HRM", "Core HR"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
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

      const performedAt = new Date().toISOString();

      const result = await promoteEmployee(
        app.db,
        orgId,
        auth.principalId,
        req.correlationId,
        performedAt,
        req.body,
      );

      if (!result.ok) {
        const status =
          result.error.code === "HRM_EMPLOYMENT_NOT_FOUND" ||
          result.error.code === "HRM_WORK_ASSIGNMENT_NOT_FOUND"
            ? 404
            : result.error.code === "HRM_PROMOTION_NO_CHANGE" ||
                result.error.code === "HRM_INVALID_EMPLOYMENT_STATE" ||
                result.error.code === "HRM_WORK_ASSIGNMENT_OVERLAP"
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
