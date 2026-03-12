import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { listPendingOnboarding } from "@afenda/core";
import { ApiErrorResponseSchema, makeSuccessSchema, requireAuth, requireOrg } from "../../../helpers/responses.js";

const ResponseSchema = makeSuccessSchema(z.array(z.object({ onboardingPlanId: z.string().uuid(), employmentId: z.string().uuid(), planStatus: z.string(), startDate: z.string().nullable(), targetCompletionDate: z.string().nullable(), pendingMandatoryTasks: z.number().int(), pendingTasks: z.number().int() })));

export async function hrListPendingOnboardingRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();
  typed.get("/hrm/onboarding/pending", { schema: { description: "List pending onboarding plans.", tags: ["HRM", "Onboarding"], security: [{ bearerAuth: [] }, { devAuth: [] }], response: { 200: ResponseSchema, 401: ApiErrorResponseSchema, 403: ApiErrorResponseSchema, 500: ApiErrorResponseSchema } } }, async (req, reply) => {
    const orgId = requireOrg(req, reply); if (!orgId) return;
    const auth = requireAuth(req, reply); if (!auth) return;
    const data = await listPendingOnboarding(app.db, orgId);
    return reply.status(200).send({ data, correlationId: req.correlationId });
  });
}