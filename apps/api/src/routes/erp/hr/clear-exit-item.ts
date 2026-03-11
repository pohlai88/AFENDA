import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { clearExitItem } from "@afenda/core";
import { ApiErrorResponseSchema, makeSuccessSchema, requireAuth, requireOrg } from "../../../helpers/responses.js";

const ParamsSchema = z.object({ itemId: z.string().uuid() });
const BodySchema = z.object({ clearedAt: z.string().optional() });
const ResponseSchema = makeSuccessSchema(z.object({ itemId: z.string().uuid(), previousStatus: z.string(), currentStatus: z.string() }));

export async function hrClearExitItemRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();
  typed.post("/hrm/exit-clearance-items/:itemId/clear", { schema: { description: "Clear exit clearance item.", tags: ["HRM", "Onboarding"], security: [{ bearerAuth: [] }, { devAuth: [] }], params: ParamsSchema, body: BodySchema, response: { 200: ResponseSchema, 400: ApiErrorResponseSchema, 401: ApiErrorResponseSchema, 403: ApiErrorResponseSchema, 404: ApiErrorResponseSchema, 500: ApiErrorResponseSchema } } }, async (req, reply) => {
    const orgId = requireOrg(req, reply); if (!orgId) return;
    const auth = requireAuth(req, reply); if (!auth) return;
    const result = await clearExitItem(app.db, orgId, auth.principalId, req.correlationId, { itemId: req.params.itemId, ...req.body });
    if (!result.ok) {
      const status = result.error.code === "HRM_EXIT_CLEARANCE_ITEM_NOT_FOUND" ? 404 : 400;
      return reply.status(status).send({ error: { code: result.error.code, message: result.error.message, details: result.error.meta }, correlationId: req.correlationId });
    }
    return reply.status(200).send({ data: result.data, correlationId: req.correlationId });
  });
}