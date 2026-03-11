import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { createPerson } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const CreatePersonBodySchema = z.object({
  personCode: z.string().min(1).max(50).optional(),
  legalName: z.string().min(1).max(255),
  preferredName: z.string().max(255).optional(),
  firstName: z.string().min(1).max(120),
  middleName: z.string().max(120).optional(),
  lastName: z.string().min(1).max(120),
  displayName: z.string().max(255).optional(),
  birthDate: z.string().optional(),
  genderCode: z.string().max(50).optional(),
  maritalStatusCode: z.string().max(50).optional(),
  nationalityCountryCode: z.string().max(3).optional(),
  personalEmail: z.string().email().optional(),
  mobilePhone: z.string().max(50).optional(),
});

const CreatePersonResponseSchema = makeSuccessSchema(
  z.object({
    personId: z.string().uuid(),
    personCode: z.string(),
  }),
);

export async function hrCreatePersonRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/hrm/people",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Create person (phase 1 scaffold route).",
        tags: ["HRM", "Core HR"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreatePersonBodySchema,
        response: {
          201: CreatePersonResponseSchema,
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

      const result = await createPerson(
        app.db,
        orgId,
        auth.principalId,
        req.correlationId,
        req.body,
      );

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

      return reply.status(201).send({
        data: result.data,
        correlationId: req.correlationId,
      });
    },
  );
}