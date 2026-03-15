import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { listPayrollInputs } from "@afenda/core";
import { z } from "zod";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const QuerySchema = z.object({
  employmentId: z.string().uuid().optional(),
});

const ResponseSchema = makeSuccessSchema(
  z.array(
    z.object({
      payrollInputId: z.string().uuid(),
      payrollRunId: z.string().uuid(),
      employmentId: z.string().uuid(),
      inputType: z.string(),
      inputCode: z.string(),
      sourceModule: z.string(),
      sourceReferenceId: z.string().uuid().nullable(),
      quantity: z.string().nullable(),
      rate: z.string().nullable(),
      amount: z.string().nullable(),
      currencyCode: z.string().nullable(),
      effectiveDate: z.string().nullable(),
      status: z.string(),
    }),
  ),
);

export async function hrListPayrollInputsRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/hrm/payroll/runs/:payrollRunId/inputs",
    {
      schema: {
        description: "List payroll inputs for a run.",
        tags: ["HRM", "Payroll"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ payrollRunId: z.string().uuid() }),
        querystring: QuerySchema,
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
      const query = req.query as { employmentId?: string };
      const data = await listPayrollInputs(app.db, {
        orgId,
        payrollRunId,
        employmentId: query.employmentId,
      });
      return reply.status(200).send({ data, correlationId: req.correlationId });
    },
  );
}
