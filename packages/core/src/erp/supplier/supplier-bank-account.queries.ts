/**
 * TEMPLATE: Query functions for @afenda/core.
 *
 * Copy this file to: packages/core/src/erp/supplier/supplier-bank-account.queries.ts
 * Then: find-replace SupplierBankAccount/entity with your domain name.
 *
 * RULES:
 *   1. All queries are org-scoped (filter by orgId).
 *   2. Use cursor-based pagination (not offset).
 *   3. Return projection DTOs in camelCase.
 *   4. Read-only — no mutations.
 */

// import type { DbClient } from "@afenda/db";
// import type { OrgId } from "@afenda/contracts";
// import { eq, and, gt, desc, sql } from "drizzle-orm";
// import { entity } from "@afenda/db";

// ── Types ─────────────────────────────────────────────────────────────────────

// interface EntityListParams {
//   orgId: OrgId;
//   cursor?: string;
//   limit: number;
//   status?: string;
// }

// interface CursorPage<T> {
//   data: T[];
//   cursor: string | null;
//   hasMore: boolean;
// }

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * List entities with cursor-based pagination.
 *
 * Pattern: fetch limit + 1 rows. If count > limit, there's a next page.
 * Cursor is base64url-encoded ID of the last row on the page.
 */
// export async function listEntities(
//   db: DbClient,
//   params: EntityListParams,
// ): Promise<CursorPage<SupplierBankAccount>> {
//   const { orgId, cursor, limit, status } = params;
//
//   const conditions = [eq(entity.orgId, orgId)];
//   if (status) conditions.push(eq(entity.status, status));
//   if (cursor) {
//     const decoded = Buffer.from(cursor, "base64url").toString();
//     conditions.push(gt(entity.id, decoded));
//   }
//
//   const rows = await db
//     .select()
//     .from(entity)
//     .where(and(...conditions))
//     .orderBy(entity.id)
//     .limit(limit + 1);
//
//   const hasMore = rows.length > limit;
//   const data = hasMore ? rows.slice(0, limit) : rows;
//   const nextCursor = hasMore
//     ? Buffer.from(data[data.length - 1].id).toString("base64url")
//     : null;
//
//   return { data, cursor: nextCursor, hasMore };
// }

/**
 * Get a single entity by ID.
 */
// export async function getEntityById(
//   db: DbClient,
//   orgId: OrgId,
//   entityId: string,
// ): Promise<SupplierBankAccount | null> {
//   const [row] = await db
//     .select()
//     .from(entity)
//     .where(and(eq(entity.orgId, orgId), eq(entity.id, entityId)))
//     .limit(1);
//   return row ?? null;
// }
