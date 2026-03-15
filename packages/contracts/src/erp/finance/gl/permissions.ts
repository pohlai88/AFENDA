/**
 * @afenda/contracts — GL (General Ledger) permissions.
 *
 * RULES:
 *   1. Format: `gl.entity.action` (lowercase dot-separated).
 *   2. Every permission used in GL routes/services MUST be listed here.
 *   3. Adding a permission is safe. Removing/renaming is BREAKING.
 */

import { z } from "zod";

// ── GL Permission Keys ────────────────────────────────────────────────────────

export const GlPermissionValues = [
  "gl.account.read",
  "gl.journal.post",
  "gl.journal.reverse",
  "gl.journal.read",
] as const;

export const GlPermissionSchema = z.enum(GlPermissionValues);

export type GlPermission = z.infer<typeof GlPermissionSchema>;
