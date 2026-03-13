import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { createCompensationStructure } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const BodySchema = z.object({
  structureCode: z.string().trim().min(1).max(50),
  structureName: z.string().trim().min(1).max(255),
  payBasis: z.enum(["annual", "monthly", "hourly", "daily"]),
  currencyCode: z.string().trim().length(3),
  minAmount: z.string().min(1),
  maxAmount: z.string().min(1).optional(),
});

const ResponseSchema = makeSuccessSchema(
  z.object({
    compensationStructureId: z.string().uuid(),
    structureCode: z.string(),
    structureName: z.string(),
    payBasis: z.string(),
  }),
);

export async function hrCreateCompensationStructureRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/hrm/compensation/structures",
    {
      schema: {
        description: "Create a compensation structure (pay band / grade).",
        tags: ["HRM", "Compensation"],
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

      const result = await createCompensationStructure(
        app.db,
        orgId,
        auth.principalId,
        req.correlationId,
        req.body,
      );

      if (!result.ok) {
        const status =
          result.error.code === "HRM_CONFLICT"
            ? 409
            : result.error.code === "HRM_INVALID_INPUT"
              ? 400
              : 500;
        return reply.status(status).send({ error: result.error });
      }
      return reply.status(201).send({ data: result.value });
    },
  );
}
