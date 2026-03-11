import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { listRequisitions } from "@afenda/core";
import { ApiErrorResponseSchema, makeSuccessSchema, requireAuth, requireOrg } from "../../../helpers/responses.js";

const QuerySchema = z.object({ status: z.string().optional(), limit: z.coerce.number().int().min(1).max(100).optional(), offset: z.coerce.number().int().min(0).optional() });
const ResponseSchema = makeSuccessSchema(z.object({ items: z.array(z.object({ requisitionId: z.string().uuid(), requisitionNumber: z.string(), requisitionTitle: z.string(), legalEntityId: z.string().uuid(), orgUnitId: z.string().uuid().nullable(), positionId: z.string().uuid().nullable(), hiringManagerEmployeeId: z.string().uuid().nullable(), requestedHeadcount: z.string(), requestedStartDate: z.string().nullable(), status: z.string() })), total: z.number().int(), limit: z.number().int(), offset: z.number().int() }));

export async function hrListRequisitionsRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();
  typed.get("/hrm/requisitions", { schema: { description: "List requisitions.", tags: ["HRM", "Recruitment"], security: [{ bearerAuth: [] }, { devAuth: [] }], querystring: QuerySchema, response: { 200: ResponseSchema, 400: ApiErrorResponseSchema, 401: ApiErrorResponseSchema, 403: ApiErrorResponseSchema, 500: ApiErrorResponseSchema } } }, async (req, reply) => {
    const orgId = requireOrg(req, reply); if (!orgId) return;
    const auth = requireAuth(req, reply); if (!auth) return;
    const data = await listRequisitions(app.db, { orgId, ...req.query });
    return reply.status(200).send({ data, correlationId: req.correlationId });
  });
}