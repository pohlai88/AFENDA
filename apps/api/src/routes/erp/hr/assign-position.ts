import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { AssignPositionCommandSchema, AssignPositionResultSchema } from "@afenda/contracts";
import { assignPosition } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const ParamsSchema = z.object({ positionId: z.string().uuid() });
const BodySchema = AssignPositionCommandSchema.omit({ idempotencyKey: true, positionId: true });
const ResponseSchema = makeSuccessSchema(AssignPositionResultSchema);

export async function hrAssignPositionRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();
  typed.post(
    "/hrm/positions/:positionId/assign",
    {
      schema: {
        description: "Assign employment to position.",
        tags: ["HRM", "Organization"],
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
      const result = await assignPosition(app.db, orgId, auth.principalId, req.correlationId, {
        positionId: req.params.positionId,
        ...req.body,
      });
      if (!result.ok) {
        const status =
          result.error.code === "HRM_POSITION_NOT_FOUND" ||
          result.error.code === "HRM_EMPLOYMENT_NOT_FOUND"
            ? 404
            : 400;
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
