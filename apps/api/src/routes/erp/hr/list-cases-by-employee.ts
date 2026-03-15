import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { listCasesByEmployee } from "@afenda/core";
import { z } from "zod";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const QuerySchema = z.object({
  employmentId: z.string().uuid(),
});

const GrievanceCaseSchema = z.object({
  id: z.string().uuid(),
  employmentId: z.string().uuid(),
  caseType: z.string(),
  openedAt: z.string(),
  status: z.string(),
  resolvedAt: z.string().nullable(),
  resolutionNotes: z.string().nullable(),
});

const DisciplinaryActionSchema = z.object({
  id: z.string().uuid(),
  employmentId: z.string().uuid(),
  actionType: z.string(),
  effectiveDate: z.string(),
  status: z.string(),
  notes: z.string().nullable(),
});

const ResponseSchema = makeSuccessSchema(
  z.object({
    grievanceCases: z.array(GrievanceCaseSchema),
    disciplinaryActions: z.array(DisciplinaryActionSchema),
  }),
);

export async function hrListCasesByEmployeeRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/hrm/employee-relations/cases-by-employee",
    {
      schema: {
        description: "List grievance cases and disciplinary actions for an employee.",
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
      const data = await listCasesByEmployee(app.db, {
        orgId,
        employmentId: qs.employmentId,
      });

      return reply.status(200).send({ data, correlationId: req.correlationId });
    },
  );
}
