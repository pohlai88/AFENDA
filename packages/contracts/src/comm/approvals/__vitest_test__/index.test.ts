import { describe, expect, it } from "vitest";
import {
  ApprovalOutboxRecordSchema,
  ApprovalTitleSchema,
  CommApprovalEventTypes,
  CommApprovalEvents,
  ApprovalEventPayloadSchemas,
  GetApprovalRequestResponseSchema,
} from "../index.js";

describe("approvals index barrel", () => {
  it("re-exports key upgraded contracts", () => {
    expect(CommApprovalEvents.RequestCreated).toBe("COMM.APPROVAL_REQUEST_CREATED");
    expect(Array.isArray(CommApprovalEventTypes)).toBe(true);
    expect(ApprovalEventPayloadSchemas).toBeDefined();
    expect(ApprovalTitleSchema).toBeDefined();
    expect(typeof ApprovalOutboxRecordSchema.safeParse).toBe("function");
    expect(typeof GetApprovalRequestResponseSchema.safeParse).toBe("function");
  });
});
