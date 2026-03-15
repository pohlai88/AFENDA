import { describe, expect, it } from "vitest";
import {
  CommActionItemCreatedPayloadSchema,
  CommActionItemUpdatedPayloadSchema,
  CommMinutesRecordedPayloadSchema,
} from "../minutes.events.payloads.js";

describe("minutes.events.payloads", () => {
  it("parses minutes-recorded payload", () => {
    const parsed = CommMinutesRecordedPayloadSchema.parse({
      minuteId: "99999999-9999-4999-8999-999999999999",
      meetingId: "11111111-1111-4111-8111-111111111111",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      resolutionId: null,
      recordedAt: "2026-06-01T10:00:00.000Z",
      correlationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });

    expect(parsed.resolutionId).toBeNull();
  });

  it("rejects action-item-created payload without title", () => {
    const result = CommActionItemCreatedPayloadSchema.safeParse({
      actionItemId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      minuteId: "99999999-9999-4999-8999-999999999999",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      assigneeId: null,
      dueDate: null,
      correlationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });

    expect(result.success).toBe(false);
  });

  it("rejects no-op action-item-updated payloads", () => {
    const result = CommActionItemUpdatedPayloadSchema.safeParse({
      actionItemId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      minuteId: "99999999-9999-4999-8999-999999999999",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      correlationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });

    expect(result.success).toBe(false);
  });

  it("rejects action-item-updated payloads with status set to null only", () => {
    const result = CommActionItemUpdatedPayloadSchema.safeParse({
      actionItemId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      minuteId: "99999999-9999-4999-8999-999999999999",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      correlationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      status: null,
    });

    expect(result.success).toBe(false);
  });

  it("rejects completed action-item updates without closedAt", () => {
    const result = CommActionItemUpdatedPayloadSchema.safeParse({
      actionItemId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      minuteId: "99999999-9999-4999-8999-999999999999",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      correlationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      status: "done",
    });

    expect(result.success).toBe(false);
  });

  it("rejects past due dates on action-item-updated payloads", () => {
    const result = CommActionItemUpdatedPayloadSchema.safeParse({
      actionItemId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      minuteId: "99999999-9999-4999-8999-999999999999",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      correlationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      dueDate: "2020-01-01",
    });

    expect(result.success).toBe(false);
  });

  it("parses valid completed action-item-updated payloads", () => {
    const parsed = CommActionItemUpdatedPayloadSchema.parse({
      actionItemId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      minuteId: "99999999-9999-4999-8999-999999999999",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      correlationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      status: "done",
      closedAt: "2026-06-01T10:00:00.000Z",
    });

    expect(parsed.status).toBe("done");
    expect(parsed.closedAt).toBe("2026-06-01T10:00:00.000Z");
  });
});
