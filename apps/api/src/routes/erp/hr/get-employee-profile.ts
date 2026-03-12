import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { getEmployeeProfile } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const EmployeeProfileParamsSchema = z.object({
  employeeId: z.string().uuid(),
});

const EmployeeProfileResponseSchema = makeSuccessSchema(
  z.object({
    employeeId: z.string().uuid(),
    employeeCode: z.string(),
    personId: z.string().uuid(),
    displayName: z.string(),
    legalName: z.string(),
    personalEmail: z.string().nullable(),
    mobilePhone: z.string().nullable(),
    currentStatus: z.string(),
    workerType: z.string(),
    employmentId: z.string().uuid().nullable(),
    employmentNumber: z.string().nullable(),
    employmentStatus: z.string().nullable(),
    legalEntityId: z.string().uuid().nullable(),
    hireDate: z.string().nullable(),
    startDate: z.string().nullable(),
    terminationDate: z.string().nullable(),
    workAssignmentId: z.string().uuid().nullable(),
    departmentId: z.string().uuid().nullable(),
    departmentName: z.string().nullable(),
    positionId: z.string().uuid().nullable(),
    positionTitle: z.string().nullable(),
    jobId: z.string().uuid().nullable(),
    gradeId: z.string().uuid().nullable(),
    managerEmployeeId: z.string().uuid().nullable(),
    managerEmployeeCode: z.string().nullable(),
    managerDisplayName: z.string().nullable(),
  }),
);

export async function hrGetEmployeeProfileRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/hrm/employees/:employeeId",
    {
      schema: {
        description: "Get employee profile (phase 1 scaffold route).",
        tags: ["HRM", "Core HR"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: EmployeeProfileParamsSchema,
        response: {
          200: EmployeeProfileResponseSchema,
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

      const profile = await getEmployeeProfile(app.db, orgId, req.params.employeeId);

      if (!profile) {
        return reply.status(404).send({
          error: {
            code: "HRM_EMPLOYEE_NOT_FOUND",
            message: "Employee profile not found",
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({
        data: profile,
        correlationId: req.correlationId,
      });
    },
  );
}