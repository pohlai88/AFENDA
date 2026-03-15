import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { createWorkforcePlan } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";
import {
  CreateWorkforcePlanCommandSchema,
  CreateWorkforcePlanResultSchema,
} from "@afenda/contracts";

const ResponseSchema = makeSuccessSchema(CreateWorkforcePlanResultSchema);

export async function hrCreateWorkforcePlanRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/hrm/workforce-planning/plans",
    {
      schema: {
        description: "Create a workforce plan.",
        tags: ["HRM", "Workforce Planning"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreateWorkforcePlanCommandSchema,
        response: {
          200: ResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
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

      const result = await createWorkforcePlan(
        app.db,
        orgId,
        auth.principalId,
        req.correlationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "HRM_CONFLICT" ? 409 : 400;
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
