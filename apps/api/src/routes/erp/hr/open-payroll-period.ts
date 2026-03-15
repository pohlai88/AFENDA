import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { DateSchema } from "@afenda/contracts";
import { openPayrollPeriod } from "@afenda/core";
import { z } from "zod";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const BodySchema = z
  .object({
    periodCode: z.string().trim().min(1).max(50),
    periodStartDate: DateSchema,
    periodEndDate: DateSchema,
    paymentDate: DateSchema,
  })
  .refine((v) => v.periodStartDate <= v.periodEndDate, {
    message: "periodStartDate must be <= periodEndDate",
    path: ["periodEndDate"],
  });

const ResponseSchema = makeSuccessSchema(
  z.object({
    payrollPeriodId: z.string().uuid(),
    periodCode: z.string(),
    periodStatus: z.string(),
  }),
);

export async function hrOpenPayrollPeriodRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/hrm/payroll/periods",
    {
      schema: {
        description: "Open a new payroll period.",
        tags: ["HRM", "Payroll"],
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

      const result = await openPayrollPeriod(
        app.db,
        orgId,
        auth.principalId,
        req.correlationId,
        req.body,
      );

      if (!result.ok) {
        const status =
          result.error.code === "HRM_CONFLICT" ? 409 : 400;
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
