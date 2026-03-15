import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { listPolicyAcknowledgements } from "@afenda/core";
import { z } from "zod";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const QuerySchema = z.object({
  employmentId: z.string().uuid().optional(),
  policyDocumentId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const AcknowledgementSchema = z.object({
  acknowledgementId: z.string().uuid(),
  employmentId: z.string().uuid(),
  policyDocumentId: z.string().uuid(),
  documentCode: z.string(),
  documentName: z.string(),
  acknowledgedAt: z.string(),
  ipAddress: z.string().nullable(),
});

const ResponseSchema = makeSuccessSchema(
  z.object({ items: z.array(AcknowledgementSchema) }),
);

export async function hrListPolicyAcknowledgementsRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/hrm/compliance/acknowledgements",
    {
      schema: {
        description: "List policy acknowledgements.",
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

      const qs = req.query as z.infer<typeof QuerySchema>;
      const items = await listPolicyAcknowledgements(app.db, {
        orgId,
        employmentId: qs.employmentId,
        policyDocumentId: qs.policyDocumentId,
        limit: qs.limit ?? 20,
        offset: qs.offset ?? 0,
      });

      return reply.status(200).send({ data: { items }, correlationId: req.correlationId });
    },
  );
}
