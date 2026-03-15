import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { enrollBenefit } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const BodySchema = z.object({
  employmentId: z.string().uuid(),
  benefitPlanId: z.string().uuid(),
});

const ResponseSchema = makeSuccessSchema(
  z.object({
    enrollmentId: z.string().uuid(),
    employmentId: z.string().uuid(),
    benefitPlanId: z.string().uuid(),
    enrollmentStatus: z.string(),
  }),
);

export async function hrEnrollBenefitRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/hrm/benefit/enrollments",
    {
      schema: {
        description: "Enroll an employment in a benefit plan.",
        tags: ["HRM", "Benefits"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: BodySchema,
        response: {
          201: ResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
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

      const result = await enrollBenefit(
        app.db,
        orgId,
        auth.principalId,
        req.correlationId,
        req.body,
      );

      if (!result.ok) {
        const status =
          result.error.code === "HRM_CONFLICT"
            ? 409
            : result.error.code === "HRM_INVALID_INPUT"
              ? 400
              : 500;
        return reply.status(status).send({
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.meta,
          },
          correlationId: req.correlationId,
        });
      }
      return reply.status(201).send({ data: result.data, correlationId: req.correlationId });
    },
  );
}
