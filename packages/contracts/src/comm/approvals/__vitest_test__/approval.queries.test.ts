import { describe, expect, it } from "vitest";
import {
  ListApprovalDelegationsQuerySchema,
  ListApprovalRequestsQuerySchema,
  SearchApprovalRequestsQuerySchema,
  GetApprovalRequestResponseSchema,
  GetApprovalPolicyResponseSchema,
} from "../approval.queries.js";

describe("approval.queries", () => {
  it("rejects list requests when dueBefore is earlier than dueAfter", () => {
    const result = ListApprovalRequestsQuerySchema.safeParse({
      dueAfter: "2026-03-10",
      dueBefore: "2026-03-01",
      limit: 10,
    });

    expect(result.success).toBe(false);
  });

  it("applies default search limit", () => {
    const parsed = SearchApprovalRequestsQuerySchema.parse({ query: "urgent invoice" });
    expect(parsed.limit).toBe(20);
  });

  it("requires at least one delegation filter", () => {
    const result = ListApprovalDelegationsQuerySchema.safeParse({ limit: 50 });
    expect(result.success).toBe(false);
  });

  it("accepts detail response schemas", () => {
    const getRequestParsed = GetApprovalRequestResponseSchema.parse({
      data: {
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
      },
      correlationId: "99999999-9999-4999-8999-999999999999",
    });

    const getPolicyParsed = GetApprovalPolicyResponseSchema.parse({
      data: {
        id: "66666666-6666-4666-8666-666666666666",
        orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        name: "Invoice default",
        sourceEntityType: "invoice",
        autoApproveBelowAmount: null,
        escalationAfterHours: 24,
        isActive: true,
        createdAt: "2026-03-14T10:00:00.000Z",
        updatedAt: "2026-03-14T10:00:00.000Z",
      },
      correlationId: "99999999-9999-4999-8999-999999999999",
    });

    expect(getRequestParsed.data.approvalNumber).toBe("APR-001");
    expect(getPolicyParsed.data.name).toBe("Invoice default");
  });
});
