import { describe, expect, it } from "vitest";
import {
  ApproveStepCommandSchema,
  CreateApprovalRequestCommandSchema,
  DelegateStepCommandSchema,
  EscalateApprovalCommandSchema,
  RejectStepCommandSchema,
  SetDelegationCommandSchema,
  WithdrawApprovalCommandSchema,
} from "../approval.commands.js";

describe("approval.commands", () => {
  it("accepts a valid create approval request command and defaults dueDate to null", () => {
    const parsed = CreateApprovalRequestCommandSchema.parse({
      idempotencyKey: "idem-approval-create-1",
      title: "Approve invoice INV-001",
      sourceEntityType: "invoice",
      sourceEntityId: "11111111-1111-4111-8111-111111111111",
      urgency: "high",
      steps: [
        { assigneeId: "22222222-2222-4222-8222-222222222222", label: "Manager" },
        { assigneeId: "33333333-3333-4333-8333-333333333333" },
      ],
    });

    expect(parsed.steps).toHaveLength(2);
    expect(parsed.urgency).toBe("high");
    expect(parsed.dueDate).toBeNull();
  });

  it("requires reject step comment to be non-empty", () => {
    const result = RejectStepCommandSchema.safeParse({
      idempotencyKey: "idem-approval-reject-1",
      approvalRequestId: "11111111-1111-4111-8111-111111111111",
      stepId: "44444444-4444-4444-8444-444444444444",
      comment: "",
    });

    expect(result.success).toBe(false);
  });

  it("defaults approve step comment to null when omitted", () => {
    const parsed = ApproveStepCommandSchema.parse({
      idempotencyKey: "idem-approval-approve-1",
      approvalRequestId: "11111111-1111-4111-8111-111111111111",
      stepId: "44444444-4444-4444-8444-444444444444",
    });

    expect(parsed.comment).toBeNull();
  });

  it("accepts delegate step command with reason", () => {
    const parsed = DelegateStepCommandSchema.parse({
      idempotencyKey: "idem-approval-delegate-1",
      approvalRequestId: "11111111-1111-4111-8111-111111111111",
      stepId: "44444444-4444-4444-8444-444444444444",
      delegateToPrincipalId: "55555555-5555-4555-8555-555555555555",
      reason: "Out of office",
    });

    expect(parsed.reason).toBe("Out of office");
  });

  it("defaults delegate reason to null when omitted", () => {
    const parsed = DelegateStepCommandSchema.parse({
      idempotencyKey: "idem-approval-delegate-2",
      approvalRequestId: "11111111-1111-4111-8111-111111111111",
      stepId: "44444444-4444-4444-8444-444444444444",
      delegateToPrincipalId: "55555555-5555-4555-8555-555555555555",
    });

    expect(parsed.reason).toBeNull();
  });

  it("requires escalate reason to be non-empty", () => {
    const result = EscalateApprovalCommandSchema.safeParse({
      idempotencyKey: "idem-approval-escalate-1",
      approvalRequestId: "11111111-1111-4111-8111-111111111111",
      reason: "",
    });

    expect(result.success).toBe(false);
  });

  it("defaults withdraw reason to null when omitted", () => {
    const parsed = WithdrawApprovalCommandSchema.parse({
      idempotencyKey: "idem-approval-withdraw-1",
      approvalRequestId: "11111111-1111-4111-8111-111111111111",
    });

    expect(parsed.reason).toBeNull();
  });

  it("rejects delegation windows where validUntil is not after validFrom", () => {
    const result = SetDelegationCommandSchema.safeParse({
      idempotencyKey: "idem-approval-set-delegation-1",
      toPrincipalId: "55555555-5555-4555-8555-555555555555",
      validFrom: "2026-03-14",
      validUntil: "2026-03-14",
    });

    expect(result.success).toBe(false);
  });
});
