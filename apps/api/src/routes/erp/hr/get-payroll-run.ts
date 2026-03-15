import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { getPayrollRun } from "@afenda/core";
import { z } from "zod";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const ResponseSchema = makeSuccessSchema(
  z.object({
    payrollRunId: z.string().uuid(),
    payrollPeriodId: z.string().uuid(),
    periodCode: z.string(),
    periodStartDate: z.string(),
    periodEndDate: z.string(),
    paymentDate: z.string(),
    runType: z.string(),
    runNumber: z.string(),
    status: z.string(),
    submittedAt: z.string().nullable(),
    approvedAt: z.string().nullable(),
  }),
);

export async function hrGetPayrollRunRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/hrm/payroll/runs/:payrollRunId",
    {
      schema: {
        description: "Get a payroll run.",
        tags: ["HRM", "Payroll"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ payrollRunId: z.string().uuid() }),
        response: {
          200: ResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
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

      const payrollRunId = (req.params as { payrollRunId: string }).payrollRunId;
      const data = await getPayrollRun(app.db, { orgId, payrollRunId });

      if (!data) {
        return reply.status(404).send({
          error: {
            code: "HRM_PAYROLL_RUN_NOT_FOUND",
            message: "Payroll run not found",
            details: { payrollRunId },
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({ data, correlationId: req.correlationId });
    },
  );
}
