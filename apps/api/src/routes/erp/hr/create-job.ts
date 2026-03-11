import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { createJob } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const CreateJobBodySchema = z.object({
  jobCode: z.string().min(1).max(50).optional(),
  jobTitle: z.string().min(1).max(255),
  status: z.string().max(50).optional(),
});

const CreateJobResponseSchema = makeSuccessSchema(
  z.object({
    jobId: z.string().uuid(),
    jobCode: z.string(),
  }),
);

export async function hrCreateJobRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/hrm/jobs",
    {
      schema: {
        description: "Create job.",
        tags: ["HRM", "Organization"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreateJobBodySchema,
        response: {
          201: CreateJobResponseSchema,
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

      const result = await createJob(app.db, orgId, auth.principalId, req.correlationId, req.body);

      if (!result.ok) {
        const status = result.error.code === "HRM_CONFLICT" ? 409 : 400;
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