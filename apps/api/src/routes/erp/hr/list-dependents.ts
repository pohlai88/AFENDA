import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { HrmDependentSchema } from "@afenda/contracts";
import { listDependents } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const ResponseSchema = makeSuccessSchema(
  z.object({ items: z.array(HrmDependentSchema) }),
);

export async function hrListDependentsRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/hrm/persons/:personId/dependents",
    {
      schema: {
        description: "List dependents for a person (Wave 13 Core HR enhancement).",
        tags: ["HRM", "Core HR"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: { personId: { type: "string", format: "uuid" } },
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

      const personId = (req.params as { personId: string }).personId;
      const rows = await listDependents(app.db, orgId, personId);

      const items = rows.map((r) => ({
        id: r.id,
        orgId: r.orgId,
        personId: r.personId,
        dependentName: r.dependentName,
        relationship: r.relationship,
        birthDate: r.birthDate ? r.birthDate.toISOString().slice(0, 10) : null,
      }));

      return reply.status(200).send({
        data: { items },
        correlationId: req.correlationId,
      });
    },
  );
}
