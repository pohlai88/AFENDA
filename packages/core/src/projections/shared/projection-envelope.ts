import { z } from "zod";

/**
 * Standard envelope for all portal projections.
 * 
 * Ensures traceability back to canonical domain truth.
 * 
 * Every projection MUST wrap its data in this envelope to ensure:
 * 1. Traceability: correlationId links to audit_log entries
 * 2. Provenance: sourceRefs tracks which domain truth was used
 * 3. Type safety: projectionType identifies the projection shape
 * 4. Ownership: dominantDomain clarifies which domain owns the truth
 * 
 * @example
 * ```typescript
 * const statement: ProjectionEnvelope<SupplierStatementData> = {
 *   projectionType: "supplier-statement",
 *   dominantDomain: "ap",
 *   supportingDomains: ["treasury"],
 *   correlationId: ctx.correlationId,
 *   sourceRefs: {
 *     ap: "balance:supplier-123",
 *     treasury: "payments:supplier-123"
 *   },
 *   generatedAt: new Date(),
 *   data: { ... }
 * };
 * ```
 */
export interface ProjectionEnvelope<T> {
  // Metadata
  /** Type identifier for this projection (e.g., "supplier-statement", "customer-dashboard") */
  projectionType: string;
  
  /** Primary domain that owns the canonical truth for this projection */
  dominantDomain: string;
  
  /** Additional domains that contribute data to this projection (optional) */
  supportingDomains?: string[];
  
  // Traceability
  /** Request correlation ID - links to audit_log.correlation_id */
  correlationId: string;
  
  /** References to canonical domain entities used to build this projection */
  sourceRefs: Record<string, string>;
  
  /** Optional link to specific audit_log entry documenting this projection generation */
  auditRef?: string;
  
  /** Optional document/evidence attachments (file IDs or URLs) */
  evidenceRefs?: string[];
  
  // Temporal
  /** Timestamp when this projection was generated */
  generatedAt: Date;
  
  /** Optional cache TTL - when this projection should be considered stale */
  validUntil?: Date;
  
  // Payload
  /** The actual projection data (shaped for portal consumption) */
  data: T;
}

/**
 * Zod schema factory for ProjectionEnvelope.
 * 
 * Use this to create type-safe validators for projection responses.
 * 
 * @example
 * ```typescript
 * const SupplierStatementEnvelopeSchema = ProjectionEnvelopeSchema(
 *   SupplierStatementDataSchema
 * );
 * 
 * // Validates at runtime
 * const envelope = SupplierStatementEnvelopeSchema.parse(apiResponse);
 * ```
 */
export const ProjectionEnvelopeSchema = <T extends z.ZodTypeAny>(
  dataSchema: T
) =>
  z.object({
    projectionType: z.string(),
    dominantDomain: z.string(),
    supportingDomains: z.array(z.string()).optional(),
    correlationId: z.string().uuid(),
    sourceRefs: z.record(z.string(), z.string()),
    auditRef: z.string().optional(),
    evidenceRefs: z.array(z.string()).optional(),
    generatedAt: z.date(),
    validUntil: z.date().optional(),
    data: dataSchema,
  });

/**
 * Type guard to check if a value is a valid ProjectionEnvelope.
 */
export function isProjectionEnvelope<T>(
  value: unknown
): value is ProjectionEnvelope<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "projectionType" in value &&
    "dominantDomain" in value &&
    "correlationId" in value &&
    "sourceRefs" in value &&
    "generatedAt" in value &&
    "data" in value
  );
}

/**
 * Helper function to create a ProjectionEnvelope with automatic timestamp.
 * 
 * @example
 * ```typescript
 * const envelope = createProjectionEnvelope({
 *   data: dashboardData,
 *   projectionType: "supplier-dashboard",
 *   dominantDomain: "ap", 
 *   correlationId: ctx.correlationId,
 *   sourceRefs: { ap: `supplier:${id}` }
 * });
 * ```
 */
export function createProjectionEnvelope<T>(params: {
  data: T;
  projectionType: string;
  dominantDomain: string;
  supportingDomains?: string[];
  correlationId: string;
  sourceRefs: Record<string, string>;
  auditRef?: string;
  evidenceRefs?: string[];
  validUntil?: Date;
}): ProjectionEnvelope<T> {
  return {
    ...params,
    generatedAt: new Date(),
  };
}
