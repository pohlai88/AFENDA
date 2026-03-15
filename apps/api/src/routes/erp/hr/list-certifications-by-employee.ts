import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { listCertificationsByEmployee } from "@afenda/core";
import { z } from "zod";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const ParamsSchema = z.object({ employmentId: z.string().uuid() });
const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const CertificationSchema = z.object({
  certificationId: z.string().uuid(),
  employmentId: z.string().uuid(),
  certificationCode: z.string(),
  issuedAt: z.string(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
});

const ResponseSchema = makeSuccessSchema(
  z.object({ items: z.array(CertificationSchema) }),
);

export async function hrListCertificationsByEmployeeRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/hrm/learning/employees/:employmentId/certifications",
    {
      schema: {
        description: "List certifications for an employee.",
        tags: ["HRM", "Learning"],
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
      const qs = req.query as { limit?: number; offset?: number };

      const items = await listCertificationsByEmployee(app.db, {
        orgId,
        employmentId: params.employmentId,
        limit: qs.limit ?? 20,
        offset: qs.offset ?? 0,
      });

      return reply.status(200).send({ data: { items }, correlationId: req.correlationId });
    },
  );
}
