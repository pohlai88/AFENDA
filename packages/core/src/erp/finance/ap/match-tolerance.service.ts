/**
 * Match Tolerance service — create, update, deactivate.
 *
 * Every mutation:
 *   1. Runs inside `withAudit()` — domain write + audit log are atomic.
 *   2. Emits an outbox event inside the same transaction.
 *
 * RULES:
 *   - No HTTP/Fastify imports — pure domain service.
 *   - Error codes: AP_MATCH_TOLERANCE_* from @afenda/contracts.
 */

import type { DbClient } from "@afenda/db";
import { matchTolerance, outboxEvent } from "@afenda/db";
import { eq, and, sql, isNull } from "drizzle-orm";
import type {
  OrgId,
  PrincipalId,
  CorrelationId,
  MatchToleranceId,
  EntityId,
} from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../../kernel/governance/audit/audit";

// ── Types ────────────────────────────────────────────────────────────────────

export type MatchToleranceServiceError = {
  code: string;
  message: string;
  meta?: Record<string, string>;
};

export type MatchToleranceServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: MatchToleranceServiceError };

export interface CreateMatchToleranceParams {
  scope: "ORG" | "SUPPLIER" | "SUPPLIER_SITE" | "PO";
  scopeEntityId?: string | null;
  varianceType: "PRICE" | "QUANTITY" | "TAX" | "TOTAL";
  name: string;
  description?: string;
  tolerancePercent: number;
  maxAmountMinor?: bigint | null;
  currencyCode?: string | null;
  priority?: number;
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo?: string | null;
}

export interface UpdateMatchToleranceParams {
  matchToleranceId: MatchToleranceId;
  name?: string;
  description?: string;
  tolerancePercent?: number;
  maxAmountMinor?: bigint | null;
  priority?: number;
  effectiveTo?: string | null;
}

export interface DeactivateMatchToleranceParams {
  matchToleranceId: MatchToleranceId;
  reason?: string;
}

// ── Create Match Tolerance ───────────────────────────────────────────────────

export async function createMatchTolerance(
  db: DbClient,
  ctx: OrgScopedContext,
  _policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: CreateMatchToleranceParams,
): Promise<MatchToleranceServiceResult<{ id: MatchToleranceId }>> {
  const orgId = ctx.activeContext.orgId;

  // Check for duplicate scope (orgId, scope, scopeEntityId, varianceType)
  const scopeEntityId = params.scope === "ORG" ? null : (params.scopeEntityId ?? null);
  const scopeEntityCondition =
    scopeEntityId === null
      ? isNull(matchTolerance.scopeEntityId)
      : eq(matchTolerance.scopeEntityId, scopeEntityId);
  const [existing] = await db
    .select({ id: matchTolerance.id })
    .from(matchTolerance)
    .where(
      and(
        eq(matchTolerance.orgId, orgId),
        eq(matchTolerance.scope, params.scope),
        scopeEntityCondition,
        eq(matchTolerance.varianceType, params.varianceType),
      ),
    );

  if (existing) {
    return {
      ok: false,
      error: {
        code: "AP_MATCH_TOLERANCE_DUPLICATE_SCOPE",
        message: "A tolerance rule already exists for this scope and variance type",
        meta: { scope: params.scope, varianceType: params.varianceType },
      },
    };
  }

  const auditEntry = {
    actorPrincipalId: _policyCtx.principalId ?? null,
    action: "match-tolerance.created" as const,
    entityType: "match_tolerance" as const,
    entityId: undefined as EntityId | undefined,
    correlationId,
    details: { name: params.name, scope: params.scope, varianceType: params.varianceType },
  };

  const result = await withAudit(db, ctx, auditEntry, async (tx) => {
    const [row] = await tx
      .insert(matchTolerance)
      .values({
        orgId,
        scope: params.scope,
        scopeEntityId,
        varianceType: params.varianceType,
        name: params.name,
        description: params.description ?? null,
        tolerancePercent: String(params.tolerancePercent),
        maxAmountMinor: params.maxAmountMinor ?? null,
        currencyCode: params.currencyCode ?? null,
        priority: params.priority ?? 100,
        effectiveFrom: params.effectiveFrom,
        effectiveTo: params.effectiveTo ?? null,
      })
      .returning({ id: matchTolerance.id });

    if (!row) throw new Error("Failed to insert match tolerance");

    auditEntry.entityId = row.id as unknown as EntityId;

    await tx.insert(outboxEvent).values({
      orgId,
      type: "AP.MATCH_TOLERANCE_CREATED",
      version: "1",
      correlationId,
      payload: {
        matchToleranceId: row.id,
        scope: params.scope,
        varianceType: params.varianceType,
      },
    });

    return { id: row.id as MatchToleranceId };
  });

  return { ok: true, data: result };
}

