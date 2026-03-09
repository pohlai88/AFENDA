/**
 * Match Tolerance entity — defines acceptable variances for invoice matching.
 *
 * RULES:
 *   1. Tolerances are hierarchical: ORG > PO > SUPPLIER_SITE (most specific wins)
 *   2. Both percent-based and absolute amount tolerances supported
 *   3. Used by 3-way matching (PO-Receipt-Invoice) and 2-way matching (PO-Invoice)
 *   4. Separate tolerances for price, quantity, and tax variances
 */
import { z } from "zod";
import { brandedUuid } from "../../../shared/ids.js";
import { CurrencyCodeSchema } from "../../../shared/money.js";
import { UtcDateTimeSchema } from "../../../shared/datetime.js";

// ── Branded IDs ───────────────────────────────────────────────────────────────

export const MatchToleranceIdSchema = brandedUuid("MatchToleranceId");
export type MatchToleranceId = z.infer<typeof MatchToleranceIdSchema>;

// ── Scope values — determines where tolerance applies ─────────────────────────

export const MatchToleranceScopeValues = [
  "ORG",           // Organization-wide default
  "SUPPLIER",      // Specific supplier
  "SUPPLIER_SITE", // Specific supplier site
  "PO",            // Specific purchase order
] as const;

export type MatchToleranceScope = (typeof MatchToleranceScopeValues)[number];

// ── Variance type — which type of variance this tolerance covers ──────────────

export const VarianceTypeValues = [
  "PRICE",     // Unit price variance (invoice vs PO)
  "QUANTITY",  // Quantity variance (invoice vs receipt)
  "TAX",       // Tax amount variance
  "TOTAL",     // Total amount variance (catch-all)
] as const;

export type VarianceType = (typeof VarianceTypeValues)[number];

// ── Match Tolerance schema ────────────────────────────────────────────────────

export const MatchToleranceSchema = z.object({
  id: MatchToleranceIdSchema,
  orgId: brandedUuid("OrgId"),
  
  /** Scope of this tolerance rule */
  scope: z.enum(MatchToleranceScopeValues),
  
  /** Foreign key based on scope (null for ORG scope) */
  scopeEntityId: z.string().uuid().optional(),
  
  /** Type of variance this tolerance covers */
  varianceType: z.enum(VarianceTypeValues),
  
  /** Human-readable name for this tolerance rule */
  name: z.string().min(1).max(100),
  
  /** Description of when this tolerance applies */
  description: z.string().max(500).optional(),
  
  /**
   * Percent tolerance (e.g., 5 means 5% variance allowed)
   * Applied as: abs(actual - expected) / expected <= tolerancePercent / 100
   */
  tolerancePercent: z.number().min(0).max(100).optional(),
  
  /**
   * Maximum absolute tolerance amount in minor units
   * Applied as: abs(actual - expected) <= maxAmountMinor
   */
  maxAmountMinor: z.coerce.bigint().optional(),
  
  /** Currency for maxAmountMinor (required if maxAmountMinor set) */
  currencyCode: CurrencyCodeSchema.optional(),
  
  /** Priority for conflict resolution (lower = higher priority) */
  priority: z.number().int().min(0).default(100),
  
  /** Whether this tolerance is currently active */
  isActive: z.boolean().default(true),
  
  /** Effective date range */
  effectiveFrom: UtcDateTimeSchema.optional(),
  effectiveTo: UtcDateTimeSchema.optional(),
  
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export type MatchTolerance = z.infer<typeof MatchToleranceSchema>;

// ── Match Result schema — outcome of tolerance evaluation ─────────────────────

export const MatchResultValues = [
  "WITHIN_TOLERANCE",  // Variance is acceptable
  "OVER_TOLERANCE",    // Variance exceeds tolerance, needs review
  "NO_TOLERANCE_FOUND", // No matching tolerance rule found
] as const;

export type MatchResult = (typeof MatchResultValues)[number];

export const MatchEvaluationSchema = z.object({
  /** Tolerance rule that was applied (null if none found) */
  toleranceId: MatchToleranceIdSchema.optional(),
  
  /** Type of variance checked */
  varianceType: z.enum(VarianceTypeValues),
  
  /** Expected value in minor units */
  expectedAmountMinor: z.coerce.bigint(),
  
  /** Actual value in minor units */
  actualAmountMinor: z.coerce.bigint(),
  
  /** Calculated variance in minor units */
  varianceAmountMinor: z.coerce.bigint(),
  
  /** Calculated variance as percentage */
  variancePercent: z.number(),
  
  /** Result of the evaluation */
  result: z.enum(MatchResultValues),
});

export type MatchEvaluation = z.infer<typeof MatchEvaluationSchema>;
