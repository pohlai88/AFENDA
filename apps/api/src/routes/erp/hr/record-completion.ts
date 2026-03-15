import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { recordCompletion } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";
import { z } from "zod";
import {
  RecordCompletionCommandSchema,
  RecordCompletionResultSchema,
} from "@afenda/contracts";

const ResponseSchema = makeSuccessSchema(RecordCompletionResultSchema);

export async function hrRecordCompletionRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/hrm/learning/enrollments/:enrollmentId/complete",
    {
      schema: {
        description: "Record completion of a learning enrollment.",
        tags: ["HRM", "Learning"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ enrollmentId: z.string().uuid() }),
        body: RecordCompletionCommandSchema.omit({ enrollmentId: true }),
        response: {
          200: ResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
          500: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;

      const auth = requireAuth(req, reply);
      if (!auth) return;

      const params = req.params as { enrollmentId: string };

      const result = await recordCompletion(
        app.db,
        orgId,
        auth.principalId,
        req.correlationId,
        { enrollmentId: params.enrollmentId },
      );

      if (!result.ok) {
        const status =
          result.error.code === "HRM_ENROLLMENT_NOT_FOUND"
            ? 404
            : result.error.code === "HRM_CONFLICT"
              ? 409
              : 400;
        return reply.status(status).send({
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
