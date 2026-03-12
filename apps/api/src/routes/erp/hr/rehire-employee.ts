import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { rehireEmployee } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const RehireEmployeeParamsSchema = z.object({
  employeeId: z.string().uuid(),
});

const RehireEmployeeBodySchema = z.object({
  legalEntityId: z.string().uuid(),
  employmentType: z.enum(["permanent", "contract", "temporary", "internship", "outsourced"]),
  hireDate: z.string(),
  startDate: z.string(),
  probationEndDate: z.string().optional(),
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
  changeReason: z.string().max(120).optional(),
  contract: z
    .object({
      contractNumber: z.string().max(80).optional(),
      contractType: z.string().max(50),
      contractStartDate: z.string(),
      contractEndDate: z.string().optional(),
      documentFileId: z.string().uuid().optional(),
    })
    .optional(),
});

const RehireEmployeeResponseSchema = makeSuccessSchema(
  z.object({
    employeeId: z.string().uuid(),
    employmentId: z.string().uuid(),
    workAssignmentId: z.string().uuid(),
    contractId: z.string().uuid().optional(),
  }),
);

export async function hrRehireEmployeeRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/hrm/employees/:employeeId/rehire",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Rehire an employee.",
        tags: ["HRM", "Core HR"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: RehireEmployeeParamsSchema,
        body: RehireEmployeeBodySchema,
        response: {
          201: RehireEmployeeResponseSchema,
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

      const result = await rehireEmployee(app.db, orgId, auth.principalId, req.correlationId, {
        employeeId: req.params.employeeId,
        ...req.body,
      });

      if (!result.ok) {
        const status =
          result.error.code === "HRM_EMPLOYEE_NOT_FOUND"
            ? 404
            : result.error.code === "HRM_EMPLOYMENT_ALREADY_ACTIVE"
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

      return reply.status(201).send({
        data: result.data,
        correlationId: req.correlationId,
      });
    },
  );
}