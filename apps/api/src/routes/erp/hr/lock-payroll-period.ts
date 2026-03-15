import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { lockPayrollPeriod } from "@afenda/core";
import { z } from "zod";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const BodySchema = z.object({
  payrollPeriodId: z.string().uuid(),
});

const ResponseSchema = makeSuccessSchema(
  z.object({
    payrollPeriodId: z.string().uuid(),
    periodStatus: z.string(),
  }),
);

export async function hrLockPayrollPeriodRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/hrm/payroll/periods/:payrollPeriodId/lock",
    {
      schema: {
        description: "Lock a payroll period.",
        tags: ["HRM", "Payroll"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ payrollPeriodId: z.string().uuid() }),
        response: {
          200: ResponseSchema,
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

      const result = await lockPayrollPeriod(
        app.db,
        orgId,
        auth.principalId,
        req.correlationId,
        { payrollPeriodId: (req.params as { payrollPeriodId: string }).payrollPeriodId },
      );

      if (!result.ok) {
        const status =
          result.error.code === "HRM_PAYROLL_PERIOD_NOT_FOUND"
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