// ── Update Match Tolerance ───────────────────────────────────────────────────

export async function updateMatchTolerance(
  db: DbClient,
  ctx: OrgScopedContext,
  _policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: UpdateMatchToleranceParams,
): Promise<MatchToleranceServiceResult<{ id: MatchToleranceId }>> {
  const orgId = ctx.activeContext.orgId;

  const [existing] = await db
    .select({ id: matchTolerance.id })
    .from(matchTolerance)
    .where(and(eq(matchTolerance.orgId, orgId), eq(matchTolerance.id, params.matchToleranceId)));

  if (!existing) {
    return {
      ok: false,
      error: {
        code: "AP_MATCH_TOLERANCE_NOT_FOUND",
        message: "Match tolerance not found",
        meta: { matchToleranceId: params.matchToleranceId },
      },
    };
  }

  const auditEntry = {
    actorPrincipalId: _policyCtx.principalId ?? null,
    action: "match-tolerance.updated" as const,
    entityType: "match_tolerance" as const,
    entityId: params.matchToleranceId as unknown as EntityId,
    correlationId,
    details: {} as Record<string, string>,
  };

  const updates: Record<string, unknown> = { updatedAt: sql`now()` };
  if (params.name !== undefined) updates.name = params.name;
  if (params.description !== undefined) updates.description = params.description;
  if (params.tolerancePercent !== undefined) updates.tolerancePercent = String(params.tolerancePercent);
  if (params.maxAmountMinor !== undefined) updates.maxAmountMinor = params.maxAmountMinor;
  if (params.priority !== undefined) updates.priority = params.priority;
  if (params.effectiveTo !== undefined) updates.effectiveTo = params.effectiveTo;

  await withAudit(db, ctx, auditEntry, async (tx) => {
    await tx
      .update(matchTolerance)
      .set(updates as Record<string, unknown>)
      .where(
        and(
          eq(matchTolerance.id, params.matchToleranceId),
          eq(matchTolerance.orgId, orgId),
        ),
      );

    await tx.insert(outboxEvent).values({
      orgId,
      type: "AP.MATCH_TOLERANCE_UPDATED",
      version: "1",
      correlationId,
      payload: {
        matchToleranceId: params.matchToleranceId,
        ...Object.fromEntries(
          Object.entries(updates)
            .filter(([k]) => k !== "updatedAt")
            .map(([k, v]) => [k, v != null ? String(v) : ""]),
        ),
      },
    });
  });

  return { ok: true, data: { id: params.matchToleranceId } };
}

// ── Deactivate Match Tolerance ────────────────────────────────────────────────

export async function deactivateMatchTolerance(
  db: DbClient,
  ctx: OrgScopedContext,
  _policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: DeactivateMatchToleranceParams,
): Promise<MatchToleranceServiceResult<{ id: MatchToleranceId }>> {
  const orgId = ctx.activeContext.orgId;

  const [existing] = await db
    .select({ id: matchTolerance.id, isActive: matchTolerance.isActive })
    .from(matchTolerance)
    .where(and(eq(matchTolerance.orgId, orgId), eq(matchTolerance.id, params.matchToleranceId)));

  if (!existing) {
    return {
      ok: false,
      error: {
        code: "AP_MATCH_TOLERANCE_NOT_FOUND",
        message: "Match tolerance not found",
        meta: { matchToleranceId: params.matchToleranceId },
      },
    };
  }

  if (existing.isActive === 0) {
    return { ok: true, data: { id: params.matchToleranceId } }; // Idempotent
  }

  const auditEntry = {
    actorPrincipalId: _policyCtx.principalId ?? null,
    action: "match-tolerance.deactivated" as const,
    entityType: "match_tolerance" as const,
    entityId: params.matchToleranceId as unknown as EntityId,
    correlationId,
    details: { reason: params.reason ?? "" },
  };

  await withAudit(db, ctx, auditEntry, async (tx) => {
    await tx
      .update(matchTolerance)
      .set({ isActive: 0, updatedAt: sql`now()` })
      .where(
        and(
          eq(matchTolerance.id, params.matchToleranceId),
          eq(matchTolerance.orgId, orgId),
        ),
      );

    await tx.insert(outboxEvent).values({
      orgId,
      type: "AP.MATCH_TOLERANCE_DEACTIVATED",
      version: "1",
      correlationId,
      payload: {
        matchToleranceId: params.matchToleranceId,
        reason: params.reason ?? null,
      },
    });
  });

  return { ok: true, data: { id: params.matchToleranceId } };
}
