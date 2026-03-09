/**
 * OverlayDef — additive, typed view modifications scoped to org/role.
 *
 * RULES:
 *   1. Overlays are additive — they can hide but never delete base fields.
 *   2. `priority` determines application order (ascending). Deterministic.
 *   3. `requiresBaseVersion` must match `baseView.version` or the overlay
 *      is rejected — prevents stale overlays breaking after view upgrades.
 *   4. `conflictPolicy` governs what happens when multiple overlays target
 *      the same field/column: `"reject"` throws, `"last-write-wins"` applies
 *      silently, `"merge"` attempts field-level merge.
 *   5. Transport shape only — no React, no Tailwind, no icon imports.
 */
import { z } from "zod";

// ── Patch Operations ──────────────────────────────────────────────────────────

export const OverlayPatchOpSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("addColumn"),
    fieldKey: z.string().min(1).max(128),
    position: z.number().int().nonnegative().optional(),
    renderer: z.string().min(1).max(64).optional(),
  }),
  z.object({
    op: z.literal("hideColumn"),
    fieldKey: z.string().min(1).max(128),
  }),
  z.object({
    op: z.literal("addField"),
    fieldKey: z.string().min(1).max(128),
    sectionKey: z.string().min(1).max(128),
    position: z.number().int().nonnegative().optional(),
  }),
  z.object({
    op: z.literal("hideField"),
    fieldKey: z.string().min(1).max(128),
  }),
  z.object({
    op: z.literal("reorderSection"),
    sectionKey: z.string().min(1).max(128),
    newPosition: z.number().int().nonnegative(),
  }),
  z.object({
    op: z.literal("addAction"),
    actionKey: z.string().min(1).max(128),
    position: z.number().int().nonnegative().optional(),
  }),
  z.object({
    op: z.literal("addValidation"),
    fieldKey: z.string().min(1).max(128),
    rule: z.record(z.string(), z.unknown()),
  }),
]);

export type OverlayPatchOp = z.infer<typeof OverlayPatchOpSchema>;

// ── Scope ─────────────────────────────────────────────────────────────────────

export const OverlayScopeSchema = z.object({
  /** Target org ID — `"*"` for global */
  orgId: z.string().min(1).max(128).default("*"),
  /** Target role key — `"*"` for all roles */
  roleKey: z.string().min(1).max(64).default("*"),
});

export type OverlayScope = z.infer<typeof OverlayScopeSchema>;

// ── Overlay ───────────────────────────────────────────────────────────────────

export const OverlayDefSchema = z.object({
  overlayKey: z.string().min(1).max(128),
  targetViewKey: z.string().min(1).max(128),
  patchOps: z.array(OverlayPatchOpSchema),
  scope: OverlayScopeSchema,
  /** Deterministic ordering — lower priority applies first */
  priority: z.number().int().nonnegative(),
  /** Overlay is rejected if base view version ≠ this value */
  requiresBaseVersion: z.number().int().nonnegative(),
  /** What to do when multiple overlays target the same field */
  conflictPolicy: z.enum(["reject", "last-write-wins", "merge"]),
  activeFrom: z.string().datetime().optional(),
  activeTo: z.string().datetime().optional(),
});

export type OverlayDef = z.infer<typeof OverlayDefSchema>;
