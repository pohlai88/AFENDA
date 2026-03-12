import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { getApplication } from "@afenda/core";
import { ApiErrorResponseSchema, makeSuccessSchema, requireAuth, requireOrg } from "../../../helpers/responses.js";

const ParamsSchema = z.object({ applicationId: z.string().uuid() });
const ResponseSchema = makeSuccessSchema(z.object({ applicationId: z.string().uuid(), candidateId: z.string().uuid(), candidateCode: z.string(), candidateName: z.string(), requisitionId: z.string().uuid(), requisitionNumber: z.string(), requisitionTitle: z.string(), applicationStage: z.string(), appliedAt: z.string().nullable(), rejectedAt: z.string().nullable() }));

export async function hrGetApplicationRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();
  typed.get("/hrm/applications/:applicationId", { schema: { description: "Get application detail.", tags: ["HRM", "Recruitment"], security: [{ bearerAuth: [] }, { devAuth: [] }], params: ParamsSchema, response: { 200: ResponseSchema, 401: ApiErrorResponseSchema, 403: ApiErrorResponseSchema, 404: ApiErrorResponseSchema, 500: ApiErrorResponseSchema } } }, async (req, reply) => {
    const orgId = requireOrg(req, reply); if (!orgId) return;
    const auth = requireAuth(req, reply); if (!auth) return;
    const data = await getApplication(app.db, orgId, req.params.applicationId);
    if (!data) {
      return reply.status(404).send({ error: { code: "HRM_APPLICATION_NOT_FOUND", message: "Application not found" }, correlationId: req.correlationId });
    }
    return reply.status(200).send({ data, correlationId: req.correlationId });
  });
}