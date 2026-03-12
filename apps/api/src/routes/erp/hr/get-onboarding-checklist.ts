import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { getOnboardingChecklist } from "@afenda/core";
import { ApiErrorResponseSchema, makeSuccessSchema, requireAuth, requireOrg } from "../../../helpers/responses.js";

const ParamsSchema = z.object({ planId: z.string().uuid() });
const ResponseSchema = makeSuccessSchema(z.object({ onboardingPlanId: z.string().uuid(), employmentId: z.string().uuid(), status: z.string(), planStatus: z.string(), startDate: z.string().nullable(), targetCompletionDate: z.string().nullable(), completedAt: z.string().nullable(), tasks: z.array(z.object({ onboardingTaskId: z.string().uuid(), taskCode: z.string().nullable(), taskName: z.string(), taskOwnerType: z.string().nullable(), assignedTo: z.string().nullable(), dueDate: z.string().nullable(), completedAt: z.string().nullable(), status: z.string(), taskId: z.string().uuid(), taskTitle: z.string(), ownerEmployeeId: z.string().uuid().nullable(), taskStatus: z.string(), mandatory: z.boolean() })) }));

export async function hrGetOnboardingChecklistRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();
  typed.get("/hrm/onboarding-plans/:planId/checklist", { schema: { description: "Get onboarding checklist.", tags: ["HRM", "Onboarding"], security: [{ bearerAuth: [] }, { devAuth: [] }], params: ParamsSchema, response: { 200: ResponseSchema, 401: ApiErrorResponseSchema, 403: ApiErrorResponseSchema, 404: ApiErrorResponseSchema, 500: ApiErrorResponseSchema } } }, async (req, reply) => {
    const orgId = requireOrg(req, reply); if (!orgId) return;
    const auth = requireAuth(req, reply); if (!auth) return;
    const data = await getOnboardingChecklist(app.db, orgId, req.params.planId);
    if (!data) {
      return reply.status(404).send({ error: { code: "HRM_ONBOARDING_PLAN_NOT_FOUND", message: "Onboarding plan not found" }, correlationId: req.correlationId });
    }
    return reply.status(200).send({ data, correlationId: req.correlationId });
  });

  // Alias path for Wave 1 scaffold route inventory.
  typed.get("/hrm/onboarding-plans/:planId", { schema: { description: "Get onboarding checklist.", tags: ["HRM", "Onboarding"], security: [{ bearerAuth: [] }, { devAuth: [] }], params: ParamsSchema, response: { 200: ResponseSchema, 401: ApiErrorResponseSchema, 403: ApiErrorResponseSchema, 404: ApiErrorResponseSchema, 500: ApiErrorResponseSchema } } }, async (req, reply) => {
    const orgId = requireOrg(req, reply); if (!orgId) return;
    const auth = requireAuth(req, reply); if (!auth) return;
    const data = await getOnboardingChecklist(app.db, orgId, req.params.planId);
    if (!data) {
      return reply.status(404).send({ error: { code: "HRM_ONBOARDING_PLAN_NOT_FOUND", message: "Onboarding plan not found" }, correlationId: req.correlationId });
    }
    return reply.status(200).send({ data, correlationId: req.correlationId });
  });
}