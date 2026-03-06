/**
 * Supplier capability resolver — maps permission checks into the
 * normalised CapabilityResult contract.
 *
 * Self-registers on import.
 *
 * FIELD CAPABILITY RULES:
 *   - ID fields (id, orgId, createdAt, updatedAt, status) → always "ro"
 *   - Editable fields (name, taxId, contactEmail) → "rw" if principal
 *     has supplierOnboard permission, "ro" otherwise
 *
 * ACTION CAPABILITY RULES:
 *   - All actions require supplier.onboard permission
 */
import { Permissions } from "@afenda/contracts";
import type { FieldCap, ActionCap } from "@afenda/contracts";
import { hasPermission } from "../../iam/permissions.js";
import type { PolicyContext } from "../../finance/sod.js";
import {
  registerCapabilityResolver,
  type EntityCapabilityResolver,
  type RecordContext,
} from "../capability-engine.js";

const ALWAYS_RO_FIELDS = new Set([
  "id",
  "orgId",
  "status",
  "createdAt",
  "updatedAt",
]);

const EDITABLE_FIELDS = ["name", "taxId", "contactEmail"];

const supplierResolver: EntityCapabilityResolver = {
  entityKey: "supplier.supplier",

  resolveFieldCaps(ctx: PolicyContext, _record?: RecordContext): Record<string, FieldCap> {
    const canEdit = hasPermission(ctx, Permissions.supplierOnboard);
    const editCap: FieldCap = canEdit ? "rw" : "ro";

    const caps: Record<string, FieldCap> = {};
    for (const key of ALWAYS_RO_FIELDS) {
      caps[key] = "ro";
    }
    for (const key of EDITABLE_FIELDS) {
      caps[key] = editCap;
    }
    return caps;
  },

  resolveActionCaps(ctx: PolicyContext, _record?: RecordContext): Record<string, ActionCap> {
    const canManage = hasPermission(ctx, Permissions.supplierOnboard);
    const denied: ActionCap = {
      allowed: false,
      reason: { code: "MISSING_PERMISSION", message: "Missing supplier.onboard permission" },
    };

    const caps: Record<string, ActionCap> = {};
    caps["supplier.create"] = canManage ? { allowed: true } : denied;
    caps["supplier.activate"] = canManage ? { allowed: true } : denied;
    caps["supplier.suspend"] = canManage ? { allowed: true } : denied;
    return caps;
  },
};

registerCapabilityResolver(supplierResolver);
