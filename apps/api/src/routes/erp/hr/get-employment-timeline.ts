import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { getEmploymentTimeline } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const EmploymentTimelineParamsSchema = z.object({
  employmentId: z.string().uuid(),
});

const EmploymentTimelineResponseSchema = makeSuccessSchema(
  z.object({
    employmentId: z.string().uuid(),
    employeeId: z.string().uuid(),
    employmentNumber: z.string(),
    employmentStatus: z.string(),
    hireDate: z.string().nullable(),
    startDate: z.string().nullable(),
    terminationDate: z.string().nullable(),
    items: z.array(
      z.object({
        kind: z.enum(["employment", "status", "assignment"]),
        occurredAt: z.string(),
        title: z.string(),
        status: z.string().nullable(),
        reasonCode: z.string().nullable(),
        employmentId: z.string().uuid(),
        workAssignmentId: z.string().uuid().nullable(),
        legalEntityId: z.string().uuid().nullable(),
        departmentId: z.string().uuid().nullable(),
        positionId: z.string().uuid().nullable(),
        jobId: z.string().uuid().nullable(),
        gradeId: z.string().uuid().nullable(),
        managerEmployeeId: z.string().uuid().nullable(),
        effectiveTo: z.string().nullable(),
      }),
    ),
  }),
);

export async function hrGetEmploymentTimelineRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/hrm/employments/:employmentId/timeline",
    {
      schema: {
        description: "Get employment timeline.",
        tags: ["HRM", "Core HR"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: EmploymentTimelineParamsSchema,
        response: {
          200: EmploymentTimelineResponseSchema,
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

      const timeline = await getEmploymentTimeline(app.db, orgId, req.params.employmentId);

      if (!timeline) {
        return reply.status(404).send({
          error: {
            code: "HRM_EMPLOYMENT_NOT_FOUND",
            message: "Employment timeline not found",
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({
        data: timeline,
        correlationId: req.correlationId,
      });
    },
  );
}