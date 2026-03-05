/**
 * Audit log read queries — list and get-trail-by-entity.
 *
 * RULES:
 *   - All queries are org-scoped — `orgId` in every WHERE clause.
 *   - Cursor pagination via opaque cursor (base64-encoded `id`).
 *   - Returns plain objects — no class instances, no lazy loading.
 *   - No HTTP/Fastify imports — pure infrastructure query.
 */

import type { DbClient } from "@afenda/db";
import { auditLog } from "@afenda/db";
import { eq, and, gt, gte, lte, asc } from "drizzle-orm";
import type { OrgId, CursorPage, AuditLogFilter } from "@afenda/contracts";
import { CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX } from "@afenda/contracts";

// ── Types ────────────────────────────────────────────────────────────────────

export interface AuditLogRow {
  id: string;
  orgId: string;
  actorPrincipalId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  correlationId: string;
  occurredAt: Date;
  details: Record<string, unknown> | null;
}

export interface AuditLogListParams extends AuditLogFilter {
  cursor?: string;
  limit?: number;
}

// ── Cursor helpers ───────────────────────────────────────────────────────────

function encodeCursor(id: string): string {
  return Buffer.from(id, "utf8").toString("base64url");
}

function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, "base64url").toString("utf8");
}

// ── List audit logs ──────────────────────────────────────────────────────────

export async function listAuditLogs(
  db: DbClient,
  orgId: OrgId,
  params: AuditLogListParams = {},
): Promise<CursorPage<AuditLogRow>> {
  const limit = Math.min(params.limit ?? CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX);
  const fetchLimit = limit + 1;

  const conditions = [eq(auditLog.orgId, orgId)];

  if (params.entityType) {
    conditions.push(eq(auditLog.entityType, params.entityType));
  }
  if (params.entityId) {
    conditions.push(eq(auditLog.entityId, params.entityId));
  }
  if (params.action) {
    conditions.push(eq(auditLog.action, params.action));
  }
  if (params.actorPrincipalId) {
    conditions.push(eq(auditLog.actorPrincipalId, params.actorPrincipalId));
  }
  if (params.from) {
    conditions.push(gte(auditLog.occurredAt, params.from));
  }
  if (params.to) {
    conditions.push(lte(auditLog.occurredAt, params.to));
  }
  if (params.cursor) {
    const cursorId = decodeCursor(params.cursor);
    conditions.push(gt(auditLog.id, cursorId));
  }

  const rows = await db
    .select()
    .from(auditLog)
    .where(and(...conditions))
    .orderBy(asc(auditLog.id))
    .limit(fetchLimit);

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const lastRow = data[data.length - 1];

  return {
    data: data.map(mapAuditLogRow),
    cursor: hasMore && lastRow ? encodeCursor(lastRow.id) : null,
    hasMore,
  };
}

// ── Get audit trail for a specific entity ────────────────────────────────────

export async function getAuditTrail(
  db: DbClient,
  orgId: OrgId,
  entityType: string,
  entityId: string,
): Promise<AuditLogRow[]> {
  const rows = await db
    .select()
    .from(auditLog)
    .where(
      and(
        eq(auditLog.orgId, orgId),
        eq(auditLog.entityType, entityType),
        eq(auditLog.entityId, entityId),
      ),
    )
    .orderBy(asc(auditLog.occurredAt));

  return rows.map(mapAuditLogRow);
}

// ── Row mapping ──────────────────────────────────────────────────────────────

function mapAuditLogRow(row: typeof auditLog.$inferSelect): AuditLogRow {
  return {
    id: row.id,
    orgId: row.orgId,
    actorPrincipalId: row.actorPrincipalId,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    correlationId: row.correlationId,
    occurredAt: row.occurredAt,
    details: row.details as Record<string, unknown> | null,
  };
}
