import { describe, expect, it } from "vitest";
import { CommApprovalEvents } from "../approval.events.js";
import { ApprovalOutboxRecordSchema, OutboxRecordSchema } from "../approval.outbox.js";

describe("approval.outbox", () => {
  it("parses generic outbox record", () => {
    const parsed = OutboxRecordSchema.parse({
      id: "77777777-7777-4777-8777-777777777777",
      eventName: "COMM.SOMETHING",
      payload: { ok: true },
      createdAt: "2026-03-14T10:00:00.000Z",
      processedAt: null,
    });

    expect(parsed.eventName).toBe("COMM.SOMETHING");
  });

  it("parses approval outbox record for request-created", () => {
    const parsed = ApprovalOutboxRecordSchema.parse({
      id: "77777777-7777-4777-8777-777777777777",
      eventName: CommApprovalEvents.RequestCreated,
      payload: {
        approvalRequestId: "11111111-1111-4111-8111-111111111111",
        approvalNumber: "APR-001",
        orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        title: "Approve invoice INV-001",
        sourceEntityType: "invoice",
        sourceEntityId: "22222222-2222-4222-8222-222222222222",
        requestedByPrincipalId: "33333333-3333-4333-8333-333333333333",
        urgency: "high",
        totalSteps: 2,
        correlationId: "99999999-9999-4999-8999-999999999999",
      },
      createdAt: "2026-03-14T10:00:00.000Z",
    });

    expect(parsed.eventName).toBe(CommApprovalEvents.RequestCreated);
  });

  it("rejects payload mismatch by event type", () => {
    const result = ApprovalOutboxRecordSchema.safeParse({
      id: "77777777-7777-4777-8777-777777777777",
      eventName: CommApprovalEvents.StepApproved,
      payload: {
        approvalDelegationId: "66666666-6666-4666-8666-666666666666",
      },
      createdAt: "2026-03-14T10:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });

  it("parses status-changed outbox record", () => {
    const parsed = ApprovalOutboxRecordSchema.parse({
      id: "77777777-7777-4777-8777-777777777777",
      eventName: CommApprovalEvents.StatusChanged,
      payload: {
        approvalRequestId: "11111111-1111-4111-8111-111111111111",
        orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        fromStatus: "pending",
        toStatus: "approved",
        occurredAt: "2026-03-15T08:00:00.000Z",
        correlationId: "99999999-9999-4999-8999-999999999999",
      },
      createdAt: "2026-03-14T10:00:00.000Z",
    });

    expect(parsed.eventName).toBe(CommApprovalEvents.StatusChanged);
  });

  it("parses expired outbox record", () => {
    const parsed = ApprovalOutboxRecordSchema.parse({
      id: "77777777-7777-4777-8777-777777777777",
      eventName: CommApprovalEvents.Expired,
      payload: {
        approvalRequestId: "11111111-1111-4111-8111-111111111111",
        orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        dueDate: "2026-03-10",
        expiredAt: "2026-03-15T00:00:00.000Z",
        correlationId: "99999999-9999-4999-8999-999999999999",
      },
      createdAt: "2026-03-14T10:00:00.000Z",
    });

    expect(parsed.eventName).toBe(CommApprovalEvents.Expired);
  });
});
