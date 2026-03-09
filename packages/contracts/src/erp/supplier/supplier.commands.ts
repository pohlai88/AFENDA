/**
 * Supplier write commands — onboard, suspend, reactivate.
 *
 * RULES:
 *   1. Commands carry `idempotencyKey` always.
 *   2. `orgId` is never in the command body — resolved from request context.
 *   3. Business logic (duplicate-tax-ID checks, contact email verification,
 *      document requirements) belongs in `@afenda/core`, not here.
 *   4. `reason` is required on suspend — mandatory for audit trails.
 *   5. The full onboarding flow (contactEmail required, docs attached) is
 *      handled by `OnboardSupplierCommandSchema`, not `CreateSupplierSchema`
 *      in the entity file. Use `CreateSupplierSchema` only for lightweight
 *      admin-initiated creation (no documents, no flow).
 */
import { z } from "zod";
import { SupplierIdSchema, OrgIdSchema, DocumentIdSchema } from "../../shared/ids.js";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";

// ─── Onboard ──────────────────────────────────────────────────────────────────

/**
 * Full supplier onboarding — requires contact email and at least one
 * supporting document (e.g. W-9, trade licence). Sets status to "draft"
 * pending internal review; core transitions to "active" after review.
 *
 * `supplierOrgId` is optional: if omitted, core creates an external organization
 * record before persisting the relationship row.
 */
export const OnboardSupplierCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,

  supplierOrgId: OrgIdSchema.optional(),
  name: z.string().trim().min(1).max(255),
  taxId: z.string().trim().min(1).max(64).optional(),

  // Required for full onboarding — distinguishes from lightweight admin creation.
  contactEmail: z.string().email(),

  // At least one onboarding document required (e.g. W-9, trade licence).
  documentIds: z.array(DocumentIdSchema).min(1),
});

export type OnboardSupplierCommand = z.infer<typeof OnboardSupplierCommandSchema>;

// ─── Suspend ──────────────────────────────────────────────────────────────────

/**
 * Suspend an active supplier relationship.
 * `reason` is mandatory — suspension must always be auditable.
 * Transition guard (active → suspended only) belongs in `@afenda/core`.
 */
export const SuspendSupplierCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  supplierId: SupplierIdSchema,
  reason: z.string().trim().min(1).max(500),
});

export type SuspendSupplierCommand = z.infer<typeof SuspendSupplierCommandSchema>;

// ─── Reactivate ───────────────────────────────────────────────────────────────

/**
 * Reactivate a suspended supplier relationship.
 * Transition guard (suspended → active only) belongs in `@afenda/core`.
 */
export const ReactivateSupplierCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  supplierId: SupplierIdSchema,
  reason: z.string().trim().min(1).max(500).optional(),
});

export type ReactivateSupplierCommand = z.infer<typeof ReactivateSupplierCommandSchema>;
