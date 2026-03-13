/**
 * COMM Document capability resolver.
 *
 * Gates document actions on dedicated comm.document.* permission keys.
 */
import type { ActionCap, FieldCap, PolicyContext } from "@afenda/contracts";
import { hasPermission } from "../../../identity/permissions";
import {
  registerCapabilityResolver,
  type EntityCapabilityResolver,
  type RecordContext,
} from "../capability-engine";

const DOCUMENT_READ_PERMISSION = "comm.document.read";
const DOCUMENT_WRITE_PERMISSION = "comm.document.write";
const DOCUMENT_MANAGE_PERMISSION = "comm.document.manage";

const ALWAYS_RO_FIELDS = new Set([
  "id",
  "orgId",
  "documentNumber",
  "status",
  "publishedAt",
  "publishedByPrincipalId",
  "createdByPrincipalId",
  "lastEditedByPrincipalId",
  "createdAt",
  "updatedAt",
]);

const EDITABLE_FIELDS = ["title", "body", "visibility", "documentType", "slug", "parentDocId"];

function denied(message: string): ActionCap {
  return {
    allowed: false,
    reason: {
      code: "MISSING_PERMISSION",
      message,
    },
  };
}

const commDocumentResolver: EntityCapabilityResolver = {
  entityKey: "comm.document",

  resolveFieldCaps(ctx: PolicyContext, _record?: RecordContext): Record<string, FieldCap> {
    const canWrite =
      hasPermission(ctx, DOCUMENT_WRITE_PERMISSION) ||
      hasPermission(ctx, DOCUMENT_MANAGE_PERMISSION);
    const editableCap: FieldCap = canWrite ? "rw" : "ro";

    const caps: Record<string, FieldCap> = {};
    for (const key of ALWAYS_RO_FIELDS) {
      caps[key] = "ro";
    }
    for (const key of EDITABLE_FIELDS) {
      caps[key] = editableCap;
    }
    return caps;
  },

  resolveActionCaps(ctx: PolicyContext, _record?: RecordContext): Record<string, ActionCap> {
    const canRead =
      hasPermission(ctx, DOCUMENT_READ_PERMISSION) ||
      hasPermission(ctx, DOCUMENT_WRITE_PERMISSION) ||
      hasPermission(ctx, DOCUMENT_MANAGE_PERMISSION);
    const canWrite =
      hasPermission(ctx, DOCUMENT_WRITE_PERMISSION) ||
      hasPermission(ctx, DOCUMENT_MANAGE_PERMISSION);
    const canManage = hasPermission(ctx, DOCUMENT_MANAGE_PERMISSION);

    return {
      "document.view": canRead
        ? { allowed: true }
        : denied("Missing comm.document.read permission"),
      "document.create": canWrite
        ? { allowed: true }
        : denied("Missing comm.document.write permission"),
      "document.update": canWrite
        ? { allowed: true }
        : denied("Missing comm.document.write permission"),
      "document.publish": canManage
        ? { allowed: true }
        : denied("Missing comm.document.manage permission"),
      "document.archive": canManage
        ? { allowed: true }
        : denied("Missing comm.document.manage permission"),
      "document.collaborators.manage": canManage
        ? { allowed: true }
        : denied("Missing comm.document.manage permission"),
    };
  },
};

registerCapabilityResolver(commDocumentResolver);
