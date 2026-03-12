import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { acceptOffer } from "@afenda/core";
import { ApiErrorResponseSchema, makeSuccessSchema, requireAuth, requireOrg } from "../../../helpers/responses.js";

const ParamsSchema = z.object({ offerId: z.string().uuid() });
const BodySchema = z.object({
  acceptedAt: z.string(),
  autoStartOnboarding: z.boolean().optional(),
  onboardingTemplateId: z.string().uuid().optional(),
});
const ResponseSchema = makeSuccessSchema(
  z.object({
    offerId: z.string().uuid(),
    offerStatus: z.string(),
    acceptedAt: z.string(),
    onboardingPlanId: z.string().uuid().optional(),
  }),
);

export async function hrAcceptOfferRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();
  typed.post("/hrm/offers/:offerId/accept", { schema: { description: "Accept offer.", tags: ["HRM", "Recruitment"], security: [{ bearerAuth: [] }, { devAuth: [] }], params: ParamsSchema, body: BodySchema, response: { 200: ResponseSchema, 400: ApiErrorResponseSchema, 401: ApiErrorResponseSchema, 403: ApiErrorResponseSchema, 404: ApiErrorResponseSchema, 500: ApiErrorResponseSchema } } }, async (req, reply) => {
    const orgId = requireOrg(req, reply); if (!orgId) return;
    const auth = requireAuth(req, reply); if (!auth) return;
    const result = await acceptOffer(app.db, orgId, auth.principalId, req.correlationId, { offerId: req.params.offerId, ...req.body });
    if (!result.ok) {
      const status = result.error.code === "HRM_OFFER_NOT_FOUND" ? 404 : 400;
      return reply.status(status).send({ error: { code: result.error.code, message: result.error.message, details: result.error.meta }, correlationId: req.correlationId });
    }
    return reply.status(200).send({ data: result.data, correlationId: req.correlationId });
  });
}