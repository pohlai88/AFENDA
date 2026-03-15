/**
 * Match Tolerance routes â€” create, update, deactivate, list, get by ID.
 *
 * RULES:
 *   1. Use ZodTypeProvider for schema â†’ schema.body, schema.response.
 *   2. Commands: rate-limit 30/min, require auth, require org.
 *   3. Never import @afenda/db â€” use @afenda/core services.
 */

import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireOrg,
  requireAuth,
} from "../../../../helpers/responses.js";
import { serializeDate } from "../../../../helpers/dates.js";
import { buildOrgScopedContext, buildPolicyContext } from "../../../../helpers/context.js";
import {
  CreateMatchToleranceCommandSchema,
  UpdateMatchToleranceCommandSchema,
  DeactivateMatchToleranceCommandSchema,
  CursorParamsSchema,
  type OrgId,
  type CorrelationId,
  type PrincipalId,
} from "@afenda/contracts";
import {
  createMatchTolerance,
  updateMatchTolerance,
  deactivateMatchTolerance,
  listMatchTolerances,
  getMatchToleranceById,
} from "@afenda/core";
import type { OrgScopedContext, PolicyContext } from "@afenda/core";

// â”€â”€ Response schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const MatchToleranceRowSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  scope: z.string(),
  scopeEntityId: z.string().uuid().nullable(),
  varianceType: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  tolerancePercent: z.string(),
  maxAmountMinor: z.string().nullable(),
  currencyCode: z.string().nullable(),
  priority: z.number(),
  isActive: z.number(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const MatchToleranceListSchema = z.object({
  data: z.array(MatchToleranceRowSchema),
  cursor: z.string().nullable(),
  hasMore: z.boolean(),
  correlationId: z.string().uuid(),
});

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function serialiseMatchTolerance(row: {
  id: string;
  orgId: string;
  scope: string;
  scopeEntityId: string | null;
  varianceType: string;
  name: string;
  description: string | null;
  tolerancePercent: string;
  maxAmountMinor: bigint | null;
  currencyCode: string | null;
  priority: number;
  isActive: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    orgId: row.orgId,
    scope: row.scope,
    scopeEntityId: row.scopeEntityId,
    varianceType: row.varianceType,
    name: row.name,
    description: row.description,
    tolerancePercent: row.tolerancePercent,
    maxAmountMinor: row.maxAmountMinor != null ? String(row.maxAmountMinor) : null,
    currencyCode: row.currencyCode,
    priority: row.priority,
    isActive: row.isActive,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo,
    createdAt: serializeDate(row.createdAt)!,
    updatedAt: serializeDate(row.updatedAt)!,
  };
}

function mapErrorStatus(code: string) {
  switch (code) {
    case "AP_MATCH_TOLERANCE_NOT_FOUND":
      return 404 as const;
    case "AP_MATCH_TOLERANCE_DUPLICATE_SCOPE":
      return 409 as const;
    default:
      return 400 as const;
  }
}

// â”€â”€ Route registration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function matchToleranceRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  // â”€â”€ Create match tolerance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  typed.post(
    "/commands/create-match-tolerance",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Create a match tolerance rule for invoice matching.",
        tags: ["Match Tolerance"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreateMatchToleranceCommandSchema,
        response: {
          201: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const effectiveFrom = String(req.body.effectiveFrom).slice(0, 10);

      const result = await createMatchTolerance(
        app.db,
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
        req.correlationId as CorrelationId,
        {
          scope: req.body.scope,
          scopeEntityId: req.body.scopeEntityId ?? undefined,
          varianceType: req.body.varianceType,
          name: req.body.name,
          description: req.body.description,
          tolerancePercent: req.body.tolerancePercent,
          maxAmountMinor: req.body.maxAmountMinor,
          currencyCode: req.body.currencyCode,
          priority: req.body.priority,
          effectiveFrom,
          effectiveTo: req.body.effectiveTo ? String(req.body.effectiveTo).slice(0, 10) : undefined,
        },
      );

      if (!result.ok) {
        return reply.status(mapErrorStatus(result.error.code)).send({
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

  // â”€â”€ Update match tolerance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  typed.post(
    "/commands/update-match-tolerance",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Update a match tolerance rule.",
        tags: ["Match Tolerance"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: UpdateMatchToleranceCommandSchema,
        response: {
          200: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await updateMatchTolerance(
        app.db,
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
        req.correlationId as CorrelationId,
        {
          matchToleranceId: req.body.matchToleranceId,
          name: req.body.name,
          description: req.body.description,
          tolerancePercent: req.body.tolerancePercent,
          maxAmountMinor: req.body.maxAmountMinor,
          priority: req.body.priority,
          effectiveTo: req.body.effectiveTo ? String(req.body.effectiveTo).slice(0, 10) : undefined,
        },
      );

      if (!result.ok) {
        return reply.status(mapErrorStatus(result.error.code)).send({
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.meta,
          },
          correlationId: req.correlationId,
        });
      }

      return { data: result.data, correlationId: req.correlationId };
    },
  );

  // â”€â”€ Deactivate match tolerance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  typed.post(
    "/commands/deactivate-match-tolerance",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Deactivate a match tolerance rule.",
        tags: ["Match Tolerance"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: DeactivateMatchToleranceCommandSchema,
        response: {
          200: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await deactivateMatchTolerance(
        app.db,
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
        req.correlationId as CorrelationId,
        {
          matchToleranceId: req.body.matchToleranceId,
          reason: req.body.reason,
        },
      );

      if (!result.ok) {
        return reply.status(mapErrorStatus(result.error.code)).send({
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.meta,
          },
          correlationId: req.correlationId,
        });
      }

      return { data: result.data, correlationId: req.correlationId };
    },
  );

  // â”€â”€ List match tolerances â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  typed.get(
    "/match-tolerances",
    {
      schema: {
        description: "List match tolerances with cursor pagination. Optionally filter by scope.",
        tags: ["Match Tolerance"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: CursorParamsSchema.extend({
          scope: z.string().optional(),
        }),
        response: {
          200: MatchToleranceListSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const page = await listMatchTolerances(app.db, orgId as OrgId, {
        cursor: req.query.cursor,
        limit: req.query.limit,
        scope: req.query.scope,
      });

      return {
        data: page.data.map(serialiseMatchTolerance),
        cursor: page.cursor,
        hasMore: page.hasMore,
        correlationId: req.correlationId,
      };
    },
  );

  // â”€â”€ Get match tolerance by ID â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  typed.get(
    "/match-tolerances/:id",
    {
      schema: {
        description: "Get match tolerance by ID.",
        tags: ["Match Tolerance"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: makeSuccessSchema(MatchToleranceRowSchema),
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const row = await getMatchToleranceById(app.db, orgId as OrgId, req.params.id);

      if (!row) {
        return reply.status(404).send({
          error: {
            code: "AP_MATCH_TOLERANCE_NOT_FOUND",
            message: "Match tolerance not found",
          },
          correlationId: req.correlationId,
        });
      }

      return {
        data: serialiseMatchTolerance(row),
        correlationId: req.correlationId,
      };
    },
  );
}
