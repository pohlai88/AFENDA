import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  CompleteOnboardingTaskCommandSchema,
  CompleteOnboardingTaskResultSchema,
} from "@afenda/contracts";
import { completeOnboardingTask } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const ParamsSchema = z.object({ taskId: z.string().uuid() });
const BodySchema = CompleteOnboardingTaskCommandSchema.omit({
  idempotencyKey: true,
  onboardingTaskId: true,
});
const ResponseSchema = makeSuccessSchema(CompleteOnboardingTaskResultSchema);

export async function hrCompleteOnboardingTaskRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();
  typed.post(
    "/hrm/onboarding-tasks/:taskId/complete",
    {
      schema: {
        description: "Complete onboarding task.",
        tags: ["HRM", "Onboarding"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: ParamsSchema,
        body: BodySchema,
        response: {
          200: ResponseSchema,
          400: ApiErrorResponseSchema,
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
      const result = await completeOnboardingTask(
        app.db,
        orgId,
        auth.principalId,
        req.correlationId,
        { onboardingTaskId: req.params.taskId, ...req.body },
      );
      if (!result.ok) {
        const status = result.error.code === "HRM_ONBOARDING_TASK_NOT_FOUND" ? 404 : 400;
        return reply
          .status(status)
          .send({
            error: {
              code: result.error.code,
              message: result.error.message,
              details: result.error.meta,
            },
            correlationId: req.correlationId,
          });
      }
      return reply.status(200).send({ data: result.data, correlationId: req.correlationId });
    },
  );
}
