/**
 * TEMPLATE: Domain service for @afenda/core.
 *
 * Copy this file to: packages/core/src/erp/supplier/supplier-bank-account.service.ts
 * Then: find-replace SupplierBankAccount/entity with your domain name.
 *
 * RULES:
 *   1. All mutations go through db.transaction().
 *   2. All commands emit outbox events inside the transaction.
 *   3. All commands write audit logs inside the transaction.
 *   4. Return ServiceResult<T>, never throw for domain errors.
 *   5. Use `sql\`now()\`` for timestamps, not `new Date()`.
 *   6. Wrap in instrumentService() for OTel auto-tracing (see barrel/index.ts).
 */

// import type { DbClient } from "@afenda/db";
// import type { OrgScopedContext, PolicyContext } from "./types";
// import type { CorrelationId } from "@afenda/contracts";
// import { eq, and, sql } from "drizzle-orm";
// import { entity } from "@afenda/db";
// TODO: import { writeAuditLog } from audit.service (kernel/governance)
// TODO: import { nextNumber } from numbering.service (kernel/execution)
// NOTE: Relative paths above assume an erp module. Adjust depth for your pillar location.

// ── Result type ───────────────────────────────────────────────────────────────

type SupplierBankAccountServiceResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: string; message: string } };

// ── Commands ──────────────────────────────────────────────────────────────────

/**
 * Create a new entity.
 *
 * @param db - Drizzle database client
 * @param ctx - Org-scoped request context (orgId, principalId)
 * @param policyCtx - Permission context for SoD checks
 * @param correlationId - Request correlation ID
 * @param params - Command payload (validated by Zod upstream)
 */
// export async function createEntity(
//   db: DbClient,
//   ctx: OrgScopedContext,
//   policyCtx: PolicyContext,
//   correlationId: CorrelationId,
//   params: CreateSupplierBankAccountCommand,
// ): Promise<EntityServiceResult<{ id: string }>> {
//
//   // 1. Permission check
//   // if (!policyCtx.permissionsSet.has("scope.entity.create")) {
//   //   return { ok: false, error: { code: "IAM_INSUFFICIENT_PERMISSIONS", message: "..." } };
//   // }
//
//   // 2. Transaction: insert + outbox + audit
//   // return db.transaction(async (tx) => {
//   //   const [row] = await tx.insert(entity).values({ ... }).returning({ id: entity.id });
//   //
//   //   // Outbox event
//   //   await tx.insert(outboxEvent).values({
//   //     orgId: ctx.activeContext.orgId,
//   //     type: "domain.entity_created",
//   //     version: "1",
//   //     correlationId,
//   //     payload: { entityId: row.id },
//   //   });
//   //
//   //   // Audit log
//   //   await writeAuditLog(tx, {
//   //     orgId: ctx.activeContext.orgId,
//   //     actorPrincipalId: ctx.principalId,
//   //     action: "entity.created",
//   //     entityType: "entity",
//   //     entityId: row.id,
//   //     correlationId,
//   //   });
//   //
//   //   return { ok: true, value: { id: row.id } };
//   // });
// }
