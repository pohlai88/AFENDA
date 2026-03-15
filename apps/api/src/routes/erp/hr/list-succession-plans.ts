import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { listSuccessionPlans } from "@afenda/core";
import { z } from "zod";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const QuerySchema = z.object({
  positionId: z.string().uuid().optional(),
  status: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const SuccessionPlanSchema = z.object({
  successionPlanId: z.string().uuid(),
  positionId: z.string().uuid(),
  positionTitle: z.string().nullable(),
  criticalRoleFlag: z.boolean(),
  status: z.string(),
  createdAt: z.string(),
});

const ResponseSchema = makeSuccessSchema(
  z.object({
    items: z.array(SuccessionPlanSchema),
  }),
);

export async function hrListSuccessionPlansRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/hrm/talent/succession-plans",
    {
      schema: {
        description: "List succession plans with optional filters.",
        tags: ["HRM", "Talent"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: QuerySchema,
        response: {
          200: ResponseSchema,
          401: ApiErrorResponseSchema,
          500: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;

      const auth = requireAuth(req, reply);
      if (!auth) return;

      const qs = req.query as z.infer<typeof QuerySchema>;
      const items = await listSuccessionPlans(app.db, {
        orgId,
        positionId: qs.positionId,
        status: qs.status,
        limit: qs.limit ?? 20,
        offset: qs.offset ?? 0,
      });

      return reply.status(200).send({ data: { items }, correlationId: req.correlationId });
    },
  );
}
