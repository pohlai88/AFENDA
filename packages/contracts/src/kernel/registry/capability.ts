/**
 * CapabilityResult — the resolved set of field + action permissions for a
 * given entity record and principal.
 *
 * RULES:
 *   1. Transport shape only — no React, no Tailwind, no icon imports.
 *   2. `fieldCaps` is `Record<FieldKey, "hidden" | "ro" | "rw">` — O(1) lookup.
 *      Every field in the entity must have an entry; if a field is missing,
 *      the UI defaults to `"hidden"` (safe fallback).
 *   3. `actionCaps` is `Record<ActionKey, { allowed, reason? }>` — O(1) lookup.
 *      When `allowed` is false, `reason` provides a structured denial.
 *   4. `policyVersion` tracks which policy rules were evaluated — audit trail.
 *   5. `evaluatedAt` is UTC timestamp — audit trail.
 *   6. `cacheTtlSeconds` is optional — clients can cache capabilities for
 *      this duration to reduce API calls.
 */
import { z } from "zod";

export const FieldCapValues = ["hidden", "ro", "rw"] as const;
export const FieldCapSchema = z.enum(FieldCapValues);
export type FieldCap = z.infer<typeof FieldCapSchema>;

export const ActionCapSchema = z.object({
  allowed: z.boolean(),
  reason: z
    .object({
      code: z.string().min(1).max(128),
      message: z.string().min(1).max(512),
    })
    .optional(),
});

export type ActionCap = z.infer<typeof ActionCapSchema>;

export const CapabilityResultSchema = z.object({
  /** O(1) field-level permission lookup */
  fieldCaps: z.record(z.string(), FieldCapSchema),

  /** O(1) action-level permission lookup with structured denial */
  actionCaps: z.record(z.string(), ActionCapSchema),

  /** Version of the policy rules that were evaluated */
  policyVersion: z.string().min(1).max(64),

  /** UTC timestamp when capabilities were evaluated */
  evaluatedAt: z.string().datetime(),

  /** Optional client-side cache TTL in seconds */
  cacheTtlSeconds: z.number().int().nonnegative().optional(),
});

export type CapabilityResult = z.infer<typeof CapabilityResultSchema>;
