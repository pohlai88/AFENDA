/**
 * @afenda/contracts — Audit permissions.
 *
 * RULES:
 *   1. Format: `audit.entity.action` (lowercase dot-separated).
 *   2. Every permission used in audit routes MUST be listed here.
 *   3. Adding a permission is safe. Removing/renaming is BREAKING.
 */

import { z } from "zod";

// ── Audit Permission Keys ─────────────────────────────────────────────────────

export const AuditPermissionValues = ["audit.log.read"] as const;

export const AuditPermissionSchema = z.enum(AuditPermissionValues);

export type AuditPermission = z.infer<typeof AuditPermissionSchema>;
