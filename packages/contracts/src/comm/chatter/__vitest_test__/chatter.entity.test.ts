import { describe, expect, it } from "vitest";
import { CommChatterMessageSchema } from "../chatter.entity.js";

const ORG_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const PRINCIPAL_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const MSG_ID = "cccccccc-cccc-4ccc-accc-cccccccccccc";

const BASE_MSG = {
  id: MSG_ID,
  orgId: ORG_ID,
  entityType: "task" as const,
  entityId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  parentMessageId: null,
  authorPrincipalId: PRINCIPAL_ID,
  body: "This is a chatter message",
  editedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("chatter.entity – CommChatterMessageSchema", () => {
  it("accepts a valid message", () => {
    expect(CommChatterMessageSchema.safeParse(BASE_MSG).success).toBe(true);
  });

  it("rejects empty body", () => {
    const result = CommChatterMessageSchema.safeParse({ ...BASE_MSG, body: "" });
    expect(result.success).toBe(false);
  });

  it("rejects body exceeding 20000 chars", () => {
    const result = CommChatterMessageSchema.safeParse({
      ...BASE_MSG,
      body: "x".repeat(20_001),
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid entityType values", () => {
    for (const entityType of ["task", "project", "document"] as const) {
      expect(CommChatterMessageSchema.safeParse({ ...BASE_MSG, entityType }).success).toBe(true);
    }
  });

  it("rejects invalid entityType", () => {
    const result = CommChatterMessageSchema.safeParse({
      ...BASE_MSG,
      entityType: "invoice",
    });
    expect(result.success).toBe(false);
  });

  it("accepts message with a parent", () => {
    const result = CommChatterMessageSchema.safeParse({
      ...BASE_MSG,
      parentMessageId: "ffffffff-ffff-4fff-afff-ffffffffffff",
    });
    expect(result.success).toBe(true);
  });
});
