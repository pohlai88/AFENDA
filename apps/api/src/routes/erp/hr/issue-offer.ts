import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { issueOffer } from "@afenda/core";
import { ApiErrorResponseSchema, makeSuccessSchema, requireAuth, requireOrg } from "../../../helpers/responses.js";

const BodySchema = z.object({ applicationId: z.string().uuid(), offerNumber: z.string().min(1).max(50).optional(), offeredOn: z.string().optional(), offerExpiryDate: z.string().optional(), offeredCompensation: z.string().optional(), offerStatus: z.string().max(50).optional() });
const ResponseSchema = makeSuccessSchema(z.object({ offerId: z.string().uuid(), offerNumber: z.string() }));

export async function hrIssueOfferRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();
  typed.post("/hrm/offers", { schema: { description: "Issue offer.", tags: ["HRM", "Recruitment"], security: [{ bearerAuth: [] }, { devAuth: [] }], body: BodySchema, response: { 201: ResponseSchema, 400: ApiErrorResponseSchema, 401: ApiErrorResponseSchema, 403: ApiErrorResponseSchema, 404: ApiErrorResponseSchema, 409: ApiErrorResponseSchema, 500: ApiErrorResponseSchema } } }, async (req, reply) => {
    const orgId = requireOrg(req, reply); if (!orgId) return;
    const auth = requireAuth(req, reply); if (!auth) return;
    const result = await issueOffer(app.db, orgId, auth.principalId, req.correlationId, req.body);
    if (!result.ok) {
      const status = result.error.code === "HRM_CONFLICT" ? 409 : result.error.code === "HRM_APPLICATION_NOT_FOUND" ? 404 : 400;
      return reply.status(status).send({ error: { code: result.error.code, message: result.error.message, details: result.error.meta }, correlationId: req.correlationId });
    }
    return reply.status(201).send({ data: result.data, correlationId: req.correlationId });
  });
}