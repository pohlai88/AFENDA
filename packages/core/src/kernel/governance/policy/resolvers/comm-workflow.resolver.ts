/**
 * COMM Workflow capability resolver.
 *
 * Gates workflow actions on dedicated comm.workflow.* permission keys.
 */
import type { ActionCap, FieldCap, PolicyContext } from "@afenda/contracts";
import { hasPermission } from "../../../identity/permissions";
import {
  registerCapabilityResolver,
  type EntityCapabilityResolver,
  type RecordContext,
} from "../capability-engine";

const WORKFLOW_READ_PERMISSION = "comm.workflow.read";
const WORKFLOW_CREATE_PERMISSION = "comm.workflow.create";
const WORKFLOW_UPDATE_PERMISSION = "comm.workflow.update";
const WORKFLOW_EXECUTE_PERMISSION = "comm.workflow.execute";

const ALWAYS_RO_FIELDS = new Set([
  "id",
  "triggerType",
  "actionsCount",
  "runCount",
  "lastTriggeredAt",
  "updatedAt",
  "createdAt",
]);

const EDITABLE_FIELDS = ["name", "status"];

function denied(message: string): ActionCap {
  return {
    allowed: false,
    reason: {
      code: "MISSING_PERMISSION",
      message,
    },
  };
}

const commWorkflowResolver: EntityCapabilityResolver = {
  entityKey: "comm.workflow",

  resolveFieldCaps(ctx: PolicyContext, _record?: RecordContext): Record<string, FieldCap> {
    const canUpdate = hasPermission(ctx, WORKFLOW_UPDATE_PERMISSION);
    const editableCap: FieldCap = canUpdate ? "rw" : "ro";

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
      hasPermission(ctx, WORKFLOW_READ_PERMISSION) ||
      hasPermission(ctx, WORKFLOW_UPDATE_PERMISSION) ||
      hasPermission(ctx, WORKFLOW_CREATE_PERMISSION);
    const canCreate = hasPermission(ctx, WORKFLOW_CREATE_PERMISSION);
    const canUpdate = hasPermission(ctx, WORKFLOW_UPDATE_PERMISSION);
    const canExecute = hasPermission(ctx, WORKFLOW_EXECUTE_PERMISSION);

    return {
      "workflow.view": canRead
        ? { allowed: true }
        : denied("Missing comm.workflow.read permission"),
      "workflow.create": canCreate
        ? { allowed: true }
        : denied("Missing comm.workflow.create permission"),
      "workflow.update": canUpdate
        ? { allowed: true }
        : denied("Missing comm.workflow.update permission"),
      "workflow.status.change": canUpdate
        ? { allowed: true }
        : denied("Missing comm.workflow.update permission"),
      "workflow.delete": canUpdate
        ? { allowed: true }
        : denied("Missing comm.workflow.update permission"),
      "workflow.execute": canExecute
        ? { allowed: true }
        : denied("Missing comm.workflow.execute permission"),
    };
  },
};

registerCapabilityResolver(commWorkflowResolver);
