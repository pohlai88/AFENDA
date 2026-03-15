import { describe, expect, it } from "vitest";
import {
  ApprovalEventTypes,
  ApprovalEventPayloadSchemas,
  CommApprovalEventTypes,
  COMM_APPROVAL_REQUEST_CREATED,
  CommApprovalEvents,
} from "../approval.events.js";

describe("approval.events", () => {
  it("keeps registry values aligned with constants", () => {
    expect(CommApprovalEvents.RequestCreated).toBe(COMM_APPROVAL_REQUEST_CREATED);
    expect(ApprovalEventTypes).toContain(COMM_APPROVAL_REQUEST_CREATED);
  });

  it("keeps event type list unique", () => {
    const unique = new Set(ApprovalEventTypes);
    expect(unique.size).toBe(ApprovalEventTypes.length);
  });

  it("contains expected baseline lifecycle events", () => {
    expect(ApprovalEventTypes).toEqual(
      expect.arrayContaining([
        CommApprovalEvents.RequestCreated,
        CommApprovalEvents.StepApproved,
        CommApprovalEvents.StepRejected,
        CommApprovalEvents.StepDelegated,
        CommApprovalEvents.Escalated,
        CommApprovalEvents.Withdrawn,
        CommApprovalEvents.PolicyCreated,
        CommApprovalEvents.DelegationSet,
        CommApprovalEvents.StatusChanged,
        CommApprovalEvents.Expired,
      ]),
    );
  });

  it("keeps CommApprovalEventTypes aligned", () => {
    expect(CommApprovalEventTypes).toEqual(ApprovalEventTypes);
  });

  it("re-exports payload schema registry", () => {
    expect(ApprovalEventPayloadSchemas).toBeDefined();
  });
});
