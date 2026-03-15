import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { createBenefitPlan } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const BodySchema = z.object({
  planCode: z.string().trim().min(1).max(50),
  planName: z.string().trim().min(1).max(255),
  planType: z.enum(["health", "dental", "vision", "life_insurance", "retirement", "other"]),
  providerName: z.string().trim().min(1).max(255).optional(),
});

const ResponseSchema = makeSuccessSchema(
  z.object({
    benefitPlanId: z.string().uuid(),
    planCode: z.string(),
    planName: z.string(),
    planType: z.string(),
  }),
);

export async function hrCreateBenefitPlanRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/hrm/benefit/plans",
    {
      schema: {
        description: "Create a benefit plan definition.",
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

      const result = await createBenefitPlan(
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
