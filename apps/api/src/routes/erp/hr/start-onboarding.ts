import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { startOnboarding } from "@afenda/core";
import { ApiErrorResponseSchema, makeSuccessSchema, requireAuth, requireOrg } from "../../../helpers/responses.js";

const TaskSchema = z.object({ taskCode: z.string().max(80).optional(), taskTitle: z.string().min(1).max(255), ownerEmployeeId: z.string().uuid().optional(), dueDate: z.string().optional(), mandatory: z.boolean().optional() });
const BodySchema = z.object({ employmentId: z.string().uuid(), templateId: z.string().uuid().optional(), startDate: z.string().optional(), targetCompletionDate: z.string().optional(), tasks: z.array(TaskSchema).optional() });
const ResponseSchema = makeSuccessSchema(z.object({ onboardingPlanId: z.string().uuid(), taskIds: z.array(z.string().uuid()) }));

export async function hrStartOnboardingRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();
  typed.post("/hrm/onboarding-plans", { schema: { description: "Start onboarding plan.", tags: ["HRM", "Onboarding"], security: [{ bearerAuth: [] }, { devAuth: [] }], body: BodySchema, response: { 201: ResponseSchema, 400: ApiErrorResponseSchema, 401: ApiErrorResponseSchema, 403: ApiErrorResponseSchema, 404: ApiErrorResponseSchema, 500: ApiErrorResponseSchema } } }, async (req, reply) => {
    const orgId = requireOrg(req, reply); if (!orgId) return;
    const auth = requireAuth(req, reply); if (!auth) return;
    const result = await startOnboarding(app.db, orgId, auth.principalId, req.correlationId, req.body);
    if (!result.ok) {
      const status = result.error.code === "HRM_EMPLOYMENT_NOT_FOUND" ? 404 : 400;
      return reply.status(status).send({ error: { code: result.error.code, message: result.error.message, details: result.error.meta }, correlationId: req.correlationId });
    }
    return reply.status(201).send({ data: result.data, correlationId: req.correlationId });
  });
}