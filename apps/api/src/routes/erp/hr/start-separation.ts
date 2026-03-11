import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { startSeparation } from "@afenda/core";
import { ApiErrorResponseSchema, makeSuccessSchema, requireAuth, requireOrg } from "../../../helpers/responses.js";

const ItemSchema = z.object({ itemCode: z.string().max(80).optional(), itemLabel: z.string().min(1).max(255), ownerEmployeeId: z.string().uuid().optional(), mandatory: z.boolean().optional() });
const BodySchema = z.object({ employmentId: z.string().uuid(), separationType: z.string().max(50).optional(), initiatedAt: z.string().optional(), targetLastWorkingDate: z.string().optional(), items: z.array(ItemSchema).optional() });
const ResponseSchema = makeSuccessSchema(z.object({ separationCaseId: z.string().uuid(), itemIds: z.array(z.string().uuid()) }));

export async function hrStartSeparationRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();
  typed.post("/hrm/separation-cases", { schema: { description: "Start separation case.", tags: ["HRM", "Onboarding"], security: [{ bearerAuth: [] }, { devAuth: [] }], body: BodySchema, response: { 201: ResponseSchema, 400: ApiErrorResponseSchema, 401: ApiErrorResponseSchema, 403: ApiErrorResponseSchema, 404: ApiErrorResponseSchema, 500: ApiErrorResponseSchema } } }, async (req, reply) => {
    const orgId = requireOrg(req, reply); if (!orgId) return;
    const auth = requireAuth(req, reply); if (!auth) return;
    const result = await startSeparation(app.db, orgId, auth.principalId, req.correlationId, req.body);
    if (!result.ok) {
      const status = result.error.code === "HRM_EMPLOYMENT_NOT_FOUND" ? 404 : 400;
      return reply.status(status).send({ error: { code: result.error.code, message: result.error.message, details: result.error.meta }, correlationId: req.correlationId });
    }
    return reply.status(201).send({ data: result.data, correlationId: req.correlationId });
  });
}