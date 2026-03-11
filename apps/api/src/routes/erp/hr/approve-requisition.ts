import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { approveRequisition } from "@afenda/core";
import { ApiErrorResponseSchema, makeSuccessSchema, requireAuth, requireOrg } from "../../../helpers/responses.js";

const ParamsSchema = z.object({ requisitionId: z.string().uuid() });
const ResponseSchema = makeSuccessSchema(z.object({ requisitionId: z.string().uuid(), previousStatus: z.string(), currentStatus: z.string() }));

export async function hrApproveRequisitionRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();
  typed.post("/hrm/requisitions/:requisitionId/approve", { schema: { description: "Approve requisition.", tags: ["HRM", "Recruitment"], security: [{ bearerAuth: [] }, { devAuth: [] }], params: ParamsSchema, response: { 200: ResponseSchema, 400: ApiErrorResponseSchema, 401: ApiErrorResponseSchema, 403: ApiErrorResponseSchema, 404: ApiErrorResponseSchema, 500: ApiErrorResponseSchema } } }, async (req, reply) => {
    const orgId = requireOrg(req, reply); if (!orgId) return;
    const auth = requireAuth(req, reply); if (!auth) return;
    const result = await approveRequisition(app.db, orgId, auth.principalId, req.correlationId, { requisitionId: req.params.requisitionId });
    if (!result.ok) {
      const status = result.error.code === "HRM_REQUISITION_NOT_FOUND" ? 404 : 400;
      return reply.status(status).send({ error: { code: result.error.code, message: result.error.message, details: result.error.meta }, correlationId: req.correlationId });
    }
    return reply.status(200).send({ data: result.data, correlationId: req.correlationId });
  });
}