import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { recordWorkPermit } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";
import {
  RecordWorkPermitCommandSchema,
  RecordWorkPermitResultSchema,
} from "@afenda/contracts";

const ResponseSchema = makeSuccessSchema(RecordWorkPermitResultSchema);

export async function hrRecordWorkPermitRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/hrm/compliance/work-permits",
    {
      schema: {
        description: "Record a work permit for an employee.",
        tags: ["HRM", "Compliance"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: RecordWorkPermitCommandSchema,
        response: {
          200: ResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
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

      const result = await recordWorkPermit(
        app.db,
        orgId,
        auth.principalId,
        req.correlationId,
        req.body,
      );

      if (!result.ok) {
        const status =
          result.error.code === "HRM_EMPLOYMENT_NOT_FOUND" ? 404 : 400;
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
