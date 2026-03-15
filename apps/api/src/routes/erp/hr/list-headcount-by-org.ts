import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { listHeadcountByOrg } from "@afenda/core";
import { z } from "zod";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const QuerySchema = z.object({
  orgUnitId: z.string().uuid().optional(),
  planYear: z.coerce.number().int().min(2000).max(2100),
});

const HeadcountSchema = z.object({
  orgUnitId: z.string().uuid(),
  orgUnitName: z.string(),
  positionId: z.string().uuid(),
  positionTitle: z.string(),
  approvedHeadcount: z.number(),
  budgetAmount: z.string(),
});

const ResponseSchema = makeSuccessSchema(
  z.object({ items: z.array(HeadcountSchema) }),
);

export async function hrListHeadcountByOrgRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/hrm/workforce-planning/headcount",
    {
      schema: {
        description: "List headcount by org unit for a plan year.",
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
      const items = await listHeadcountByOrg(app.db, {
        orgId,
        orgUnitId: qs.orgUnitId,
        planYear: qs.planYear,
      });

      return reply
        .status(200)
        .send({ data: { items }, correlationId: req.correlationId });
    },
  );
}
