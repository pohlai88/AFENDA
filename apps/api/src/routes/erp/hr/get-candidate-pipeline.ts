import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  getCandidatePipeline,
  getCandidatePipelineViewByCandidate,
} from "@afenda/core";
import { ApiErrorResponseSchema, makeSuccessSchema, requireAuth, requireOrg } from "../../../helpers/responses.js";

const ParamsSchema = z.object({ requisitionId: z.string().uuid() });
const ResponseSchema = makeSuccessSchema(z.array(z.object({ applicationId: z.string().uuid(), candidateId: z.string().uuid(), candidateCode: z.string(), fullName: z.string(), applicationStage: z.string(), appliedAt: z.string().nullable(), interviewId: z.string().uuid().nullable(), interviewType: z.string().nullable(), interviewStatus: z.string().nullable(), feedbackId: z.string().uuid().nullable(), recommendation: z.string().nullable(), offerId: z.string().uuid().nullable(), offerNumber: z.string().nullable(), offerStatus: z.string().nullable() })));
const CandidatePipelineViewResponseSchema = makeSuccessSchema(z.object({ candidateId: z.string().uuid(), candidateCode: z.string(), fullName: z.string(), currentStatus: z.string(), applications: z.array(z.object({ applicationId: z.string().uuid(), requisitionId: z.string().uuid(), stageCode: z.string(), applicationStatus: z.string(), interviews: z.array(z.object({ interviewId: z.string().uuid(), interviewType: z.string(), scheduledAt: z.string(), status: z.string() })), offers: z.array(z.object({ offerId: z.string().uuid(), offerNumber: z.string(), offerStatus: z.string(), proposedStartDate: z.string().nullable() })) })) }));

export async function hrGetCandidatePipelineRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();
  typed.get("/hrm/requisitions/:requisitionId/pipeline", { schema: { description: "Get candidate pipeline for a requisition.", tags: ["HRM", "Recruitment"], security: [{ bearerAuth: [] }, { devAuth: [] }], params: ParamsSchema, response: { 200: ResponseSchema, 401: ApiErrorResponseSchema, 403: ApiErrorResponseSchema, 500: ApiErrorResponseSchema } } }, async (req, reply) => {
    const orgId = requireOrg(req, reply); if (!orgId) return;
    const auth = requireAuth(req, reply); if (!auth) return;
    const data = await getCandidatePipeline(app.db, orgId, req.params.requisitionId);
    return reply.status(200).send({ data, correlationId: req.correlationId });
  });

  // Alias path kept for Wave 1 scaffold route inventory compatibility.
  typed.get("/hrm/candidates/:candidateId/pipeline", { schema: { description: "Get candidate pipeline for a candidate.", tags: ["HRM", "Recruitment"], security: [{ bearerAuth: [] }, { devAuth: [] }], params: z.object({ candidateId: z.string().uuid() }), response: { 200: CandidatePipelineViewResponseSchema, 401: ApiErrorResponseSchema, 403: ApiErrorResponseSchema, 404: ApiErrorResponseSchema, 500: ApiErrorResponseSchema } } }, async (req, reply) => {
    const orgId = requireOrg(req, reply); if (!orgId) return;
    const auth = requireAuth(req, reply); if (!auth) return;
    const data = await getCandidatePipelineViewByCandidate(app.db, orgId, req.params.candidateId);
    if (!data) {
      return reply.status(404).send({ error: { code: "HRM_CANDIDATE_NOT_FOUND", message: "Candidate pipeline not found" }, correlationId: req.correlationId });
    }
    return reply.status(200).send({ data, correlationId: req.correlationId });
  });
}