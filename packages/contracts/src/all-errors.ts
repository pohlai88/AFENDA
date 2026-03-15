/**
 * @afenda/contracts — Combined error code registry (all domains).
 *
 * This file aggregates error codes from all pillar modules into a single
 * ErrorCodeValues array and provides the unified ErrorCodeSchema.
 *
 * ARCHITECTURE:
 *   - This file exists at package root (not within any pillar).
 *   - It CAN import from all pillars (kernel, erp, comm) without violating ADR-0005.
 *   - Individual pillar error files remain the source of truth.
 *
 * USAGE:
 *   ```typescript
 *   import { ErrorCodeValues, ErrorCodeSchema } from "<contracts-root>";
 *   ```
 */

import { z } from "zod";

// Re-export all domain error modules
export * from "./erp/finance/ap/errors.js";
export * from "./erp/finance/gl/errors.js";
export * from "./erp/supplier/errors.js";
export * from "./erp/finance/treasury/errors.js";
export * from "./kernel/identity/errors.js";
export * from "./kernel/governance/evidence/errors.js";
export * from "./kernel/registry/errors.js";
export * from "./comm/errors.js";
export * from "./shared/errors.js";

// Import domain error code arrays
import { ApErrorCodeValues } from "./erp/finance/ap/errors.js";
import { GlErrorCodeValues } from "./erp/finance/gl/errors.js";
import { SupplierErrorCodeValues } from "./erp/supplier/errors.js";
import { TreasuryErrorCodeValues } from "./erp/finance/treasury/errors.js";
import { IamErrorCodeValues } from "./kernel/identity/errors.js";
import { EvidenceErrorCodeValues } from "./kernel/governance/evidence/errors.js";
import { RegistryErrorCodeValues } from "./kernel/registry/errors.js";
import { CommErrorCodeValues } from "./comm/errors.js";
import { SharedErrorCodeValues, ERROR_CODE_PATTERN } from "./shared/errors.js";

/**
 * Combined error code array from all domains + shared infrastructure codes.
 * Use this for exhaustive switch statements, validation, and DB constraints.
 * 
 * Total: ~240 error codes across 8 domains plus shared.
 * Note: Audit domain uses SHARED_* codes, no audit-specific codes.
 */
export const ErrorCodeValues = [
  ...SharedErrorCodeValues,
  ...IamErrorCodeValues,
  ...ApErrorCodeValues,
  ...GlErrorCodeValues,
  ...SupplierErrorCodeValues,
  ...TreasuryErrorCodeValues,
  ...EvidenceErrorCodeValues,
  ...RegistryErrorCodeValues,
  ...CommErrorCodeValues,
] as const;

/**
 * Unified error code schema combining all domain error codes.
 * Validates against the complete ErrorCodeValues enum.
 */
export const ErrorCodeSchema = z.enum(ErrorCodeValues);

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

/**
 * Type guard for error codes.
 */
export function isErrorCode(value: unknown): value is ErrorCode {
  return ErrorCodeSchema.safeParse(value).success;
}
