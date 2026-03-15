import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { listEnrollments } from "@afenda/core";
import { z } from "zod";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const QuerySchema = z.object({
  employmentId: z.string().uuid().optional(),
  courseId: z.string().uuid().optional(),
  status: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const EnrollmentSchema = z.object({
  enrollmentId: z.string().uuid(),
  employmentId: z.string().uuid(),
  courseId: z.string().uuid(),
  courseCode: z.string(),
  courseName: z.string(),
  sessionId: z.string().uuid().nullable(),
  status: z.string(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
});

const ResponseSchema = makeSuccessSchema(
  z.object({ items: z.array(EnrollmentSchema) }),
);

export async function hrListEnrollmentsRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/hrm/learning/enrollments",
    {
      schema: {
        description: "List learning enrollments.",
        tags: ["HRM", "Learning"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: QuerySchema,
        response: {
          200: ResponseSchema,
          401: ApiErrorResponseSchema,
          500: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;

      const auth = requireAuth(req, reply);
      if (!auth) return;

      const qs = req.query as z.infer<typeof QuerySchema>;
      const items = await listEnrollments(app.db, {
        orgId,
        employmentId: qs.employmentId,
        courseId: qs.courseId,
        status: qs.status,
        limit: qs.limit ?? 20,
        offset: qs.offset ?? 0,
      });

      return reply.status(200).send({ data: { items }, correlationId: req.correlationId });
    },
  );
}
