import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { terminateEmployment } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const TerminateEmploymentBodySchema = z.object({
  employmentId: z.string().uuid(),
  terminationDate: z.string(),
  terminationReasonCode: z.string().min(1).max(50),
  comment: z.string().max(1000).optional(),
});

const TerminateEmploymentResponseSchema = makeSuccessSchema(
  z.object({
    employmentId: z.string().uuid(),
    previousStatus: z.string(),
    currentStatus: z.string(),
  }),
);

export async function hrTerminateEmploymentRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/hrm/employments/terminate",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Terminate employment (phase 1 scaffold route).",
        tags: ["HRM", "Core HR"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: TerminateEmploymentBodySchema,
        response: {
          200: TerminateEmploymentResponseSchema,
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

      const result = await terminateEmployment(
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
            : result.error.code === "HRM_INVALID_EMPLOYMENT_STATE"
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