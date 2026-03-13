import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { assignCompensationPackage } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const BodySchema = z.object({
  employmentId: z.string().uuid(),
  compensationStructureId: z.string().uuid(),
  salaryAmount: z.string().min(1),
  effectiveFrom: z.string().min(1),
  changeReason: z.string().trim().min(1).max(500).optional(),
});

const ResponseSchema = makeSuccessSchema(
  z.object({
    packageId: z.string().uuid(),
    employmentId: z.string().uuid(),
    compensationStructureId: z.string().uuid(),
    salaryAmount: z.string(),
    isCurrent: z.boolean(),
  }),
);

export async function hrAssignCompensationPackageRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/hrm/compensation/packages",
    {
      schema: {
        description: "Assign a compensation package to an employment.",
        tags: ["HRM", "Compensation"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: BodySchema,
        response: {
          201: ResponseSchema,
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

      const result = await assignCompensationPackage(
        app.db,
        orgId,
        auth.principalId,
        req.correlationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "HRM_INVALID_INPUT" ? 400 : 500;
        return reply.status(status).send({ error: result.error });
      }
      return reply.status(201).send({ data: result.value });
    },
  );
}
