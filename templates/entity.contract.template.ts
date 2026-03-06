/**
 * TEMPLATE: Entity schema for @afenda/contracts.
 *
 * Copy this file to: packages/contracts/src/<domain>/<entity>.entity.ts
 * Then: find-replace ENTITY/Entity with your domain name.
 *
 * RULES:
 *   1. Use branded IDs from shared/ids.ts.
 *   2. Use UtcDateTimeSchema for timestamps (not z.date()).
 *   3. Export *Values and *Schema separately — *Values is importable by @afenda/db.
 *   4. Add entity to the barrel: packages/contracts/src/<domain>/index.ts
 *   5. Add ENTITY_TYPE to AuditEntityTypeValues in shared/audit.ts.
 */
import { z } from "zod";
// import { EntityIdSchema, OrgIdSchema } from "../shared/ids.js";
// import { UtcDateTimeSchema } from "../shared/datetime.js";

// ── Status values (as const for DB enum + switch statements) ──────────────────

export const EntityStatusValues = [
  "draft",
  "active",
  // Add more statuses as needed
] as const;

export type EntityStatus = (typeof EntityStatusValues)[number];

// ── Entity schema ─────────────────────────────────────────────────────────────

export const EntitySchema = z.object({
  // id: EntityIdSchema,
  // orgId: OrgIdSchema,
  // status: z.enum(EntityStatusValues),
  // name: z.string().min(1).max(255),
  // createdAt: UtcDateTimeSchema,
  // updatedAt: UtcDateTimeSchema,
});

export type Entity = z.infer<typeof EntitySchema>;
