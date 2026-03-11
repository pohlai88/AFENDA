import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { listEmployees } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const ListEmployeesQuerySchema = z.object({
  search: z.string().optional(),
  employmentStatus: z.string().optional(),
  workerType: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const ListEmployeesResponseSchema = makeSuccessSchema(
  z.object({
    items: z.array(
      z.object({
        employeeId: z.string().uuid(),
        employeeCode: z.string(),
        displayName: z.string(),
        workerType: z.string(),
        currentStatus: z.string(),
        employmentId: z.string().uuid().nullable(),
        employmentStatus: z.string().nullable(),
        legalEntityId: z.string().uuid().nullable(),
        departmentId: z.string().uuid().nullable(),
        positionId: z.string().uuid().nullable(),
        managerEmployeeId: z.string().uuid().nullable(),
      }),
    ),
    total: z.number().int(),
    limit: z.number().int(),
    offset: z.number().int(),
  }),
);

export async function hrListEmployeesRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/hrm/employees",
    {
      schema: {
        description: "List employees (phase 1 scaffold route).",
        tags: ["HRM", "Core HR"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: ListEmployeesQuerySchema,
        response: {
          200: ListEmployeesResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          500: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await listEmployees(app.db, {
        orgId,
        ...req.query,
      });

      return reply.status(200).send({
        data: result,
        correlationId: req.correlationId,
      });
    },
  );
}