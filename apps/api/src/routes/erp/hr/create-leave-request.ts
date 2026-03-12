import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { DateSchema } from "@afenda/contracts";
import { createLeaveRequest } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const BodySchema = z
  .object({
    employmentId: z.string().uuid(),
    leaveTypeId: z.string().uuid(),
    startDate: DateSchema,
    endDate: DateSchema,
    requestedAmount: z.string().min(1),
    reason: z.string().min(1).max(500).optional(),
  })
  .refine((value) => value.startDate <= value.endDate, {
    message: "startDate must be <= endDate",
    path: ["endDate"],
  });

const ResponseSchema = makeSuccessSchema(
  z.object({
    leaveRequestId: z.string().uuid(),
    employmentId: z.string().uuid(),
    leaveTypeId: z.string().uuid(),
    status: z.string(),
  }),
);

export async function hrCreateLeaveRequestRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/hrm/leave/requests",
    {
      schema: {
        description: "Create leave request.",
        tags: ["HRM", "Leave"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: BodySchema,
        response: {
          201: ResponseSchema,
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

      const result = await createLeaveRequest(
        app.db,
        orgId,
        auth.principalId,
        req.correlationId,
        req.body,
      );

      if (!result.ok) {
        return reply.status(400).send({
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
