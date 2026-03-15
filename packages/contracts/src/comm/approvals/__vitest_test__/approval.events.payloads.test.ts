import { describe, expect, it } from "vitest";
import {
  CommApprovalDelegationSetPayloadSchema,
  CommApprovalExpiredPayloadSchema,
  CommApprovalRequestCreatedPayloadSchema,
  CommApprovalStatusChangedPayloadSchema,
  CommApprovalStepRejectedPayloadSchema,
} from "../approval.events.payloads.js";

describe("approval.events.payloads", () => {
  it("parses request-created payload", () => {
    const parsed = CommApprovalRequestCreatedPayloadSchema.parse({
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
    });

    expect(parsed.totalSteps).toBe(2);
  });

  it("rejects step-rejected payload without actor", () => {
    const result = CommApprovalStepRejectedPayloadSchema.safeParse({
      approvalRequestId: "11111111-1111-4111-8111-111111111111",
      stepId: "44444444-4444-4444-8444-444444444444",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      comment: "insufficient evidence",
      correlationId: "99999999-9999-4999-8999-999999999999",
    });

    expect(result.success).toBe(false);
  });

  it("parses delegation-set payload with valid date range", () => {
    const parsed = CommApprovalDelegationSetPayloadSchema.parse({
      approvalDelegationId: "66666666-6666-4666-8666-666666666666",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      fromPrincipalId: "33333333-3333-4333-8333-333333333333",
      toPrincipalId: "55555555-5555-4555-8555-555555555555",
      validFrom: "2026-03-14",
      validUntil: "2026-03-20",
      reason: "PTO",
      correlationId: "99999999-9999-4999-8999-999999999999",
    });

    expect(parsed.reason).toBe("PTO");
  });

  it("rejects delegation-set payload when validUntil is not after validFrom", () => {
    const result = CommApprovalDelegationSetPayloadSchema.safeParse({
      approvalDelegationId: "66666666-6666-4666-8666-666666666666",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      fromPrincipalId: "33333333-3333-4333-8333-333333333333",
      toPrincipalId: "55555555-5555-4555-8555-555555555555",
      validFrom: "2026-03-20",
      validUntil: "2026-03-14",
      reason: null,
      correlationId: "99999999-9999-4999-8999-999999999999",
    });

    expect(result.success).toBe(false);
  });

  it("parses status-changed payload", () => {
    const parsed = CommApprovalStatusChangedPayloadSchema.parse({
      approvalRequestId: "11111111-1111-4111-8111-111111111111",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      fromStatus: "pending",
      toStatus: "approved",
      changedByPrincipalId: "33333333-3333-4333-8333-333333333333",
      reason: null,
      occurredAt: "2026-03-15T08:00:00.000Z",
      correlationId: "99999999-9999-4999-8999-999999999999",
    });

    expect(parsed.toStatus).toBe("approved");
    expect(parsed.changedByPrincipalId).toBe("33333333-3333-4333-8333-333333333333");
  });

  it("defaults changedByPrincipalId to null when omitted", () => {
    const parsed = CommApprovalStatusChangedPayloadSchema.parse({
      approvalRequestId: "11111111-1111-4111-8111-111111111111",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      fromStatus: "pending",
      toStatus: "expired",
      occurredAt: "2026-03-15T08:00:00.000Z",
      correlationId: "99999999-9999-4999-8999-999999999999",
    });

    expect(parsed.changedByPrincipalId).toBeNull();
  });

  it("rejects status-changed payload when fromStatus equals toStatus", () => {
    const result = CommApprovalStatusChangedPayloadSchema.safeParse({
      approvalRequestId: "11111111-1111-4111-8111-111111111111",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      fromStatus: "pending",
      toStatus: "pending",
      occurredAt: "2026-03-15T08:00:00.000Z",
      correlationId: "99999999-9999-4999-8999-999999999999",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("toStatus");
    }
  });

  it("parses expired payload", () => {
    const parsed = CommApprovalExpiredPayloadSchema.parse({
      approvalRequestId: "11111111-1111-4111-8111-111111111111",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      dueDate: "2026-03-10",
      expiredAt: "2026-03-15T00:00:00.000Z",
      correlationId: "99999999-9999-4999-8999-999999999999",
    });

    expect(parsed.dueDate).toBe("2026-03-10");
  });

  it("rejects expired payload without dueDate", () => {
    const result = CommApprovalExpiredPayloadSchema.safeParse({
      approvalRequestId: "11111111-1111-4111-8111-111111111111",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      expiredAt: "2026-03-15T00:00:00.000Z",
      correlationId: "99999999-9999-4999-8999-999999999999",
    });

    expect(result.success).toBe(false);
  });
});
