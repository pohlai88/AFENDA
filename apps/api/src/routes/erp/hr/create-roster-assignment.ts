import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { DateSchema } from "@afenda/contracts";
import { createRosterAssignment } from "@afenda/core";
import { z } from "zod";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const BodySchema = z.object({
  employmentId: z.string().uuid(),
  shiftId: z.string().uuid(),
  workDate: DateSchema,
  status: z.string().min(1).max(50).optional(),
});

const ResponseSchema = makeSuccessSchema(
  z.object({
    rosterAssignmentId: z.string().uuid(),
    employmentId: z.string().uuid(),
    shiftId: z.string().uuid(),
    workDate: z.string(),
    status: z.string(),
  }),
);

export async function hrCreateRosterAssignmentRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/hrm/attendance/roster-assignments",
    {
      schema: {
        description: "Create roster assignment.",
        tags: ["HRM", "Attendance"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: BodySchema,
        response: {
          201: ResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
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

      const result = await createRosterAssignment(
        app.db,
        orgId,
        auth.principalId,
        req.correlationId,
        req.body,
      );

      if (!result.ok) {
        const status = result.error.code === "HRM_ROSTER_ASSIGNMENT_OVERLAP" ? 409 : 400;
        return reply.status(status).send({
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.meta,
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(201).send({ data: result.data, correlationId: req.correlationId });
    },
  );
}
