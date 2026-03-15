import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { listCaseEvidence } from "@afenda/core";
import { z } from "zod";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const QuerySchema = z.object({
  caseType: z.enum(["grievance", "disciplinary"]),
  caseId: z.string().uuid(),
});

const EvidenceSchema = z.object({
  id: z.string().uuid(),
  caseType: z.string(),
  caseId: z.string().uuid(),
  evidenceType: z.string(),
  fileReference: z.string().nullable(),
  recordedAt: z.string(),
});

const ResponseSchema = makeSuccessSchema(
  z.object({ evidence: z.array(EvidenceSchema) }),
);

export async function hrListCaseEvidenceRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/hrm/employee-relations/evidence",
    {
      schema: {
        description: "List evidence attached to a grievance case or disciplinary action.",
        tags: ["HRM", "Employee Relations"],
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
      const evidence = await listCaseEvidence(app.db, {
        orgId,
        caseType: qs.caseType,
        caseId: qs.caseId,
      });

      return reply
        .status(200)
        .send({ data: { evidence }, correlationId: req.correlationId });
    },
  );
}
