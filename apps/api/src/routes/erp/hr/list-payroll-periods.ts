import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { listPayrollPeriods } from "@afenda/core";
import { z } from "zod";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const QuerySchema = z.object({
  status: z.enum(["open", "locked", "closed"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const ResponseSchema = makeSuccessSchema(
  z.object({
    items: z.array(
      z.object({
        payrollPeriodId: z.string().uuid(),
        periodCode: z.string(),
        periodStartDate: z.string(),
        periodEndDate: z.string(),
        paymentDate: z.string(),
        periodStatus: z.string(),
      }),
    ),
    total: z.number().int(),
    limit: z.number().int(),
    offset: z.number().int(),
  }),
);

export async function hrListPayrollPeriodsRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/hrm/payroll/periods",
    {
      schema: {
        description: "List payroll periods.",
        tags: ["HRM", "Payroll"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
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

      const data = await listPayrollPeriods(app.db, { orgId, ...req.query });
      return reply.status(200).send({ data, correlationId: req.correlationId });
    },
  );
}
