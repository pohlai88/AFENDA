import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { DateSchema } from "@afenda/contracts";
import { listRosterAssignments } from "@afenda/core";
import { z } from "zod";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const QuerySchema = z.object({
  employmentId: z.string().uuid().optional(),
  shiftId: z.string().uuid().optional(),
  status: z.string().min(1).max(50).optional(),
  workDateFrom: DateSchema.optional(),
  workDateTo: DateSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const ResponseSchema = makeSuccessSchema(
  z.object({
    items: z.array(
      z.object({
        rosterAssignmentId: z.string().uuid(),
        employmentId: z.string().uuid(),
        shiftId: z.string().uuid(),
        workDate: z.string(),
        status: z.string(),
      }),
    ),
    total: z.number().int(),
    limit: z.number().int(),
    offset: z.number().int(),
  }),
);

export async function hrListRosterAssignmentsRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/hrm/attendance/roster-assignments",
    {
      schema: {
        description: "List roster assignments.",
        tags: ["HRM", "Attendance"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: QuerySchema,
        response: {
          200: ResponseSchema,
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

      const data = await listRosterAssignments(app.db, { orgId, ...req.query });
      return reply.status(200).send({ data, correlationId: req.correlationId });
    },
  );
}
