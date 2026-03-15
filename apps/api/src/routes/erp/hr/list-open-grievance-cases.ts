import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { listOpenGrievanceCases } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";
import { z } from "zod";

const GrievanceCaseSchema = z.object({
  id: z.string().uuid(),
  employmentId: z.string().uuid(),
  caseType: z.string(),
  openedAt: z.string(),
  status: z.string(),
  resolvedAt: z.string().nullable(),
  resolutionNotes: z.string().nullable(),
});

const ResponseSchema = makeSuccessSchema(
  z.object({ cases: z.array(GrievanceCaseSchema) }),
);

export async function hrListOpenGrievanceCasesRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/hrm/employee-relations/grievance-cases/open",
    {
      schema: {
        description: "List open grievance cases.",
        tags: ["HRM", "Employee Relations"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
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

      const cases = await listOpenGrievanceCases(app.db, { orgId });

      return reply
        .status(200)
        .send({ data: { cases }, correlationId: req.correlationId });
    },
  );
}
