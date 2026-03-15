import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { recordPolicyAcknowledgement } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";
import {
  RecordPolicyAcknowledgementCommandSchema,
  RecordPolicyAcknowledgementResultSchema,
} from "@afenda/contracts";

const ResponseSchema = makeSuccessSchema(RecordPolicyAcknowledgementResultSchema);

export async function hrRecordPolicyAcknowledgementRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/hrm/compliance/acknowledgements",
    {
      schema: {
        description: "Record a policy acknowledgement by an employee.",
        tags: ["HRM", "Compliance"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: RecordPolicyAcknowledgementCommandSchema,
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

      const result = await recordPolicyAcknowledgement(
        app.db,
        orgId,
        auth.principalId,
        req.correlationId,
        req.body,
      );

      if (!result.ok) {
        const status =
          result.error.code === "HRM_EMPLOYMENT_NOT_FOUND" ||
          result.error.code === "HRM_POLICY_DOCUMENT_NOT_FOUND"
            ? 404
            : result.error.code === "HRM_POLICY_ACKNOWLEDGEMENT_ALREADY_EXISTS"
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
