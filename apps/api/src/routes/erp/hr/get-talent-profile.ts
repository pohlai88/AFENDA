import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { getTalentProfile } from "@afenda/core";
import { z } from "zod";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const ParamsSchema = z.object({ employmentId: z.string().uuid() });

const TalentProfileSchema = z.object({
  talentProfileId: z.string().uuid(),
  employmentId: z.string().uuid(),
  potentialScore: z.number().nullable(),
  readinessScore: z.number().nullable(),
  careerAspiration: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const ResponseSchema = makeSuccessSchema(TalentProfileSchema);

export async function hrGetTalentProfileRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/hrm/talent/profiles/:employmentId",
    {
      schema: {
        description: "Get talent profile by employment ID.",
        tags: ["HRM", "Talent"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: ParamsSchema,
        response: {
          200: ResponseSchema,
          401: ApiErrorResponseSchema,
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

      const params = req.params as { employmentId: string };
      const profile = await getTalentProfile(app.db, {
        orgId,
        employmentId: params.employmentId,
      });

      if (!profile) {
        return reply.status(404).send({
          error: {
            code: "HRM_TALENT_PROFILE_NOT_FOUND",
            message: "Talent profile not found",
            details: { employmentId: params.employmentId },
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({ data: profile, correlationId: req.correlationId });
    },
  );
}
