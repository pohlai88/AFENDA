import { describe, expect, it } from "vitest";
import {
  CommMeetingAdjournedPayloadSchema,
  CommMeetingCancelledPayloadSchema,
  CommMeetingCreatedPayloadSchema,
  CommMeetingStartedPayloadSchema,
  CommMeetingUpdatedPayloadSchema,
} from "../meeting.events.payloads.js";

describe("meeting.events.payloads", () => {
  it("parses meeting-created payload", () => {
    const parsed = CommMeetingCreatedPayloadSchema.parse({
      meetingId: "11111111-1111-4111-8111-111111111111",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      title: "Quarterly board meeting",
      chairId: "22222222-2222-4222-8222-222222222222",
      scheduledAt: null,
      correlationId: "99999999-9999-4999-8999-999999999999",
    });

    expect(parsed.title).toBe("Quarterly board meeting");
  });

  it("rejects meeting-started payload without startedAt", () => {
    const result = CommMeetingStartedPayloadSchema.safeParse({
      meetingId: "11111111-1111-4111-8111-111111111111",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      correlationId: "99999999-9999-4999-8999-999999999999",
    });

    expect(result.success).toBe(false);
  });

  it("parses meeting-adjourned payload", () => {
    const parsed = CommMeetingAdjournedPayloadSchema.parse({
      meetingId: "11111111-1111-4111-8111-111111111111",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      adjournedAt: "2026-06-01T11:00:00.000Z",
      note: "Lunch break",
      correlationId: "99999999-9999-4999-8999-999999999999",
    });

    expect(parsed.note).toBe("Lunch break");
  });

  it("rejects meeting-updated payload without changed fields", () => {
    const result = CommMeetingUpdatedPayloadSchema.safeParse({
      meetingId: "11111111-1111-4111-8111-111111111111",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      correlationId: "99999999-9999-4999-8999-999999999999",
    });

    expect(result.success).toBe(false);
  });

  it("parses meeting-updated payload with changed fields", () => {
    const parsed = CommMeetingUpdatedPayloadSchema.parse({
      meetingId: "11111111-1111-4111-8111-111111111111",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      correlationId: "99999999-9999-4999-8999-999999999999",
      title: "Updated board meeting title",
      scheduledAt: "2026-06-01T09:30:00.000Z",
    });

    expect(parsed.title).toBe("Updated board meeting title");
    expect(parsed.scheduledAt).toBe("2026-06-01T09:30:00.000Z");
  });

  it("rejects adjourned payload with empty note", () => {
    const result = CommMeetingAdjournedPayloadSchema.safeParse({
      meetingId: "11111111-1111-4111-8111-111111111111",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      adjournedAt: "2026-06-01T11:00:00.000Z",
      note: "   ",
      correlationId: "99999999-9999-4999-8999-999999999999",
    });

    expect(result.success).toBe(false);
  });

  it("rejects cancelled payload with empty reason", () => {
    const result = CommMeetingCancelledPayloadSchema.safeParse({
      meetingId: "11111111-1111-4111-8111-111111111111",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      reason: "   ",
      correlationId: "99999999-9999-4999-8999-999999999999",
    });

    expect(result.success).toBe(false);
  });

  it("rejects adjourned payload without note", () => {
    const result = CommMeetingAdjournedPayloadSchema.safeParse({
      meetingId: "11111111-1111-4111-8111-111111111111",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      adjournedAt: "2026-06-01T11:00:00.000Z",
      correlationId: "99999999-9999-4999-8999-999999999999",
    });

    expect(result.success).toBe(false);
  });

  it("rejects cancelled payload without reason", () => {
    const result = CommMeetingCancelledPayloadSchema.safeParse({
      meetingId: "11111111-1111-4111-8111-111111111111",
      orgId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      correlationId: "99999999-9999-4999-8999-999999999999",
    });

    expect(result.success).toBe(false);
  });
});
