import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  ChangeEmploymentTermsCommandSchema,
  ChangeEmploymentTermsResultSchema,
} from "@afenda/contracts";
import { changeEmploymentTerms } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const BodySchema = ChangeEmploymentTermsCommandSchema.omit({
  idempotencyKey: true,
  employmentId: true,
});

const ResponseSchema = makeSuccessSchema(ChangeEmploymentTermsResultSchema);

export async function hrChangeEmploymentTermsRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/hrm/employments/:employmentId/change-terms",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description:
          "Change employment terms (FTE, probation end date, employment type). At least one of fteRatio, probationEndDate, or employmentType required. When employmentType is 'contract', contract payload is required.",
        tags: ["HRM", "Core HR"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: { employmentId: { type: "string", format: "uuid" } },
        body: BodySchema,
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

      const employmentId = (req.params as { employmentId: string }).employmentId;
      const body = req.body;

      const performedAt = new Date().toISOString();

      const result = await changeEmploymentTerms(
        app.db,
        orgId,
        auth.principalId,
        req.correlationId,
        performedAt,
        { ...body, employmentId },
      );

      if (!result.ok) {
        const status =
          result.error.code === "HRM_EMPLOYMENT_NOT_FOUND" ||
          result.error.code === "HRM_WORK_ASSIGNMENT_NOT_FOUND"
            ? 404
            : result.error.code === "HRM_INVALID_EMPLOYMENT_STATE"
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

      return reply.status(200).send({
        data: result.data,
        correlationId: req.correlationId,
      });
    },
  );
}
