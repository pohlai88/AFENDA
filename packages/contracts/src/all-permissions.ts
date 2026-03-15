/**
 * @afenda/contracts — Combined permission registry (all domains).
 *
 * This file aggregates permissions from all pillar modules into a single
 * PermissionValues array and provides the unified PermissionSchema and PERMISSION_SCOPES.
 *
 * ARCHITECTURE:
 *   - This file exists at package root (not within any pillar).
 *   - It CAN import from all pillars (kernel, erp, comm) without violating ADR-0005.
 *   - Individual pillar permission files remain the source of truth.
 *
 * USAGE:
 *   ```typescript
 *   import { PermissionValues, PermissionSchema, Permission } from "<contracts-root>";
 *   ```
 */

import { z } from "zod";

// Re-export all domain permission modules
export * from "./erp/finance/ap/permissions.js";
export * from "./erp/finance/gl/permissions.js";
export * from "./erp/supplier/permissions.js";
export * from "./erp/finance/treasury/permissions.js";
export * from "./kernel/identity/permissions.js";
export * from "./kernel/governance/evidence/permissions.js";
export * from "./kernel/governance/audit/permissions.js";
export * from "./kernel/registry/permissions.js";
export * from "./comm/permissions.js";

// Import domain permission arrays
import { ApPermissionValues } from "./erp/finance/ap/permissions.js";
import { GlPermissionValues } from "./erp/finance/gl/permissions.js";
import { SupplierPermissionValues } from "./erp/supplier/permissions.js";
import { TreasuryPermissionValues } from "./erp/finance/treasury/permissions.js";
import { IamPermissionValues } from "./kernel/identity/permissions.js";
import { EvidencePermissionValues } from "./kernel/governance/evidence/permissions.js";
import { AuditPermissionValues } from "./kernel/governance/audit/permissions.js";
import { RegistryPermissionValues } from "./kernel/registry/permissions.js";
import { CommPermissionValues } from "./comm/permissions.js";

/**
 * Combined permission array from all domains.
 * Use this for exhaustive switch statements, validation, and DB seeding.
 * 
 * Total: ~225 permissions across 9 domains.
 */
export const PermissionValues = [
  ...IamPermissionValues,
  ...ApPermissionValues,
  ...GlPermissionValues,
  ...SupplierPermissionValues,
  ...TreasuryPermissionValues,
  ...EvidencePermissionValues,
  ...AuditPermissionValues,
  ...RegistryPermissionValues,
  ...CommPermissionValues,
] as const;

/**
 * Unified permission schema combining all domain permissions.
 * Validates against the complete PermissionValues enum.
 */
export const PermissionSchema = z.enum(PermissionValues);

export type Permission = z.infer<typeof PermissionSchema>;

/**
 * Type guard for permissions.
 */
export function isPermission(value: unknown): value is Permission {
  return PermissionSchema.safeParse(value).success;
}

/**
 * Permissions grouped by scope for UI rendering convenience.
 * Useful for permission pickers, role editors, and SoD configuration.
 */
export const PERMISSION_SCOPES = {
  iam: PermissionValues.filter((p) => p.startsWith("iam.")),
  ap: PermissionValues.filter((p) => p.startsWith("ap.")),
  gl: PermissionValues.filter((p) => p.startsWith("gl.")),
  purch: PermissionValues.filter((p) => p.startsWith("purch.")),
  sup: PermissionValues.filter((p) => p.startsWith("sup.")),
  doc: PermissionValues.filter((p) => p.startsWith("doc.")),
  audit: PermissionValues.filter((p) => p.startsWith("audit.")),
  admin: PermissionValues.filter((p) => p.startsWith("admin.")),
  treasury: PermissionValues.filter((p) => p.startsWith("treasury.")),
  comm: PermissionValues.filter((p) => p.startsWith("comm.")),
  erp: PermissionValues.filter((p) => p.startsWith("erp.")),
} as const;
