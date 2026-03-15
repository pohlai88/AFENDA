import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { listPayrollRunEmployees } from "@afenda/core";
import { z } from "zod";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const ResponseSchema = makeSuccessSchema(
  z.array(
    z.object({
      payrollRunEmployeeId: z.string().uuid(),
      payrollRunId: z.string().uuid(),
      employmentId: z.string().uuid(),
      currencyCode: z.string(),
      grossAmount: z.string(),
      deductionAmount: z.string(),
      employerCostAmount: z.string(),
      netAmount: z.string(),
      status: z.string(),
    }),
  ),
);

export async function hrListPayrollRunEmployeesRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/hrm/payroll/runs/:payrollRunId/employees",
    {
      schema: {
        description: "List payroll run employees.",
        tags: ["HRM", "Payroll"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ payrollRunId: z.string().uuid() }),
        response: {
          200: ResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          500: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;

      const auth = requireAuth(req, reply);
      if (!auth) return;

      const payrollRunId = (req.params as { payrollRunId: string }).payrollRunId;
      const data = await listPayrollRunEmployees(app.db, { orgId, payrollRunId });
      return reply.status(200).send({ data, correlationId: req.correlationId });
    },
  );
}
