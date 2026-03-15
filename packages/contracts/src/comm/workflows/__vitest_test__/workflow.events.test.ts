import { describe, expect, it } from "vitest";
import {
  COMM_WORKFLOW_CREATED,
  COMM_WORKFLOW_DELETED,
  COMM_WORKFLOW_RUN_COMPLETED,
  COMM_WORKFLOW_RUN_FAILED,
  COMM_WORKFLOW_STATUS_CHANGED,
  COMM_WORKFLOW_TRIGGERED,
  COMM_WORKFLOW_UPDATED,
  CommWorkflowCreatedPayloadSchema,
  CommWorkflowEventTypes,
  CommWorkflowEvents,
  WorkflowEventTypes,
} from "../workflow.events.js";

describe("workflow.events – constants", () => {
  it("all event type constants follow COMM.<ENTITY>_<ACTION> naming", () => {
    for (const et of WorkflowEventTypes) {
      expect(et).toMatch(/^COMM\./);
    }
  });

  it("CommWorkflowEvents registry has correct values", () => {
    expect(CommWorkflowEvents.Created).toBe(COMM_WORKFLOW_CREATED);
    expect(CommWorkflowEvents.Updated).toBe(COMM_WORKFLOW_UPDATED);
    expect(CommWorkflowEvents.StatusChanged).toBe(COMM_WORKFLOW_STATUS_CHANGED);
    expect(CommWorkflowEvents.Deleted).toBe(COMM_WORKFLOW_DELETED);
    expect(CommWorkflowEvents.Triggered).toBe(COMM_WORKFLOW_TRIGGERED);
    expect(CommWorkflowEvents.RunCompleted).toBe(COMM_WORKFLOW_RUN_COMPLETED);
    expect(CommWorkflowEvents.RunFailed).toBe(COMM_WORKFLOW_RUN_FAILED);
  });

  it("WorkflowEventTypes contains exactly 7 events", () => {
    expect(WorkflowEventTypes).toHaveLength(7);
  });

  it("WorkflowEventTypes has no duplicate values", () => {
    expect(new Set(WorkflowEventTypes).size).toBe(WorkflowEventTypes.length);
  });

  it("CommWorkflowEventTypes remains aligned with WorkflowEventTypes", () => {
    expect(CommWorkflowEventTypes).toEqual(WorkflowEventTypes);
  });

  it("re-exports payload schema surface from events module", () => {
    expect(CommWorkflowCreatedPayloadSchema).toBeDefined();
  });
});
