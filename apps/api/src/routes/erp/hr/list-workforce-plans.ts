import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { listWorkforcePlans } from "@afenda/core";
import { z } from "zod";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const QuerySchema = z.object({
  planYear: z.coerce.number().int().min(2000).max(2100).optional(),
});

const PlanSchema = z.object({
  id: z.string().uuid(),
  planCode: z.string(),
  planName: z.string(),
  planYear: z.number(),
  status: z.string(),
});

const ResponseSchema = makeSuccessSchema(
  z.object({ plans: z.array(PlanSchema) }),
);

export async function hrListWorkforcePlansRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/hrm/workforce-planning/plans",
    {
      schema: {
        description: "List workforce plans.",
        tags: ["HRM", "Workforce Planning"],
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
      const plans = await listWorkforcePlans(app.db, {
        orgId,
        planYear: qs.planYear,
      });

      return reply
        .status(200)
        .send({ data: { plans }, correlationId: req.correlationId });
    },
  );
}
