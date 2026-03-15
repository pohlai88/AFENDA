import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { listComplianceChecksByEmployee } from "@afenda/core";
import { z } from "zod";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const ParamsSchema = z.object({ employmentId: z.string().uuid() });
const QuerySchema = z.object({
  checkType: z.string().optional(),
  status: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const ComplianceCheckSchema = z.object({
  complianceCheckId: z.string().uuid(),
  employmentId: z.string().uuid(),
  checkType: z.string(),
  checkDate: z.string(),
  dueDate: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
});

const ResponseSchema = makeSuccessSchema(
  z.object({ items: z.array(ComplianceCheckSchema) }),
);

export async function hrListComplianceChecksByEmployeeRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/hrm/compliance/employees/:employmentId/checks",
    {
      schema: {
        description: "List compliance checks for an employee.",
        tags: ["HRM", "Compliance"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: ParamsSchema,
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

      const params = req.params as { employmentId: string };
      const qs = req.query as { checkType?: string; status?: string; limit?: number; offset?: number };

      const items = await listComplianceChecksByEmployee(app.db, {
        orgId,
        employmentId: params.employmentId,
        checkType: qs.checkType,
        status: qs.status,
        limit: qs.limit ?? 20,
        offset: qs.offset ?? 0,
      });

      return reply.status(200).send({ data: { items }, correlationId: req.correlationId });
    },
  );
}
