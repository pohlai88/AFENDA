import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  AddEmployeeDocumentCommandSchema,
  AddEmployeeDocumentResultSchema,
} from "@afenda/contracts";
import { addEmployeeDocument } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const BodySchema = AddEmployeeDocumentCommandSchema.omit({
  idempotencyKey: true,
  employmentId: true,
});

const ResponseSchema = makeSuccessSchema(AddEmployeeDocumentResultSchema);

export async function hrAddEmployeeDocumentRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/hrm/employments/:employmentId/documents",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Add document for an employment (Wave 13 Core HR enhancement).",
        tags: ["HRM", "Core HR"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: { employmentId: { type: "string", format: "uuid" } },
        body: BodySchema,
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

      const employmentId = (req.params as { employmentId: string }).employmentId;
      const body = req.body as z.infer<typeof BodySchema>;

      const result = await addEmployeeDocument(
        app.db,
        orgId,
        auth.principalId,
        req.correlationId,
        { ...body, employmentId },
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

      return reply.status(200).send({
        data: result.data,
        correlationId: req.correlationId,
      });
    },
  );
}
