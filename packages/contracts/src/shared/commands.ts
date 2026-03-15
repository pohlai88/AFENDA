/**
 * src/shared/commands.ts
 *
 * Shared command primitives and helpers used across domains.
 *
 * - Centralizes idempotency, base command shapes, bulk-id patterns, and common refinements.
 * - Keep these small and well-typed so domain command files can compose them.
 *
 * Exports:
 *  - SharedIdempotencyKeySchema (re-export from kernel)
 *  - BaseCommandSchema, BaseOrgCommandSchema, BaseOrgPrincipalCommandSchema
 *  - bulkIdsSchema factory (creates a validated, unique-enforced ID array schema)
 *  - uniqueArrayRefinement helper (generic uniqueness refinement)
 *  - helper types for common command shapes
 */

import { z } from "zod";
import { IdempotencyKeySchema } from "./idempotency.js";
import { OrgIdSchema, PrincipalIdSchema, UuidSchema } from "./ids.js";

/* -------------------------------------------------------------------------- */
/* Idempotency                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Canonical idempotency key schema.
 * Kept in shared/idempotency and re-exported here for convenience.
 */
export const SharedIdempotencyKeySchema = IdempotencyKeySchema;
export type SharedIdempotencyKey = z.infer<typeof SharedIdempotencyKeySchema>;

/* -------------------------------------------------------------------------- */
/* Base command shapes                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Minimal base command: only idempotency.
 * Useful for internal commands that don't require org/principal context.
 */
export const BaseCommandSchema = z.object({
  idempotencyKey: SharedIdempotencyKeySchema,
});
export type BaseCommand = z.infer<typeof BaseCommandSchema>;

/**
 * Base command that includes org scoping.
 * Most domain commands should extend this.
 */
export const BaseOrgCommandSchema = BaseCommandSchema.extend({
  orgId: OrgIdSchema,
});
export type BaseOrgCommand = z.infer<typeof BaseOrgCommandSchema>;

/**
 * Base command that includes org + principal (actor).
 * Principal is optional in some flows (system actions).
 */
export const BaseOrgPrincipalCommandSchema = BaseOrgCommandSchema.extend({
  principalId: PrincipalIdSchema.optional(),
});
export type BaseOrgPrincipalCommand = z.infer<typeof BaseOrgPrincipalCommandSchema>;

/* -------------------------------------------------------------------------- */
/* Uniqueness refinement helpers                                              */
/* -------------------------------------------------------------------------- */

/**
 * Generic uniqueness refinement for arrays.
 *
 * Usage:
 *   z.array(z.string()).superRefine(uniqueArrayRefinement("ids must be unique"))
 *
 * Adds a Zod issue at the duplicated entry index when duplicates are found.
 */
export function uniqueArrayRefinement<T>(message = "array must not contain duplicate values") {
  return (arr: T[], ctx: z.RefinementCtx): void => {
    const seen = new Map<unknown, number>();
    for (let i = 0; i < arr.length; i += 1) {
      const key: unknown = arr[i];
      const prev = seen.get(key);
      if (prev !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message,
          path: [i],
        });
      } else {
        seen.set(key, i);
      }
    }
  };
}

/**
 * Create a zod array schema with uniqueness enforced.
 *
 * Example:
 *   export const BulkTaskIdsSchema = bulkIdsSchema(CommTaskIdSchema, { min: 1, max: 200 });
 */
export function bulkIdsSchema<T extends z.ZodTypeAny>(
  itemSchema: T,
  opts?: { min?: number; max?: number; uniqueMessage?: string },
) {
  const min = opts?.min ?? 1;
  const max = opts?.max ?? 200;
  const uniqueMessage = opts?.uniqueMessage ?? "duplicate ids are not allowed";

  return z.array(itemSchema).min(min).max(max).superRefine(uniqueArrayRefinement(uniqueMessage));
}

/* -------------------------------------------------------------------------- */
/* Convenience ID schemas                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Common bulk ID schema for plain UUID strings (unbranded).
 * Useful for legacy endpoints that accept raw UUIDs.
 */
export const BulkUuidIdsSchema = bulkIdsSchema(UuidSchema, { min: 1, max: 200 });

/* -------------------------------------------------------------------------- */
/* Common command patterns                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Generic Create command shape for domains that require org + principal.
 * Domain-specific create commands should extend this and add domain fields.
 */
export const CreateCommandBaseSchema = BaseOrgPrincipalCommandSchema.extend({
  // Optional client-supplied id for upsert-like flows; domain may ignore.
  clientId: z.string().uuid().optional(),
});
export type CreateCommandBase = z.infer<typeof CreateCommandBaseSchema>;

/**
 * Generic Update command shape: id + idempotency.
 * Domain-specific update commands should extend and make fields optional as needed.
 */
export const UpdateCommandBaseSchema = BaseOrgPrincipalCommandSchema.extend({
  id: z.string().uuid(),
});
export type UpdateCommandBase = z.infer<typeof UpdateCommandBaseSchema>;

/**
 * Generic Delete command shape.
 */
export const DeleteCommandBaseSchema = BaseOrgPrincipalCommandSchema.extend({
  id: z.string().uuid(),
  reason: z.string().max(500).optional(),
});
export type DeleteCommandBase = z.infer<typeof DeleteCommandBaseSchema>;

/* -------------------------------------------------------------------------- */
/* Export bundle                                                              */
/* -------------------------------------------------------------------------- */

export const SharedCommands = {
  SharedIdempotencyKeySchema,
  BaseCommandSchema,
  BaseOrgCommandSchema,
  BaseOrgPrincipalCommandSchema,
  CreateCommandBaseSchema,
  UpdateCommandBaseSchema,
  DeleteCommandBaseSchema,
  uniqueArrayRefinement,
  bulkIdsSchema,
  BulkUuidIdsSchema,
};

export default SharedCommands;
