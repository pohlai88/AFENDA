/**
 * TEMPLATE: Command schemas for @afenda/contracts.
 *
 * Copy this file to: packages/contracts/src/<pillar>/<module>/<entity>.commands.ts
 * Then: find-replace Entity with your domain name.
 *
 * RULES:
 *   1. Every command MUST include idempotencyKey.
 *   2. Server-generated fields (id, timestamps, actorPrincipalId) are NOT in commands.
 *   3. Add new error codes to shared/errors.ts.
 *   4. Add new audit actions to kernel/governance/audit/actions.ts.
 *   5. Add to barrel: packages/contracts/src/<domain>/index.ts
 */
import { z } from "zod";
// import { IdempotencyKeySchema } from "../shared/idempotency.js";

// ── Create command ────────────────────────────────────────────────────────────

export const CreateEntityCommandSchema = z.object({
  // idempotencyKey: IdempotencyKeySchema,
  // name: z.string().min(1).max(255),
  // ... domain-specific fields
});

export type CreateEntityCommand = z.infer<typeof CreateEntityCommandSchema>;

// ── Update command (example) ──────────────────────────────────────────────────

// export const UpdateEntityCommandSchema = z.object({
//   idempotencyKey: IdempotencyKeySchema,
//   entityId: EntityIdSchema,
//   reason: z.string().min(1).max(500).optional(),
// });
