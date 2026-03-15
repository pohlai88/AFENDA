import { describe, expect, it } from "vitest";
import {
  CommChatterMessageDeletedPayloadSchema,
  CommChatterMessagePostedPayloadSchema,
  CommChatterMessageUpdatedPayloadSchema,
} from "../chatter.events.payloads.js";

const ORG_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const PRINCIPAL_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const MSG_ID = "cccccccc-cccc-4ccc-accc-cccccccccccc";
const ENTITY_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const CORR_ID = "ffffffff-ffff-4fff-afff-ffffffffffff";

describe("chatter.events.payloads – CommChatterMessagePostedPayloadSchema", () => {
  it("accepts valid payload", () => {
    const result = CommChatterMessagePostedPayloadSchema.safeParse({
      messageId: MSG_ID,
      orgId: ORG_ID,
      entityType: "task",
      entityId: ENTITY_ID,
      parentMessageId: null,
      authorPrincipalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });

  it("accepts with a parent message", () => {
    const result = CommChatterMessagePostedPayloadSchema.safeParse({
      messageId: MSG_ID,
      orgId: ORG_ID,
      entityType: "project",
      entityId: ENTITY_ID,
      parentMessageId: "11111111-1111-4111-8111-111111111111",
      authorPrincipalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid entityType", () => {
    const result = CommChatterMessagePostedPayloadSchema.safeParse({
      messageId: MSG_ID,
      orgId: ORG_ID,
      entityType: "invoice",
      entityId: ENTITY_ID,
      parentMessageId: null,
      authorPrincipalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(false);
  });
});

describe("chatter.events.payloads – CommChatterMessageUpdatedPayloadSchema", () => {
  it("accepts valid payload", () => {
    const result = CommChatterMessageUpdatedPayloadSchema.safeParse({
      messageId: MSG_ID,
      orgId: ORG_ID,
      entityType: "document",
      entityId: ENTITY_ID,
      editedAt: "2026-01-02T10:00:00.000Z",
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing editedAt", () => {
    const result = CommChatterMessageUpdatedPayloadSchema.safeParse({
      messageId: MSG_ID,
      orgId: ORG_ID,
      entityType: "task",
      entityId: ENTITY_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(false);
  });
});

describe("chatter.events.payloads – CommChatterMessageDeletedPayloadSchema", () => {
  it("accepts valid payload", () => {
    const result = CommChatterMessageDeletedPayloadSchema.safeParse({
      messageId: MSG_ID,
      orgId: ORG_ID,
      entityType: "task",
      entityId: ENTITY_ID,
      deletedByPrincipalId: PRINCIPAL_ID,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });
});
