import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { submitInterviewFeedback } from "@afenda/core";
import { ApiErrorResponseSchema, makeSuccessSchema, requireAuth, requireOrg } from "../../../helpers/responses.js";

const BodySchema = z.object({ interviewId: z.string().uuid(), reviewerEmployeeId: z.string().uuid().optional(), rating: z.number().int().min(1).max(5).optional(), recommendation: z.string().max(50).optional(), feedbackText: z.string().max(4000).optional(), comments: z.string().max(2000).optional(), submittedAt: z.string().optional() });
const ResponseSchema = makeSuccessSchema(z.object({ interviewFeedbackId: z.string().uuid(), interviewId: z.string().uuid(), feedbackId: z.string().uuid() }));

export async function hrSubmitInterviewFeedbackRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();
  typed.post("/hrm/interviews/feedback", { schema: { description: "Submit interview feedback.", tags: ["HRM", "Recruitment"], security: [{ bearerAuth: [] }, { devAuth: [] }], body: BodySchema, response: { 201: ResponseSchema, 400: ApiErrorResponseSchema, 401: ApiErrorResponseSchema, 403: ApiErrorResponseSchema, 404: ApiErrorResponseSchema, 500: ApiErrorResponseSchema } } }, async (req, reply) => {
    const orgId = requireOrg(req, reply); if (!orgId) return;
    const auth = requireAuth(req, reply); if (!auth) return;
    const result = await submitInterviewFeedback(app.db, orgId, auth.principalId, req.correlationId, req.body);
    if (!result.ok) {
      const status = result.error.code === "HRM_INTERVIEW_NOT_FOUND" ? 404 : 400;
      return reply.status(status).send({ error: { code: result.error.code, message: result.error.message, details: result.error.meta }, correlationId: req.correlationId });
    }
    return reply.status(201).send({ data: result.data, correlationId: req.correlationId });
  });

  // Alias path for Wave 1 scaffold route inventory.
  typed.post("/hrm/interviews/:interviewId/feedback", { schema: { description: "Submit interview feedback.", tags: ["HRM", "Recruitment"], security: [{ bearerAuth: [] }, { devAuth: [] }], params: z.object({ interviewId: z.string().uuid() }), body: z.object({ reviewerEmployeeId: z.string().uuid().optional(), rating: z.number().int().min(1).max(5).optional(), recommendation: z.string().max(50).optional(), feedbackText: z.string().max(4000).optional(), comments: z.string().max(2000).optional(), submittedAt: z.string().optional() }), response: { 201: ResponseSchema, 400: ApiErrorResponseSchema, 401: ApiErrorResponseSchema, 403: ApiErrorResponseSchema, 404: ApiErrorResponseSchema, 500: ApiErrorResponseSchema } } }, async (req, reply) => {
    const orgId = requireOrg(req, reply); if (!orgId) return;
    const auth = requireAuth(req, reply); if (!auth) return;
    const result = await submitInterviewFeedback(app.db, orgId, auth.principalId, req.correlationId, { interviewId: req.params.interviewId, ...req.body });
    if (!result.ok) {
      const status = result.error.code === "HRM_INTERVIEW_NOT_FOUND" ? 404 : 400;
      return reply.status(status).send({ error: { code: result.error.code, message: result.error.message, details: result.error.meta }, correlationId: req.correlationId });
    }
    return reply.status(201).send({ data: result.data, correlationId: req.correlationId });
  });
}