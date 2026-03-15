import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { OrgTreeNodeSchema } from "@afenda/contracts";
import { getOrgTree } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const GetOrgTreeResponseSchema = makeSuccessSchema(OrgTreeNodeSchema.array());

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
