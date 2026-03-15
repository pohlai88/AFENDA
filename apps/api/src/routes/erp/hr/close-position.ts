import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { ClosePositionCommandSchema, ClosePositionResultSchema } from "@afenda/contracts";
import { closePosition } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const ClosePositionParamsSchema = z.object({
  positionId: z.string().uuid(),
});

const ClosePositionBodySchema = ClosePositionCommandSchema.omit({
  idempotencyKey: true,
  positionId: true,
});

const ClosePositionResponseSchema = makeSuccessSchema(ClosePositionResultSchema);

export async function hrClosePositionRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/hrm/positions/:positionId/close",
    {
      schema: {
        description: "Close position.",
        tags: ["HRM", "Organization"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: ClosePositionParamsSchema,
        body: ClosePositionBodySchema,
        response: {
          200: ClosePositionResponseSchema,
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

      const result = await closePosition(app.db, orgId, auth.principalId, req.correlationId, {
        positionId: req.params.positionId,
        ...req.body,
      });

      if (!result.ok) {
        const status = result.error.code === "HRM_POSITION_NOT_FOUND" ? 404 : 400;
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
