import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { createRequisition } from "@afenda/core";
import { ApiErrorResponseSchema, makeSuccessSchema, requireAuth, requireOrg } from "../../../helpers/responses.js";

const BodySchema = z.object({ requisitionNumber: z.string().min(1).max(50).optional(), requisitionTitle: z.string().min(1).max(255), legalEntityId: z.string().uuid(), orgUnitId: z.string().uuid().optional(), positionId: z.string().uuid().optional(), hiringManagerEmployeeId: z.string().uuid().optional(), requestedHeadcount: z.string().optional(), requestedStartDate: z.string().optional() });
const ResponseSchema = makeSuccessSchema(z.object({ requisitionId: z.string().uuid(), requisitionNumber: z.string() }));

export async function hrCreateRequisitionRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();
  typed.post("/hrm/requisitions", { schema: { description: "Create requisition.", tags: ["HRM", "Recruitment"], security: [{ bearerAuth: [] }, { devAuth: [] }], body: BodySchema, response: { 201: ResponseSchema, 400: ApiErrorResponseSchema, 401: ApiErrorResponseSchema, 403: ApiErrorResponseSchema, 409: ApiErrorResponseSchema, 500: ApiErrorResponseSchema } } }, async (req, reply) => {
    const orgId = requireOrg(req, reply); if (!orgId) return;
    const auth = requireAuth(req, reply); if (!auth) return;
    const result = await createRequisition(app.db, orgId, auth.principalId, req.correlationId, req.body);
    if (!result.ok) {
      const status = result.error.code === "HRM_CONFLICT" ? 409 : 400;
      return reply.status(status).send({ error: { code: result.error.code, message: result.error.message, details: result.error.meta }, correlationId: req.correlationId });
    }
    return reply.status(201).send({ data: result.data, correlationId: req.correlationId });
  });
}