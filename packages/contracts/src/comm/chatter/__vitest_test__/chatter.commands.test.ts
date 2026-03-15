import { describe, expect, it } from "vitest";
import {
  DeleteChatterMessageCommandSchema,
  PostChatterMessageCommandSchema,
  UpdateChatterMessageCommandSchema,
} from "../chatter.commands.js";

const IK = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const MSG_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const ENTITY_ID = "cccccccc-cccc-4ccc-accc-cccccccccccc";

describe("chatter.commands – PostChatterMessageCommandSchema", () => {
  it("accepts a valid post command", () => {
    const result = PostChatterMessageCommandSchema.safeParse({
      idempotencyKey: IK,
      entityType: "task",
      entityId: ENTITY_ID,
      body: "Great discussion!",
    });
    expect(result.success).toBe(true);
  });

  it("defaults parentMessageId to null", () => {
    const result = PostChatterMessageCommandSchema.parse({
      idempotencyKey: IK,
      entityType: "project",
      entityId: ENTITY_ID,
      body: "Hello from a project thread",
    });
    expect(result.parentMessageId).toBeNull();
  });

  it("rejects empty body", () => {
    const result = PostChatterMessageCommandSchema.safeParse({
      idempotencyKey: IK,
      entityType: "task",
      entityId: ENTITY_ID,
      body: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid entityType", () => {
    const result = PostChatterMessageCommandSchema.safeParse({
      idempotencyKey: IK,
      entityType: "invoice",
      entityId: ENTITY_ID,
      body: "hello",
    });
    expect(result.success).toBe(false);
  });
});

describe("chatter.commands – UpdateChatterMessageCommandSchema", () => {
  it("accepts a valid update", () => {
    const result = UpdateChatterMessageCommandSchema.safeParse({
      idempotencyKey: IK,
      messageId: MSG_ID,
      body: "Edited message body",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty body", () => {
    const result = UpdateChatterMessageCommandSchema.safeParse({
      idempotencyKey: IK,
      messageId: MSG_ID,
      body: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("chatter.commands – DeleteChatterMessageCommandSchema", () => {
  it("accepts a valid delete", () => {
    const result = DeleteChatterMessageCommandSchema.safeParse({
      idempotencyKey: IK,
      messageId: MSG_ID,
    });
    expect(result.success).toBe(true);
  });
});
