import { describe, expect, it } from "vitest";
import { CommChatterEvents } from "../chatter.events.js";
import { ChatterOutboxRecordSchema } from "../chatter.outbox.js";

const ORG_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const PRINCIPAL_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const MSG_ID = "cccccccc-cccc-4ccc-accc-cccccccccccc";
const ENTITY_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const CORR_ID = "ffffffff-ffff-4fff-afff-ffffffffffff";
const RECORD_ID = "11111111-1111-4111-8111-111111111111";

const NOW = "2026-01-02T10:00:00.000Z";

describe("chatter.outbox – ChatterOutboxRecordSchema", () => {
  it("accepts MessagePosted with valid payload", () => {
    const result = ChatterOutboxRecordSchema.safeParse({
      id: RECORD_ID,
      eventName: CommChatterEvents.MessagePosted,
      payload: {
        messageId: MSG_ID,
        orgId: ORG_ID,
        entityType: "task",
        entityId: ENTITY_ID,
        parentMessageId: null,
        authorPrincipalId: PRINCIPAL_ID,
        correlationId: CORR_ID,
      },
      createdAt: NOW,
    });
    expect(result.success).toBe(true);
  });

  it("rejects MessagePosted with invalid payload", () => {
    const result = ChatterOutboxRecordSchema.safeParse({
      id: RECORD_ID,
      eventName: CommChatterEvents.MessagePosted,
      payload: { orgId: ORG_ID },
      createdAt: NOW,
    });
    expect(result.success).toBe(false);
  });

  it("accepts MessageUpdated with valid payload", () => {
    const result = ChatterOutboxRecordSchema.safeParse({
      id: RECORD_ID,
      eventName: CommChatterEvents.MessageUpdated,
      payload: {
        messageId: MSG_ID,
        orgId: ORG_ID,
        entityType: "document",
        entityId: ENTITY_ID,
        editedAt: NOW,
        correlationId: CORR_ID,
      },
      createdAt: NOW,
    });
    expect(result.success).toBe(true);
  });

  it("accepts MessageDeleted with valid payload", () => {
    const result = ChatterOutboxRecordSchema.safeParse({
      id: RECORD_ID,
      eventName: CommChatterEvents.MessageDeleted,
      payload: {
        messageId: MSG_ID,
        orgId: ORG_ID,
        entityType: "task",
        entityId: ENTITY_ID,
        deletedByPrincipalId: PRINCIPAL_ID,
        correlationId: CORR_ID,
      },
      createdAt: NOW,
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown event name", () => {
    const result = ChatterOutboxRecordSchema.safeParse({
      id: RECORD_ID,
      eventName: "comm.chatter.bogus",
      payload: {},
      createdAt: NOW,
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional processedAt", () => {
    const result = ChatterOutboxRecordSchema.safeParse({
      id: RECORD_ID,
      eventName: CommChatterEvents.MessagePosted,
      payload: {
        messageId: MSG_ID,
        orgId: ORG_ID,
        entityType: "task",
        entityId: ENTITY_ID,
        parentMessageId: null,
        authorPrincipalId: PRINCIPAL_ID,
        correlationId: CORR_ID,
      },
      createdAt: NOW,
      processedAt: NOW,
    });
    expect(result.success).toBe(true);
  });
});
