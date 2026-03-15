import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { HrmEmployeeDocumentSchema } from "@afenda/contracts";
import { listEmployeeDocuments } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const ResponseSchema = makeSuccessSchema(
  z.object({ items: z.array(HrmEmployeeDocumentSchema) }),
);

export async function hrListEmployeeDocumentsRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/hrm/employments/:employmentId/documents",
    {
      schema: {
        description: "List documents for an employment (Wave 13 Core HR enhancement).",
        tags: ["HRM", "Core HR"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: { employmentId: { type: "string", format: "uuid" } },
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

      const employmentId = (req.params as { employmentId: string }).employmentId;
      const rows = await listEmployeeDocuments(app.db, orgId, employmentId);

      const items = rows.map((r) => ({
        id: r.id,
        orgId: r.orgId,
        employmentId: r.employmentId,
        documentType: r.documentType,
        fileReference: r.fileReference,
        issuedAt: r.issuedAt ? r.issuedAt.toISOString().slice(0, 10) : null,
        expiresAt: r.expiresAt ? r.expiresAt.toISOString().slice(0, 10) : null,
      }));

      return reply.status(200).send({
        data: { items },
        correlationId: req.correlationId,
      });
    },
  );
}
