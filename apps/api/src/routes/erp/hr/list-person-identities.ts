import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { HrmPersonIdentitySchema } from "@afenda/contracts";
import { listPersonIdentities } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const ResponseSchema = makeSuccessSchema(
  z.object({ items: z.array(HrmPersonIdentitySchema) }),
);

export async function hrListPersonIdentitiesRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/hrm/persons/:personId/identities",
    {
      schema: {
        description: "List statutory identities for a person (Wave 13 Core HR enhancement).",
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
      const rows = await listPersonIdentities(app.db, orgId, personId);

      const items = rows.map((r) => ({
        id: r.id,
        orgId,
        personId: r.personId,
        identityType: r.identityType,
        identityNumber: r.identityNumber,
        issuingCountryCode: r.issuingCountryCode,
        issuedAt: r.issuedAt ? r.issuedAt.toISOString().slice(0, 10) : null,
        expiresAt: r.expiresAt ? r.expiresAt.toISOString().slice(0, 10) : null,
        isPrimary: r.isPrimary,
        verificationStatus: r.verificationStatus,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }));

      return reply.status(200).send({
        data: { items },
        correlationId: req.correlationId,
      });
    },
  );
}
