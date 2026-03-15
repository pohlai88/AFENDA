import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { RequisitionListItemSchema } from "@afenda/contracts";
import { listRequisitions } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const ParamsSchema = z.object({ requisitionId: z.string().uuid() });
const ResponseSchema = makeSuccessSchema(RequisitionListItemSchema);

export async function hrGetRequisitionRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();
  typed.get(
    "/hrm/requisitions/:requisitionId",
    {
      schema: {
        description: "Get requisition detail.",
        tags: ["HRM", "Recruitment"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: ParamsSchema,
        response: {
          200: ResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          500: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;
      const data = await listRequisitions(app.db, {
        orgId,
        requisitionId: req.params.requisitionId,
        limit: 1,
        offset: 0,
      });
      const row = data.items[0] ?? null;
      if (!row) {
        return reply
          .status(404)
          .send({
            error: { code: "HRM_REQUISITION_NOT_FOUND", message: "Requisition not found" },
            correlationId: req.correlationId,
          });
      }
      return reply.status(200).send({ data: row, correlationId: req.correlationId });
    },
  );
}
