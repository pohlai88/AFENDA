import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { RehireEmployeeCommandSchema, RehireEmployeeResultSchema } from "@afenda/contracts";
import { rehireEmployee } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const RehireEmployeeParamsSchema = z.object({
  employeeId: z.string().uuid(),
});

const RehireEmployeeBodySchema = RehireEmployeeCommandSchema.omit({
  idempotencyKey: true,
  employeeId: true,
});

const RehireEmployeeResponseSchema = makeSuccessSchema(RehireEmployeeResultSchema);

export async function hrRehireEmployeeRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/hrm/employees/:employeeId/rehire",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Rehire an employee.",
        tags: ["HRM", "Core HR"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: RehireEmployeeParamsSchema,
        body: RehireEmployeeBodySchema,
        response: {
          201: RehireEmployeeResponseSchema,
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

      const result = await rehireEmployee(app.db, orgId, auth.principalId, req.correlationId, {
        employeeId: req.params.employeeId,
        ...req.body,
      });

      if (!result.ok) {
        const status =
          result.error.code === "HRM_EMPLOYEE_NOT_FOUND"
            ? 404
            : result.error.code === "HRM_EMPLOYMENT_ALREADY_ACTIVE"
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

      return reply.status(201).send({
        data: result.data,
        correlationId: req.correlationId,
      });
    },
  );
}
