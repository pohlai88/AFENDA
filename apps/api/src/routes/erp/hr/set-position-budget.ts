import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { setPositionBudget } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";
import {
  SetPositionBudgetCommandSchema,
  SetPositionBudgetResultSchema,
} from "@afenda/contracts";

const ResponseSchema = makeSuccessSchema(SetPositionBudgetResultSchema);

export async function hrSetPositionBudgetRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/hrm/workforce-planning/position-budgets",
    {
      schema: {
        description: "Set or update position budget for a plan year.",
        tags: ["HRM", "Workforce Planning"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: SetPositionBudgetCommandSchema,
        response: {
          200: ResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          500: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;

      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await setPositionBudget(
        app.db,
        orgId,
        auth.principalId,
        req.correlationId,
        req.body,
      );

      if (!result.ok) {
        const status =
          result.error.code === "HRM_ORG_UNIT_NOT_FOUND" ||
          result.error.code === "HRM_POSITION_NOT_FOUND"
            ? 404
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
