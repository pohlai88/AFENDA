import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { createGrade } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const CreateGradeBodySchema = z.object({
  gradeCode: z.string().min(1).max(50).optional(),
  gradeName: z.string().min(1).max(255),
  gradeRank: z.number().int().optional(),
  minSalaryAmount: z.string().optional(),
  midSalaryAmount: z.string().optional(),
  maxSalaryAmount: z.string().optional(),
});

const CreateGradeResponseSchema = makeSuccessSchema(
  z.object({
    gradeId: z.string().uuid(),
    gradeCode: z.string(),
  }),
);

export async function hrCreateGradeRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/hrm/job-grades",
    {
      schema: {
        description: "Create grade.",
        tags: ["HRM", "Organization"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreateGradeBodySchema,
        response: {
          201: CreateGradeResponseSchema,
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

      const result = await createGrade(app.db, orgId, auth.principalId, req.correlationId, req.body);

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

      return reply.status(201).send({ data: result.data, correlationId: req.correlationId });
    },
  );
}