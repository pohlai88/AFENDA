import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { processSalaryChange } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const BodySchema = z.object({
  employmentId: z.string().uuid(),
  newAmount: z.string().min(1),
  effectiveFrom: z.string().min(1),
  changeReason: z.string().trim().min(1).max(500).optional(),
});

const ResponseSchema = makeSuccessSchema(
  z.object({
    historyId: z.string().uuid(),
    employmentId: z.string().uuid(),
    previousAmount: z.string().nullable(),
    newAmount: z.string(),
    effectiveFrom: z.string(),
  }),
);

export async function hrProcessSalaryChangeRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/hrm/compensation/salary-change",
    {
      schema: {
        description:
          "Process a salary change for an employment (closes current package, opens new one, records history).",
        tags: ["HRM", "Compensation"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: BodySchema,
        response: {
          201: ResponseSchema,
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

      const result = await processSalaryChange(
        app.db,
        orgId,
        auth.principalId,
        req.correlationId,
        req.body,
      );

      if (!result.ok) {
        const status =
          result.error.code === "HRM_INVALID_INPUT"
            ? 400
            : result.error.code === "HRM_EMPLOYMENT_NOT_FOUND"
              ? 404
              : 500;
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
