import { describe, expect, it } from "vitest";
import {
  ApprovalDelegationSchema,
  ApprovalRequestSchema,
  ApprovalStepSchema,
} from "../approval-request.entity.js";

describe("approval-request.entity", () => {
  it("parses a valid approval request", () => {
    const parsed = ApprovalRequestSchema.parse({
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

    expect(parsed.approvalNumber).toBe("APR-001");
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

  it("rejects non-pending step without actedAt", () => {
    const result = ApprovalStepSchema.safeParse({
      id: "44444444-4444-4444-8444-444444444444",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      approvalRequestId: "11111111-1111-4111-8111-111111111111",
      stepIndex: 1,
      label: "Manager",
      assigneeId: "33333333-3333-4333-8333-333333333333",
      delegatedToId: null,
      status: "approved",
      comment: "ok",
      actedAt: null,
      createdAt: "2026-03-14T10:00:00.000Z",
      updatedAt: "2026-03-14T11:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });

  it("rejects delegation with validUntil before validFrom", () => {
    const result = ApprovalDelegationSchema.safeParse({
      id: "55555555-5555-4555-8555-555555555555",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      fromPrincipalId: "33333333-3333-4333-8333-333333333333",
      toPrincipalId: "66666666-6666-4666-8666-666666666666",
      validFrom: "2026-04-01",
      validUntil: "2026-03-01",
      reason: null,
      isActive: true,
      createdAt: "2026-03-14T10:00:00.000Z",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("validUntil");
    }
  });

  it("accepts delegation with valid date range", () => {
    const result = ApprovalDelegationSchema.safeParse({
      id: "55555555-5555-4555-8555-555555555555",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      fromPrincipalId: "33333333-3333-4333-8333-333333333333",
      toPrincipalId: "66666666-6666-4666-8666-666666666666",
      validFrom: "2026-03-01",
      validUntil: "2026-04-01",
      reason: null,
      isActive: true,
      createdAt: "2026-03-14T10:00:00.000Z",
    });

    expect(result.success).toBe(true);
  });
});
