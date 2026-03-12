import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { getPositionIncumbency } from "@afenda/core";
import { ApiErrorResponseSchema, makeSuccessSchema, requireAuth, requireOrg } from "../../../helpers/responses.js";

const ParamsSchema = z.object({ positionId: z.string().uuid() });
const ResponseSchema = makeSuccessSchema(z.object({ positionId: z.string().uuid(), positionCode: z.string(), positionTitle: z.string(), legalEntityId: z.string().uuid(), positionStatus: z.string(), headcountLimit: z.number().int(), incumbents: z.array(z.object({ employmentId: z.string().uuid(), employeeId: z.string().uuid(), employeeCode: z.string(), employmentStatus: z.string(), assignmentId: z.string().uuid(), effectiveFrom: z.string() })) }));

export async function hrGetPositionIncumbencyRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();
  typed.get("/hrm/positions/:positionId", { schema: { description: "Get position incumbency.", tags: ["HRM", "Organization"], security: [{ bearerAuth: [] }, { devAuth: [] }], params: ParamsSchema, response: { 200: ResponseSchema, 401: ApiErrorResponseSchema, 403: ApiErrorResponseSchema, 404: ApiErrorResponseSchema, 500: ApiErrorResponseSchema } } }, async (req, reply) => {
    const orgId = requireOrg(req, reply); if (!orgId) return;
    const auth = requireAuth(req, reply); if (!auth) return;
    const data = await getPositionIncumbency(app.db, orgId, req.params.positionId);
    if (!data) {
      return reply.status(404).send({ error: { code: "HRM_POSITION_NOT_FOUND", message: "Position not found" }, correlationId: req.correlationId });
    }
    return reply.status(200).send({ data, correlationId: req.correlationId });
  });
}