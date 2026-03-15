import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { attachEvidence } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";
import { AttachEvidenceCommandSchema, AttachEvidenceResultSchema } from "@afenda/contracts";

const ResponseSchema = makeSuccessSchema(AttachEvidenceResultSchema);

export async function hrAttachEvidenceRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/hrm/employee-relations/evidence",
    {
      schema: {
        description: "Attach evidence to a grievance case or disciplinary action.",
        tags: ["HRM", "Employee Relations"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: AttachEvidenceCommandSchema,
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

      const result = await attachEvidence(
        app.db,
        orgId,
        auth.principalId,
        req.correlationId,
        req.body,
      );

      if (!result.ok) {
        const status =
          result.error.code === "HRM_GRIEVANCE_CASE_NOT_FOUND" ||
          result.error.code === "HRM_DISCIPLINARY_ACTION_NOT_FOUND"
            ? 404
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
