import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  SuspendEmploymentCommandSchema,
  SuspendEmploymentResultSchema,
} from "@afenda/contracts";
import { suspendEmployment } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const SuspendEmploymentBodySchema = SuspendEmploymentCommandSchema.omit({
  idempotencyKey: true,
});

const SuspendEmploymentResponseSchema = makeSuccessSchema(SuspendEmploymentResultSchema);

export async function hrSuspendEmploymentRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/hrm/employments/suspend",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Suspend employment (Wave 13 Core HR enhancement).",
        tags: ["HRM", "Core HR"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: SuspendEmploymentBodySchema,
        response: {
          200: SuspendEmploymentResponseSchema,
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

      const result = await suspendEmployment(
        app.db,
        orgId,
        auth.principalId,
        req.correlationId,
        req.body,
      );

      if (!result.ok) {
        const status =
          result.error.code === "HRM_EMPLOYMENT_NOT_FOUND"
            ? 404
            : result.error.code === "HRM_EMPLOYMENT_ALREADY_SUSPENDED" ||
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
