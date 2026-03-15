import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { HrmPersonAddressSchema } from "@afenda/contracts";
import { listPersonAddresses } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const ResponseSchema = makeSuccessSchema(
  z.object({ items: z.array(HrmPersonAddressSchema) }),
);

export async function hrListPersonAddressesRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/hrm/persons/:personId/addresses",
    {
      schema: {
        description: "List addresses for a person (Wave 13 Core HR enhancement).",
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
      const rows = await listPersonAddresses(app.db, orgId, personId);

      const items = rows.map((r) => ({
        id: r.id,
        orgId: r.orgId,
        personId: r.personId,
        addressType: r.addressType,
        line1: r.line1,
        line2: r.line2,
        city: r.city,
        stateProvince: r.stateProvince,
        postalCode: r.postalCode,
        countryCode: r.countryCode,
        isPrimary: r.isPrimary,
      }));

      return reply.status(200).send({
        data: { items },
        correlationId: req.correlationId,
      });
    },
  );
}
