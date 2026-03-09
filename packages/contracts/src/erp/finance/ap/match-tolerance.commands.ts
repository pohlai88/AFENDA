/**
 * Match Tolerance command schemas for AP domain.
 *
 * Commands:
 *   - CreateMatchTolerance: Define variance tolerance rules
 *   - UpdateMatchTolerance: Modify tolerance parameters
 *   - DeactivateMatchTolerance: Disable a tolerance rule
 */
import { z } from "zod";
import { brandedUuid } from "../../../shared/ids.js";
import { IdempotencyKeySchema } from "../../../kernel/execution/idempotency/request-key.js";
import { CurrencyCodeSchema } from "../../../shared/money.js";
import { DateSchema } from "../../../shared/datetime.js";
import {
  MatchToleranceIdSchema,
  MatchToleranceScopeValues,
  VarianceTypeValues,
} from "./match-tolerance.entity.js";

// ── Create Match Tolerance command ────────────────────────────────────────────

export const CreateMatchToleranceCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  scope: z.enum(MatchToleranceScopeValues),
  /** ID of entity for scope (supplierId, supplierSiteId, poId) - null for ORG */
  scopeEntityId: brandedUuid("ScopeEntityId").optional(),
  varianceType: z.enum(VarianceTypeValues),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  tolerancePercent: z.number().min(0).max(100),
  maxAmountMinor: z.coerce.bigint().nonnegative().optional(),
  currencyCode: CurrencyCodeSchema.optional(),
  priority: z.number().int().min(1).max(1000).default(100),
  effectiveFrom: DateSchema,
  effectiveTo: DateSchema.optional(),
});

export type CreateMatchToleranceCommand = z.infer<typeof CreateMatchToleranceCommandSchema>;

// ── Update Match Tolerance command ────────────────────────────────────────────

export const UpdateMatchToleranceCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  matchToleranceId: MatchToleranceIdSchema,
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  tolerancePercent: z.number().min(0).max(100).optional(),
  maxAmountMinor: z.coerce.bigint().nonnegative().optional(),
  priority: z.number().int().min(1).max(1000).optional(),
  effectiveTo: DateSchema.optional(),
});

export type UpdateMatchToleranceCommand = z.infer<typeof UpdateMatchToleranceCommandSchema>;

// ── Deactivate Match Tolerance command ────────────────────────────────────────

export const DeactivateMatchToleranceCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  matchToleranceId: MatchToleranceIdSchema,
  reason: z.string().min(1).max(500).optional(),
});

export type DeactivateMatchToleranceCommand = z.infer<typeof DeactivateMatchToleranceCommandSchema>;
