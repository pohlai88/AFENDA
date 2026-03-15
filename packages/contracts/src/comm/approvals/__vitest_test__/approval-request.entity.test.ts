import { describe, expect, it } from "vitest";
import {
  ApprovalRequestSchema,
  ApprovalStepSchema,
} from "../approval-request.entity.js";

describe("approval-request.entity", () => {
  it("parses a valid approval request", () => {
    const result = ApprovalRequestSchema.safeParse({
      id: "11111111-1111-4111-8111-111111111111",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      approvalNumber: "APR-001",
      title: "Approve invoice INV-001",
      sourceEntityType: "invoice",
      sourceEntityId: "22222222-2222-4222-8222-222222222222",
      requestedByPrincipalId: "33333333-3333-4333-8333-333333333333",
      status: "pending",
      currentStepIndex: 0,
      totalSteps: 2,
      urgency: "normal",
      dueDate: null,
      resolvedAt: null,
      resolvedByPrincipalId: null,
      createdAt: "2026-03-14T10:00:00.000Z",
      updatedAt: "2026-03-14T10:00:00.000Z",
    });

    expect(result.success).toBe(true);
  });

  it("rejects delegated step without delegatedToId", () => {
    const result = ApprovalStepSchema.safeParse({
      id: "44444444-4444-4444-8444-444444444444",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      approvalRequestId: "11111111-1111-4111-8111-111111111111",
      stepIndex: 1,
      label: "Manager",
      assigneeId: "33333333-3333-4333-8333-333333333333",
      delegatedToId: null,
      status: "delegated",
      comment: null,
      actedAt: "2026-03-14T11:00:00.000Z",
      createdAt: "2026-03-14T10:00:00.000Z",
      updatedAt: "2026-03-14T11:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });
});
