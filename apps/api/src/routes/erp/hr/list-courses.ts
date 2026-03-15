import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { listCourses } from "@afenda/core";
import { z } from "zod";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const QuerySchema = z.object({
  courseType: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const CourseSchema = z.object({
  courseId: z.string().uuid(),
  courseCode: z.string(),
  courseName: z.string(),
  courseType: z.string(),
  provider: z.string().nullable(),
  createdAt: z.string(),
});

const ResponseSchema = makeSuccessSchema(
  z.object({ items: z.array(CourseSchema) }),
);

export async function hrListCoursesRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/hrm/learning/courses",
    {
      schema: {
        description: "List learning courses.",
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
      const items = await listCourses(app.db, {
        orgId,
        courseType: qs.courseType,
        limit: qs.limit ?? 20,
        offset: qs.offset ?? 0,
      });

      return reply.status(200).send({ data: { items }, correlationId: req.correlationId });
    },
  );
}
