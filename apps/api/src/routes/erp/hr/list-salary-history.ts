import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { listSalaryHistory } from "@afenda/core";
import { ApiErrorResponseSchema, requireAuth, requireOrg } from "../../../helpers/responses.js";

const QuerySchema = z.object({
  employmentId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export async function hrListSalaryHistoryRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/hrm/compensation/salary-history",
    {
      schema: {
        description:
          "List salary change history records (append-only truth table). Ordered by effectiveFrom DESC.",
        tags: ["HRM", "Compensation"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: QuerySchema,
        response: {
          200: z.object({
            data: z.array(z.record(z.unknown())),
          }),
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

      const rows = await listSalaryHistory(app.db, orgId, {
        employmentId: req.query.employmentId,
        limit: req.query.limit,
        offset: req.query.offset,
      });

      return reply.status(200).send({ data: rows });
    },
  );
}
