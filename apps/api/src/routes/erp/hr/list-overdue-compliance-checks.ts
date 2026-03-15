import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { listOverdueComplianceChecks } from "@afenda/core";
import { z } from "zod";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const OverdueCheckSchema = z.object({
  complianceCheckId: z.string().uuid(),
  employmentId: z.string().uuid(),
  checkType: z.string(),
  dueDate: z.string(),
  status: z.string(),
});

const ResponseSchema = makeSuccessSchema(
  z.object({ items: z.array(OverdueCheckSchema) }),
);

export async function hrListOverdueComplianceChecksRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/hrm/compliance/checks/overdue",
    {
      schema: {
        description: "List overdue compliance checks.",
        tags: ["HRM", "Compliance"],
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

      const qs = req.query as { limit?: number; offset?: number };

      const items = await listOverdueComplianceChecks(app.db, {
        orgId,
        limit: qs.limit ?? 20,
        offset: qs.offset ?? 0,
      });

      return reply.status(200).send({ data: { items }, correlationId: req.correlationId });
    },
  );
}
