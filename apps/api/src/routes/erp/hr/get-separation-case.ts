import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { getSeparationCase } from "@afenda/core";
import { ApiErrorResponseSchema, makeSuccessSchema, requireAuth, requireOrg } from "../../../helpers/responses.js";

const ParamsSchema = z.object({ caseId: z.string().uuid() });
const ResponseSchema = makeSuccessSchema(z.object({ separationCaseId: z.string().uuid(), caseNumber: z.string(), employmentId: z.string().uuid(), separationType: z.string().nullable(), lastWorkingDate: z.string(), noticeGivenAt: z.string().nullable(), reasonCode: z.string().nullable(), status: z.string(), caseStatus: z.string(), initiatedAt: z.string().nullable(), targetLastWorkingDate: z.string().nullable(), closedAt: z.string().nullable(), clearanceItems: z.array(z.object({ exitClearanceItemId: z.string().uuid(), clearanceType: z.string(), ownerDepartment: z.string().nullable(), status: z.string(), clearedAt: z.string().nullable() })), items: z.array(z.object({ itemId: z.string().uuid(), itemCode: z.string().nullable(), itemLabel: z.string(), ownerEmployeeId: z.string().uuid().nullable(), mandatory: z.boolean(), clearanceStatus: z.string(), exitClearanceItemId: z.string().uuid(), clearanceType: z.string(), ownerDepartment: z.string().nullable(), status: z.string(), clearedAt: z.string().nullable() })) }));

export async function hrGetSeparationCaseRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();
  typed.get("/hrm/separation-cases/:caseId", { schema: { description: "Get separation case.", tags: ["HRM", "Onboarding"], security: [{ bearerAuth: [] }, { devAuth: [] }], params: ParamsSchema, response: { 200: ResponseSchema, 401: ApiErrorResponseSchema, 403: ApiErrorResponseSchema, 404: ApiErrorResponseSchema, 500: ApiErrorResponseSchema } } }, async (req, reply) => {
    const orgId = requireOrg(req, reply); if (!orgId) return;
    const auth = requireAuth(req, reply); if (!auth) return;
    const data = await getSeparationCase(app.db, orgId, req.params.caseId);
    if (!data) {
      return reply.status(404).send({ error: { code: "HRM_SEPARATION_CASE_NOT_FOUND", message: "Separation case not found" }, correlationId: req.correlationId });
    }
    return reply.status(200).send({ data, correlationId: req.correlationId });
  });
}