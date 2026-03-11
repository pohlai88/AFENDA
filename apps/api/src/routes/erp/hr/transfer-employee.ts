import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { transferEmployee } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const TransferEmployeeBodySchema = z.object({
  employmentId: z.string().uuid(),
  effectiveFrom: z.string(),
  legalEntityId: z.string().uuid(),
  businessUnitId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  costCenterId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  positionId: z.string().uuid().optional(),
  jobId: z.string().uuid().optional(),
  gradeId: z.string().uuid().optional(),
  managerEmployeeId: z.string().uuid().optional(),
  workScheduleId: z.string().uuid().optional(),
  employmentClass: z.string().max(50).optional(),
  fteRatio: z.string().max(20).optional(),
  changeReason: z.string().min(1).max(120),
});

const TransferEmployeeResponseSchema = makeSuccessSchema(
  z.object({
    previousWorkAssignmentId: z.string().uuid(),
    newWorkAssignmentId: z.string().uuid(),
  }),
);

export async function hrTransferEmployeeRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/hrm/employments/transfer",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Transfer employee (phase 1 scaffold route).",
        tags: ["HRM", "Core HR"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: TransferEmployeeBodySchema,
        response: {
          200: TransferEmployeeResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
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

      const result = await transferEmployee(
        app.db,
        orgId,
        auth.principalId,
        req.correlationId,
        req.body,
      );

      if (!result.ok) {
        const status =
          result.error.code === "HRM_EMPLOYMENT_NOT_FOUND" ||
          result.error.code === "HRM_WORK_ASSIGNMENT_NOT_FOUND"
            ? 404
            : result.error.code === "HRM_WORK_ASSIGNMENT_OVERLAP" ||
                result.error.code === "HRM_INVALID_EMPLOYMENT_STATE"
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