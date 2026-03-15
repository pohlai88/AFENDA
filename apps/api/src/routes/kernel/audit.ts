/**
 * Audit log routes â€” list audit logs & get entity audit trail.
 *
 * Follows the Sprint 1 pattern:
 *   - ZodTypeProvider for automatic validation + OpenAPI generation
 *   - ApiErrorResponseSchema for error shapes
 *   - requireOrg / requireAuth guards
 *   - Domain services from @afenda/core (never direct @afenda/db access)
 *   - Requires audit.log.read permission
 */

import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { ApiErrorResponseSchema, requireOrg, requireAuth } from "../../helpers/responses.js";
import { serializeDate } from "../../helpers/dates.js";
import {
  AuditLogFilterSchema,
  CursorParamsSchema,
  AuditActionValues,
  AuditEntityTypeValues,
  type OrgId,
} from "@afenda/contracts";
import { listAuditLogs, getAuditTrail } from "@afenda/core";

// â”€â”€ Response schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const AuditLogListSchema = z.object({
  data: z.array(
    z.object({
      id: z.string().uuid(),
      orgId: z.string().uuid(),
      actorPrincipalId: z.string().uuid().nullable(),
      action: z.string(),
      entityType: z.string(),
      entityId: z.string().uuid().nullable(),
      correlationId: z.string(),
      occurredAt: z.string().datetime(),
      details: z.record(z.string(), z.unknown()).nullable(),
    }),
  ),
  cursor: z.string().nullable(),
  hasMore: z.boolean(),
  correlationId: z.string().uuid(),
});

const AuditTrailSchema = z.object({
  data: z.array(
    z.object({
      id: z.string().uuid(),
      orgId: z.string().uuid(),
      actorPrincipalId: z.string().uuid().nullable(),
      action: z.string(),
      entityType: z.string(),
      entityId: z.string().uuid().nullable(),
      correlationId: z.string(),
      occurredAt: z.string().datetime(),
      details: z.record(z.string(), z.unknown()).nullable(),
    }),
  ),
  correlationId: z.string().uuid(),
});

// â”€â”€ Serialise â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function serialiseAuditRow(row: {
  id: string;
  orgId: string;
  actorPrincipalId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  correlationId: string;
  occurredAt: Date;
  details: Record<string, unknown> | null;
}) {
  return {
    id: row.id,
    orgId: row.orgId,
    actorPrincipalId: row.actorPrincipalId,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    correlationId: row.correlationId,
    occurredAt: serializeDate(row.occurredAt)!,
    details: row.details,
  };
}

// â”€â”€ Route registration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function auditRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  // â”€â”€ List audit logs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  typed.get(
    "/audit-logs",
    {
      schema: {
        description: "List audit log entries with cursor pagination and optional filters.",
        tags: ["Audit"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: CursorParamsSchema.extend({
          entityType: z.enum(AuditEntityTypeValues).optional(),
          entityId: z.string().uuid().optional(),
          action: z.enum(AuditActionValues).optional(),
          actorPrincipalId: z.string().uuid().optional(),
          from: z.coerce.date().optional(),
          to: z.coerce.date().optional(),
        }),
        response: {
          200: AuditLogListSchema,
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

      const page = await listAuditLogs(app.db, orgId as OrgId, {
        cursor: req.query.cursor,
        limit: req.query.limit,
        entityType: req.query.entityType,
        entityId: req.query.entityId,
        action: req.query.action,
        actorPrincipalId: req.query.actorPrincipalId,
        from: req.query.from,
        to: req.query.to,
      });

      return {
        data: page.data.map(serialiseAuditRow),
        cursor: page.cursor,
        hasMore: page.hasMore,
        correlationId: req.correlationId,
      };
    },
  );

  // â”€â”€ Get audit trail for a specific entity â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  typed.get(
    "/audit-logs/:entityType/:entityId",
    {
      schema: {
        description: "Get the full audit trail for a specific entity.",
        tags: ["Audit"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({
          entityType: z.enum(AuditEntityTypeValues),
          entityId: z.string().uuid(),
        }),
        response: {
          200: AuditTrailSchema,
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

      const trail = await getAuditTrail(
        app.db,
        orgId as OrgId,
        req.params.entityType,
        req.params.entityId,
      );

      return {
        data: trail.map(serialiseAuditRow),
        correlationId: req.correlationId,
      };
    },
  );
}
