import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { CandidatePipelineItemSchema, CandidatePipelineViewSchema } from "@afenda/contracts";
import { getCandidatePipeline, getCandidatePipelineViewByCandidate } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const ParamsSchema = z.object({ requisitionId: z.string().uuid() });
const ResponseSchema = makeSuccessSchema(z.array(CandidatePipelineItemSchema));
const CandidatePipelineViewResponseSchema = makeSuccessSchema(CandidatePipelineViewSchema);

export async function hrGetCandidatePipelineRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();
  typed.get(
    "/hrm/requisitions/:requisitionId/pipeline",
    {
      schema: {
        description: "Get candidate pipeline for a requisition.",
        tags: ["HRM", "Recruitment"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: ParamsSchema,
        response: {
          200: ResponseSchema,
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
      const data = await getCandidatePipeline(app.db, orgId, req.params.requisitionId);
      return reply.status(200).send({ data, correlationId: req.correlationId });
    },
  );

  // Alias path kept for Wave 1 scaffold route inventory compatibility.
  typed.get(
    "/hrm/candidates/:candidateId/pipeline",
    {
      schema: {
        description: "Get candidate pipeline for a candidate.",
        tags: ["HRM", "Recruitment"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ candidateId: z.string().uuid() }),
        response: {
          200: CandidatePipelineViewResponseSchema,
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
      const data = await getCandidatePipelineViewByCandidate(app.db, orgId, req.params.candidateId);
      if (!data) {
        return reply
          .status(404)
          .send({
            error: { code: "HRM_CANDIDATE_NOT_FOUND", message: "Candidate pipeline not found" },
            correlationId: req.correlationId,
          });
      }
      return reply.status(200).send({ data, correlationId: req.correlationId });
    },
  );
}
