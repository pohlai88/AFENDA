import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { getOrgTree } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const OrgTreeNodeSchema: z.ZodTypeAny = z.lazy(() =>
  z.object({
    orgUnitId: z.string().uuid(),
    orgUnitCode: z.string(),
    orgUnitName: z.string(),
    legalEntityId: z.string().uuid(),
    parentOrgUnitId: z.string().uuid().nullable(),
    status: z.string(),
    children: z.array(OrgTreeNodeSchema),
  }),
);

const GetOrgTreeResponseSchema = makeSuccessSchema(z.array(OrgTreeNodeSchema));

export async function hrGetOrgTreeRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/hrm/org-tree",
    {
      schema: {
        description: "Get org tree.",
        tags: ["HRM", "Organization"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        response: {
          200: GetOrgTreeResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          500: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const data = await getOrgTree(app.db, orgId);

      return reply.status(200).send({ data, correlationId: req.correlationId });
    },
  );
}