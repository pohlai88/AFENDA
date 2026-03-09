/**
 * Match Tolerance read queries — list, getById.
 *
 * RULES:
 *   1. All queries are org-scoped (filter by orgId).
 *   2. Read-only — no mutations.
 */

import type { DbClient } from "@afenda/db";
import { matchTolerance } from "@afenda/db";
import { eq, and, gt, asc } from "drizzle-orm";
import type { OrgId } from "@afenda/contracts";
import { CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX, MatchToleranceScopeValues } from "@afenda/contracts";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MatchToleranceRow {
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
}

export interface MatchToleranceListParams {
  cursor?: string;
  limit?: number;
  scope?: string;
}

// ── Cursor helpers ───────────────────────────────────────────────────────────

function encodeCursor(id: string): string {
  return Buffer.from(id, "utf8").toString("base64url");
}

function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, "base64url").toString("utf8");
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function listMatchTolerances(
  db: DbClient,
  orgId: OrgId,
  params: MatchToleranceListParams = {},
): Promise<{ data: MatchToleranceRow[]; cursor: string | null; hasMore: boolean }> {
  const limit = Math.min(params.limit ?? CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX);
  const fetchLimit = limit + 1;

  const conditions = [eq(matchTolerance.orgId, orgId)];
  if (params.scope && MatchToleranceScopeValues.includes(params.scope as (typeof MatchToleranceScopeValues)[number])) {
    conditions.push(eq(matchTolerance.scope, params.scope as (typeof MatchToleranceScopeValues)[number]));
  }
  if (params.cursor) {
    conditions.push(gt(matchTolerance.id, decodeCursor(params.cursor)));
  }

  const rows = await db
    .select()
    .from(matchTolerance)
    .where(and(...conditions))
    .orderBy(asc(matchTolerance.id))
    .limit(fetchLimit);

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const lastRow = data[data.length - 1];

  return {
    data: data.map(mapMatchToleranceRow),
    cursor: hasMore && lastRow ? encodeCursor(lastRow.id) : null,
    hasMore,
  };
}

export async function getMatchToleranceById(
  db: DbClient,
  orgId: OrgId,
  id: string,
): Promise<MatchToleranceRow | null> {
  const [row] = await db
    .select()
    .from(matchTolerance)
    .where(and(eq(matchTolerance.orgId, orgId), eq(matchTolerance.id, id)))
    .limit(1);

  return row ? mapMatchToleranceRow(row) : null;
}

// ── Row mapping ───────────────────────────────────────────────────────────────

function mapMatchToleranceRow(row: typeof matchTolerance.$inferSelect): MatchToleranceRow {
  return {
    id: row.id,
    orgId: row.orgId,
    scope: row.scope,
    scopeEntityId: row.scopeEntityId,
    varianceType: row.varianceType,
    name: row.name,
    description: row.description,
    tolerancePercent: row.tolerancePercent,
    maxAmountMinor: row.maxAmountMinor,
    currencyCode: row.currencyCode,
    priority: row.priority,
    isActive: row.isActive,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
