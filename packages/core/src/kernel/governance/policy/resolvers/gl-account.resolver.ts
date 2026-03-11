/**
 * GL Account capability resolver — maps permission checks into the
 * normalised CapabilityResult contract.
 *
 * Self-registers on import.
 *
 * FIELD CAPABILITY RULES:
 *   - ID fields (id, orgId, createdAt, updatedAt) → always "ro"
 *   - Editable fields (code, name, type, isActive) → "rw" if principal
 *     has glJournalPost permission, "ro" otherwise
 *
 * ACTION CAPABILITY RULES:
 *   - create requires gl.journal.post permission
 */
import { Permissions } from "@afenda/contracts";
import type { FieldCap, ActionCap, PolicyContext } from "@afenda/contracts";
import { hasPermission } from "../../../identity/permissions";
import {
  registerCapabilityResolver,
  type EntityCapabilityResolver,
  type RecordContext,
} from "../capability-engine";

const ALWAYS_RO_FIELDS = new Set([
  "id",
  "orgId",
  "createdAt",
  "updatedAt",
]);

const EDITABLE_FIELDS = ["code", "name", "type", "isActive"];

const glAccountResolver: EntityCapabilityResolver = {
  entityKey: "gl.account",

  resolveFieldCaps(ctx: PolicyContext, _record?: RecordContext): Record<string, FieldCap> {
    const canEdit = hasPermission(ctx, Permissions.glJournalPost);
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
    const canManage = hasPermission(ctx, Permissions.glJournalPost);
    const denied: ActionCap = {
      allowed: false,
      reason: { code: "MISSING_PERMISSION", message: "Missing gl.journal.post permission" },
    };

    const caps: Record<string, ActionCap> = {};
    caps["gl.account.create"] = canManage ? { allowed: true } : denied;
    return caps;
  },
};

registerCapabilityResolver(glAccountResolver);
