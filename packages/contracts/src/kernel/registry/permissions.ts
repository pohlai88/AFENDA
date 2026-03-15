/**
 * @afenda/contracts — Registry & Admin permissions.
 *
 * Includes: organization management, settings, custom field definitions.
 *
 * RULES:
 *   1. Format: `admin.entity.action` (lowercase dot-separated).
 *   2. Every permission used in admin/registry routes MUST be listed here.
 *   3. Adding a permission is safe. Removing/renaming is BREAKING.
 */

import { z } from "zod";

// ── Registry & Admin Permission Keys ──────────────────────────────────────────

export const RegistryPermissionValues = [
  // Admin
  "admin.org.manage",
  "admin.user.list",
  "admin.user.read",
  "admin.user.remove",
  "admin.user.ban",
  "admin.user.unban",
  "admin.user.password.set",
  "admin.user.role.set",
  "admin.user.impersonate.start",
  "admin.user.impersonate.stop",
  "admin.user.session.read",
  "admin.user.session.revoke",

  // Settings
  "admin.settings.read",
  "admin.settings.write",

  // Custom Fields (definition management)
  "admin.custom-fields.read",
  "admin.custom-fields.write",
] as const;

export const RegistryPermissionSchema = z.enum(RegistryPermissionValues);

export type RegistryPermission = z.infer<typeof RegistryPermissionSchema>;
