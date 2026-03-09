/**
 * Audit log query contracts — filter + row schemas for audit log reads.
 *
 * RULES:
 *   1. Query schemas define the valid filter surface for audit log endpoints.
 *   2. Row schemas mirror the `audit_log` table columns — all camelCase.
 *   3. `AuditActionSchema` and `AuditEntityTypeSchema` are re-used from audit.ts.
 *   4. No domain logic — validation only.
 */
import { z } from "zod";
import { AuditActionValues, AuditEntityTypeValues } from "./actions.js";
import {
  UuidSchema,
  AuditLogIdSchema,
  OrgIdSchema,
  PrincipalIdSchema,
  CorrelationIdSchema,
} from "../../../shared/ids.js";
import { UtcDateTimeSchema } from "../../../shared/datetime.js";

// ── Filter schema for listing audit logs ─────────────────────────────────────

export const AuditLogFilterSchema = z.object({
  entityType: z.enum(AuditEntityTypeValues).optional(),
  entityId: UuidSchema.optional(),
  action: z.enum(AuditActionValues).optional(),
  actorPrincipalId: UuidSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type AuditLogFilter = z.infer<typeof AuditLogFilterSchema>;

// ── Row schema for audit log query results ───────────────────────────────────

export const AuditLogRowSchema = z.object({
  id: AuditLogIdSchema,
  orgId: OrgIdSchema,
  actorPrincipalId: PrincipalIdSchema.nullable(),
  action: z.enum(AuditActionValues),
  entityType: z.enum(AuditEntityTypeValues),
  entityId: UuidSchema.nullable(),
  correlationId: CorrelationIdSchema,
  occurredAt: UtcDateTimeSchema,
  details: z.record(z.string(), z.unknown()).nullable(),
});

export type AuditLogRow = z.infer<typeof AuditLogRowSchema>;
