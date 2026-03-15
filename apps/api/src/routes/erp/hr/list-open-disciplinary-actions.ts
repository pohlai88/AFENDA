import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { listOpenDisciplinaryActions } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";
import { z } from "zod";

const DisciplinaryActionSchema = z.object({
  id: z.string().uuid(),
  employmentId: z.string().uuid(),
  actionType: z.string(),
  effectiveDate: z.string(),
  status: z.string(),
  notes: z.string().nullable(),
});

const ResponseSchema = makeSuccessSchema(
  z.object({ actions: z.array(DisciplinaryActionSchema) }),
);

export async function hrListOpenDisciplinaryActionsRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/hrm/employee-relations/disciplinary-actions/open",
    {
      schema: {
        description: "List open disciplinary actions (draft or active).",
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

      const actions = await listOpenDisciplinaryActions(app.db, { orgId });

      return reply
        .status(200)
        .send({ data: { actions }, correlationId: req.correlationId });
    },
  );
}
