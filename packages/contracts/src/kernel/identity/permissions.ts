/**
 * @afenda/contracts — IAM (Identity & Access Management) permissions.
 *
 * RULES:
 *   1. Format: `iam.entity.action` (lowercase dot-separated).
 *   2. Every permission used in IAM routes/services MUST be listed here.
 *   3. Adding a permission is safe. Removing/renaming is BREAKING.
 */

import { z } from "zod";

// ── IAM Permission Keys ───────────────────────────────────────────────────────

export const IamPermissionValues = [
  "iam.principal.read",
  "iam.role.read",
  "iam.role.write",
  "iam.permission.read",
] as const;

export const IamPermissionSchema = z.enum(IamPermissionValues);

export type IamPermission = z.infer<typeof IamPermissionSchema>;
