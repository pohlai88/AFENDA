import { describe, expect, it } from "vitest";
import {
  CommWorkflowEventTypes,
  COMM_WORKFLOW_CREATED,
  COMM_WORKFLOW_RUN_COMPLETED,
  CommWorkflowEvents,
  WorkflowEventPayloadSchemas,
  WorkflowEventTypes,
} from "../workflow.events.js";
import { CommWorkflowCreatedPayloadSchema } from "../workflow.events.payloads.js";
import { WorkflowOutboxRecordSchema } from "../workflow.outbox.js";
import { GetWorkflowResponseSchema } from "../workflow.queries.js";
import { WorkflowNameSchema } from "../workflow.shared.js";

describe("workflows index – barrel completeness", () => {
  it("re-exports CommWorkflowEvents from workflow.events", () => {
    expect(CommWorkflowEvents.Created).toBe(COMM_WORKFLOW_CREATED);
    expect(CommWorkflowEvents.RunCompleted).toBe(COMM_WORKFLOW_RUN_COMPLETED);
  });

  it("WorkflowEventTypes is non-empty", () => {
    expect(WorkflowEventTypes.length).toBeGreaterThan(0);
  });

  it("CommWorkflowEventTypes remains aligned", () => {
    expect(CommWorkflowEventTypes).toEqual(WorkflowEventTypes);
  });

  it("re-exports payload schemas", () => {
    expect(CommWorkflowCreatedPayloadSchema).toBeDefined();
    expect(WorkflowEventPayloadSchemas).toBeDefined();
  });

  it("re-exports outbox schema", () => {
    expect(WorkflowOutboxRecordSchema).toBeDefined();
  });

  it("re-exports detail response schema", () => {
    expect(GetWorkflowResponseSchema).toBeDefined();
  });

  it("re-exports shared schemas", () => {
    expect(WorkflowNameSchema).toBeDefined();
  });
});
