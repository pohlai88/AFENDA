import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { getScenarioProjection } from "@afenda/core";
import { z } from "zod";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const QuerySchema = z.object({
  workforcePlanId: z.string().uuid(),
  scenarioId: z.string().uuid(),
});

const ProjectionSchema = z.object({
  orgUnitId: z.string().uuid(),
  projectedAmount: z.string(),
});

const ResponseSchema = makeSuccessSchema(
  z.object({
    scenarioId: z.string().uuid(),
    scenarioName: z.string(),
    assumptionsJson: z.record(z.unknown()).nullable(),
    projections: z.array(ProjectionSchema),
  }),
);

export async function hrGetScenarioProjectionRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/hrm/workforce-planning/scenario-projection",
    {
      schema: {
        description: "Get scenario projection (labor cost projections by org unit).",
        tags: ["HRM", "Workforce Planning"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: QuerySchema,
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

      const qs = req.query as z.infer<typeof QuerySchema>;
      const projection = await getScenarioProjection(app.db, {
        orgId,
        workforcePlanId: qs.workforcePlanId,
        scenarioId: qs.scenarioId,
      });

      if (!projection) {
        return reply.status(404).send({
          error: {
            code: "HRM_WORKFORCE_SCENARIO_NOT_FOUND",
            message: "Scenario not found",
            details: {},
          },
          correlationId: req.correlationId,
        });
      }

      return reply
        .status(200)
        .send({ data: projection, correlationId: req.correlationId });
    },
  );
}
