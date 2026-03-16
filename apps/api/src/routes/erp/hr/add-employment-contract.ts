import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  AddEmploymentContractCommandSchema,
  AddEmploymentContractResultSchema,
  DateSchema,
  UuidSchema,
} from "@afenda/contracts";
import { addEmploymentContract } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

// Manual body schema (can't use .omit() or .pick() on schemas with .refine())
const BodySchema = z
  .object({
    contractNumber: z.string().trim().min(1).max(80),
    contractType: z.string().trim().min(1).max(50),
    contractStartDate: DateSchema,
    contractEndDate: DateSchema.optional(),
    documentFileId: UuidSchema.optional(),
  })
  .refine(
    (data) =>
      !data.contractEndDate || data.contractEndDate >= data.contractStartDate,
    { message: "contractEndDate must be >= contractStartDate", path: ["contractEndDate"] },
  );

const ResponseSchema = makeSuccessSchema(AddEmploymentContractResultSchema);

export async function hrAddEmploymentContractRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/hrm/employments/:employmentId/contracts",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description:
          "Add employment contract (addendum/extension). Contract end date must be >= start date if provided.",
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
      const body = req.body as { contractNumber: string; contractType: string; contractStartDate: string; contractEndDate?: string; documentFileId?: string };

      const performedAt = new Date().toISOString();

      const result = await addEmploymentContract(
        app.db,
        orgId,
        auth.principalId,
        req.correlationId,
        performedAt,
        { ...body, employmentId },
      );

      if (!result.ok) {
        const status =
          result.error.code === "HRM_EMPLOYMENT_NOT_FOUND"
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
