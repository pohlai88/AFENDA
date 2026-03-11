import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { getCandidatePipeline } from "@afenda/core";
import { ApiErrorResponseSchema, makeSuccessSchema, requireAuth, requireOrg } from "../../../helpers/responses.js";

const ParamsSchema = z.object({ requisitionId: z.string().uuid() });
const ResponseSchema = makeSuccessSchema(z.array(z.object({ applicationId: z.string().uuid(), candidateId: z.string().uuid(), candidateCode: z.string(), fullName: z.string(), applicationStage: z.string(), appliedAt: z.string().nullable(), interviewId: z.string().uuid().nullable(), interviewType: z.string().nullable(), interviewStatus: z.string().nullable(), feedbackId: z.string().uuid().nullable(), recommendation: z.string().nullable(), offerId: z.string().uuid().nullable(), offerNumber: z.string().nullable(), offerStatus: z.string().nullable() })));

export async function hrGetCandidatePipelineRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();
  typed.get("/hrm/requisitions/:requisitionId/pipeline", { schema: { description: "Get candidate pipeline for a requisition.", tags: ["HRM", "Recruitment"], security: [{ bearerAuth: [] }, { devAuth: [] }], params: ParamsSchema, response: { 200: ResponseSchema, 401: ApiErrorResponseSchema, 403: ApiErrorResponseSchema, 500: ApiErrorResponseSchema } } }, async (req, reply) => {
    const orgId = requireOrg(req, reply); if (!orgId) return;
    const auth = requireAuth(req, reply); if (!auth) return;
    const data = await getCandidatePipeline(app.db, orgId, req.params.requisitionId);
    return reply.status(200).send({ data, correlationId: req.correlationId });
  });
}