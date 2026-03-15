import { describe, expect, it } from "vitest";
import {
  GetChatterMessageResponseSchema,
  ListChatterMessagesResponseSchema,
} from "../chatter.queries.js";

const ORG_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const PRINCIPAL_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const MSG_ID = "cccccccc-cccc-4ccc-accc-cccccccccccc";
const ENTITY_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const CORR_ID = "ffffffff-ffff-4fff-afff-ffffffffffff";

const BASE_MSG = {
  id: MSG_ID,
  orgId: ORG_ID,
  entityType: "task" as const,
  entityId: ENTITY_ID,
  parentMessageId: null,
  authorPrincipalId: PRINCIPAL_ID,
  body: "Hello, world!",
  editedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("chatter.queries – GetChatterMessageResponseSchema", () => {
  it("accepts a valid get response", () => {
    const result = GetChatterMessageResponseSchema.safeParse({
      data: BASE_MSG,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });
});

describe("chatter.queries – ListChatterMessagesResponseSchema", () => {
  it("accepts a valid list response", () => {
    const result = ListChatterMessagesResponseSchema.safeParse({
      data: [BASE_MSG],
      meta: { cursor: null, hasMore: false, limit: 50 },
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });

  it("accepts an empty list response", () => {
    const result = ListChatterMessagesResponseSchema.safeParse({
      data: [],
      meta: { cursor: null, hasMore: false, limit: 50 },
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });
});
