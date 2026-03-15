import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  RecordPersonIdentityCommandSchema,
  RecordPersonIdentityResultSchema,
} from "@afenda/contracts";
import { recordPersonIdentity } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const RecordPersonIdentityBodySchema = RecordPersonIdentityCommandSchema.omit({
  idempotencyKey: true,
  personId: true,
});

const RecordPersonIdentityResponseSchema = makeSuccessSchema(RecordPersonIdentityResultSchema);

export async function hrRecordPersonIdentityRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/hrm/persons/:personId/identities",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Record a statutory identity for a person (Wave 13 Core HR enhancement).",
        tags: ["HRM", "Core HR"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: { personId: { type: "string", format: "uuid" } },
        body: RecordPersonIdentityBodySchema,
        response: {
          200: RecordPersonIdentityResponseSchema,
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

      const personId = (req.params as { personId: string }).personId;
      const body = req.body as z.infer<typeof RecordPersonIdentityBodySchema>;

      const result = await recordPersonIdentity(
        app.db,
        orgId,
        auth.principalId,
        req.correlationId,
        { ...body, personId },
      );

      if (!result.ok) {
        const status =
          result.error.code === "HRM_PERSON_NOT_FOUND" ? 404 : 400;

        return reply.status(status).send({
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.meta,
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({
        data: result.data,
        correlationId: req.correlationId,
      });
    },
  );
}
