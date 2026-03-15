/**
 * @afenda/contracts — Evidence & Document permissions.
 *
 * RULES:
 *   1. Format: `doc.entity.action` (lowercase dot-separated).
 *   2. Every permission used in evidence/document routes MUST be listed here.
 *   3. Adding a permission is safe. Removing/renaming is BREAKING.
 */

import { z } from "zod";

// ── Evidence & Document Permission Keys ───────────────────────────────────────

export const EvidencePermissionValues = ["doc.document.read", "doc.evidence.attach"] as const;

export const EvidencePermissionSchema = z.enum(EvidencePermissionValues);

export type EvidencePermission = z.infer<typeof EvidencePermissionSchema>;
