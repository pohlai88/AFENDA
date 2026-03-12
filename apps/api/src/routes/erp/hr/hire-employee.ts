import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { hireEmployee } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireOrg,
  requireAuth,
} from "../../../helpers/responses.js";

const HireEmployeeBodySchema = z.object({
  personId: z.string().uuid(),
  employeeCode: z.string().min(1).max(50).optional(),
  workerType: z.enum(["employee", "contractor", "intern", "director"]),
  legalEntityId: z.string().uuid(),
  employmentType: z.enum(["permanent", "contract", "temporary", "internship", "outsourced"]),
  hireDate: z.string(),
  startDate: z.string(),
  probationEndDate: z.string().optional(),
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

const HireEmployeeResponseSchema = makeSuccessSchema(
  z.object({
    employeeId: z.string().uuid(),
    employmentId: z.string().uuid(),
    workAssignmentId: z.string().uuid(),
    contractId: z.string().uuid().optional(),
    onboardingPlanId: z.string().uuid().optional(),
  }),
);

export async function hrHireEmployeeRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/hrm/employees/hire",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Hire an employee (phase 1 scaffold route).",
        tags: ["HRM", "Core HR"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: HireEmployeeBodySchema,
        response: {
          201: HireEmployeeResponseSchema,
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

      const result = await hireEmployee(
        app.db,
        orgId,
        auth.principalId,
        req.correlationId,
        req.body,
      );

      if (!result.ok) {
        const status =
          result.error.code === "HRM_PERSON_NOT_FOUND"
            ? 404
            : result.error.code === "HRM_EMPLOYEE_ALREADY_EXISTS"
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
