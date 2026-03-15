import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { nominateSuccessor } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";
import { z } from "zod";
import {
  NominateSuccessorCommandSchema,
  NominateSuccessorResultSchema,
} from "@afenda/contracts";

const ResponseSchema = makeSuccessSchema(NominateSuccessorResultSchema);

export async function hrNominateSuccessorRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/hrm/talent/succession-plans/:successionPlanId/nominate",
    {
      schema: {
        description: "Nominate an employee as successor for a succession plan.",
        tags: ["HRM", "Talent"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ successionPlanId: z.string().uuid() }),
        body: NominateSuccessorCommandSchema.omit({ successionPlanId: true }),
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

      const params = req.params as { successionPlanId: string };
      const body = req.body as { employmentId: string; readinessLevel: string; idempotencyKey: string };

      const result = await nominateSuccessor(
        app.db,
        orgId,
        auth.principalId,
        req.correlationId,
        {
          successionPlanId: params.successionPlanId,
          employmentId: body.employmentId,
          readinessLevel: body.readinessLevel,
        },
      );

      if (!result.ok) {
        const status =
          result.error.code === "HRM_SUCCESSION_PLAN_NOT_FOUND" ||
          result.error.code === "HRM_EMPLOYMENT_NOT_FOUND"
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
